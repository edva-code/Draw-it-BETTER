using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Draw.it.Server.Extensions;
using Draw.it.Server.Controllers.Auth.DTO;
using Draw.it.Server.Services.User;
using Draw.it.Server.Models.User;  
using Draw.it.Server.Services.Achievement;

namespace Draw.it.Server.Controllers.Auth;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IUserService _userService;

    public AuthController(IUserService userService)
    {
        _userService = userService;
    }

    /// <summary>
    /// Creates a new temporary guest user and sets claims in cookie
    /// </summary>
    [HttpPost("join")]
    [ProducesResponseType(typeof(AuthMeResponseDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Join([FromBody] AuthJoinRequestDto request)
    {
        // For simplicity, we create a new user every time. It's ok, since we don't store user data permanently.
        var user = _userService.CreateUser(request.Name);
        await SignInUser(user);
        return Created("api/v1/auth/me", new AuthMeResponseDto(user));
    }

    /// <summary>
    /// Registers a new account
    /// </summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] AuthRegisterRequestDto request)
    {
        // If already authenticated and in a room, reject
        if (User.Identity?.IsAuthenticated == true)
        {
            try
            {
                var existingUser = HttpContext.ResolveUser(_userService);
                if (existingUser.RoomId != null)
                    return Conflict(new { error = "You cannot change accounts while in a room." });
            }
            catch { /* not a valid session, proceed */ }
        }
        var user = _userService.RegisterUser(request.Name, request.Email, request.Password);
        await SignInUser(user);
        return Created("api/v1/auth/me", new AuthMeResponseDto(user));
    }

    /// <summary>
    /// Logs into an account
    /// </summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] AuthLoginRequestDto request)
    {
        if (User.Identity?.IsAuthenticated == true)
        {
            try
            {
                var existingUser = HttpContext.ResolveUser(_userService);
                if (existingUser.RoomId != null)
                    return Conflict(new { error = "You cannot change accounts while in a room." });
            }
            catch { /* not a valid session, proceed */ }
        }
        var user = _userService.LoginUser(request.Email, request.Password);
        await SignInUser(user);
        return Ok(new AuthMeResponseDto(user));
    }

    private async Task SignInUser(Draw.it.Server.Models.User.UserModel user)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal,
            new AuthenticationProperties
            {
                IsPersistent = true, // Cookie persists even after browser is closed
            }
        );
    }

    /// <summary>
    /// Returns current user info
    /// </summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(AuthMeResponseDto), StatusCodes.Status200OK)]
    [Authorize]
    public IActionResult Me()
    {
        var user = HttpContext.ResolveUser(_userService);

        return Ok(new AuthMeResponseDto(user));
    }

    /// Endpoint to equip an achievement title
    /// Client sends the achievement ID they want to equip, or null to unequip. Server verifies ownership and updates user.

    [HttpPost("equip-title")]
    public IActionResult EquipTitle([FromBody] EquipTitleRequestDto request)
    {
        var user = HttpContext.ResolveUser(_userService);

        // Null = unequip
        if (request.AchievementId == null)
        {
            user.EquippedTitle = null;
            _userService.SaveUser(user);
            return Ok();
        }

        if (!Enum.TryParse<AchievementId>(request.AchievementId, out var achievementId))
            return BadRequest(new { error = "Invalid achievement ID" });

        // Verify user actually unlocked it — never trust the client
        var unlocked = AchievementService.GetUnlocked(user);
        if (!unlocked.Contains(achievementId))
            return Forbid(); // 403 — they don't have it

        user.EquippedTitle = achievementId;
        _userService.SaveUser(user);
        return Ok();
    }

    /// <summary>
    /// Logs out and clears cookie
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var user = HttpContext.ResolveUser(_userService);

        if (user.IsGuest)
        {
            _userService.DeleteUser(user.Id); // Clean up guest user
        }

        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

        return NoContent();
    }

    [HttpGet("unauthorized")]
    public IActionResult UnauthorizedAccess() => Unauthorized("Not authenticated");
}
