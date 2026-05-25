using Draw.it.Server.Extensions;
using Draw.it.Server.Services.User;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Draw.it.Server.Controllers.User;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class FriendController : ControllerBase
{
    private readonly IFriendService _friendService;

    public FriendController(IFriendService friendService)
    {
        _friendService = friendService;
    }

    // GET /api/v1/friend  →  list of accepted friends with online/stats
    [HttpGet]
    public IActionResult GetFriends()
    {
        var userId = HttpContext.ResolveUserId();
        var friends = _friendService.GetFriends(userId);
        return Ok(friends);
    }

    // GET /api/v1/friend/requests  →  incoming pending requests
    [HttpGet("requests")]
    public IActionResult GetPendingRequests()
    {
        var userId = HttpContext.ResolveUserId();
        var requests = _friendService.GetPendingRequests(userId);
        return Ok(requests);
    }

    // GET /api/v1/friend/profile/{targetUserId}  →  public profile (friend-gated stats)
    [HttpGet("profile/{targetUserId:long}")]
    public IActionResult GetProfile(long targetUserId)
    {
        var userId = HttpContext.ResolveUserId();
        var profile = _friendService.GetFriendProfile(userId, targetUserId);
        return Ok(profile);
    }

    // POST /api/v1/friend/request  →  send a friend request by username
    [HttpPost("request")]
    public IActionResult SendRequest([FromBody] SendFriendRequestDto dto)
    {
        var userId = HttpContext.ResolveUserId();
        _friendService.SendFriendRequest(userId, dto.Username);
        return Ok(new { message = "Friend request sent" });
    }

    // POST /api/v1/friend/accept/{friendshipId}  →  accept a pending request
    [HttpPost("accept/{friendshipId:long}")]
    public IActionResult AcceptRequest(long friendshipId)
    {
        var userId = HttpContext.ResolveUserId();
        _friendService.AcceptFriendRequest(userId, friendshipId);
        return Ok(new { message = "Friend request accepted" });
    }

    // POST /api/v1/friend/decline/{friendshipId}  →  decline a pending request
    [HttpPost("decline/{friendshipId:long}")]
    public IActionResult DeclineRequest(long friendshipId)
    {
        var userId = HttpContext.ResolveUserId();
        _friendService.DeclineFriendRequest(userId, friendshipId);
        return Ok(new { message = "Friend request declined" });
    }

    // DELETE /api/v1/friend/{friendId}  →  remove an existing friend
    [HttpDelete("{friendId:long}")]
    public IActionResult RemoveFriend(long friendId)
    {
        var userId = HttpContext.ResolveUserId();
        _friendService.RemoveFriend(userId, friendId);
        return Ok(new { message = "Friend removed" });
    }

    // GET /api/v1/friend/search?username=xxx  →  search users by username (for the send-request UI)
    [HttpGet("search")]
    public IActionResult SearchUser([FromQuery] string username)
    {
        if (string.IsNullOrWhiteSpace(username) || username.Length < 2)
            return BadRequest(new { error = "Username must be at least 2 characters" });

        var userId = HttpContext.ResolveUserId();
        var results = _friendService.SearchUsers(userId, username);
        return Ok(results);
    }
}

public record SendFriendRequestDto(string Username);