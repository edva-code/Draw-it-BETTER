using Draw.it.Server.Exceptions;
using Draw.it.Server.Models.User;
using Draw.it.Server.Repositories.User;

namespace Draw.it.Server.Services.User;

public class UserService : IUserService
{
    private const string AiPlayerBaseName = "AI_PLAYER";

    private readonly ILogger<UserService> _logger;
    private readonly IUserRepository _userRepository;

    public UserService(ILogger<UserService> logger, IUserRepository userRepository)
    {
        _logger = logger;
        _userRepository = userRepository;
    }

    /// <summary>
    /// Create a new user
    /// </summary>
    public UserModel CreateUser(string name)
    {
        name = name.Trim();
        if (string.IsNullOrEmpty(name))
        {
            throw new AppException("User name cannot be empty", System.Net.HttpStatusCode.BadRequest);
        }

        if (!System.Text.RegularExpressions.Regex.IsMatch(name, @"^[a-zA-Z0-9]+$"))
        {
            throw new AppException("Name can only contain letters and numbers", System.Net.HttpStatusCode.BadRequest);
        }

        if (name.Length > 20)
        {
            throw new AppException("Name cannot exceed 20 characters", System.Net.HttpStatusCode.BadRequest);
        }

        var user = new UserModel
        {
            Id = _userRepository.GetNextId(),
            Name = name
        };
        _userRepository.Save(user);
        _logger.LogInformation("User with name={name} created", name);
        return user;
    }

    /// <summary>
    /// Register a new account
    /// </summary>
    public UserModel RegisterUser(string name, string email, string password)
    {
        name = name.Trim();
        email = email.Trim().ToLowerInvariant();

        if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
        {
            throw new AppException("Name, email and password are required", System.Net.HttpStatusCode.BadRequest);
        }

        if (!System.Text.RegularExpressions.Regex.IsMatch(name, @"^[a-zA-Z0-9]+$"))
        {
            throw new AppException("Name can only contain letters and numbers", System.Net.HttpStatusCode.BadRequest);
        }

        if (name.Length < 2 || name.Length > 20)
        {
            throw new AppException("Name must be between 2 and 20 characters", System.Net.HttpStatusCode.BadRequest);
        }

        if (_userRepository.FindByEmail(email) != null)
        {
            throw new AppException("Email is already in use", System.Net.HttpStatusCode.Conflict);
        }

        if (_userRepository.FindByName(name) != null)
        {
            throw new AppException("Username is already in use", System.Net.HttpStatusCode.Conflict);
        }

        var user = new UserModel
        {
            Id = _userRepository.GetNextId(),
            Name = name,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.EnhancedHashPassword(password, 11)
        };

        _userRepository.Save(user);
        _logger.LogInformation("User registered with email={email}", email);
        return user;
    }

    /// <summary>
    /// Login to an account
    /// </summary>
    public UserModel LoginUser(string email, string password)
    {
        email = email.Trim().ToLowerInvariant();
        
        var user = _userRepository.FindByEmail(email);
        if (user == null || user.PasswordHash == null)
        {
            throw new AppException("Invalid email or password", System.Net.HttpStatusCode.Unauthorized);
        }

        if (!BCrypt.Net.BCrypt.EnhancedVerify(password, user.PasswordHash))
        {
            throw new AppException("Invalid email or password", System.Net.HttpStatusCode.Unauthorized);
        }

        return user;
    }

    /// <summary>
    /// Delete user
    /// </summary>
    public void DeleteUser(long userId)
    {
        if (!_userRepository.DeleteById(userId))
        {
            throw new EntityNotFoundException($"User with id={userId} not found");
        }
    }

    /// <summary>
    /// Get user by id
    /// </summary>
    public UserModel GetUser(long userId)
    {
        return _userRepository.FindById(userId) ?? throw new EntityNotFoundException($"User with id={userId} not found");
    }

    /// <summary>
    /// Set the room for a user
    /// </summary>
    public void SetRoom(long userId, string? roomId)
    {
        var user = GetUser(userId);
        user.RoomId = roomId;
        _userRepository.Save(user);
    }

    /// <summary>
    /// Set the connection status for a user
    /// </summary>
    public void SetConnectedStatus(long userId, bool isConnected)
    {
        var user = GetUser(userId);
        user.IsConnected = isConnected;
        _userRepository.Save(user);
    }

    /// <summary>
    /// Set the ready status for a user
    /// </summary>
    public void SetReadyStatus(long userId, bool isReady)
    {
        var user = GetUser(userId);
        user.IsReady = isReady;
        _userRepository.Save(user);
        _logger.LogInformation("User {} ready status set to {}", userId, isReady);
    }

    /// <summary>
    /// Remove room from all users in this room
    /// </summary>
    public void RemoveRoomFromAllUsers(string roomId)
    {
        var users = _userRepository.FindByRoomId(roomId);

        foreach (var user in users)
        {
            user.RoomId = null;

            _userRepository.Save(user);
        }
    }

    public void UpdateName(long userId, string name)
    {
        name = name.Trim();

        if (string.IsNullOrEmpty(name))
        {
            throw new AppException("User name cannot be empty", System.Net.HttpStatusCode.BadRequest);
        }

        var user = GetUser(userId);
        user.Name = name;
        _userRepository.Save(user);
        _logger.LogInformation("User with id={Id} name changed to {Name}", userId, name);
    }

    public void CreateAiUser(string roomId)
    {
        var aiName = GenerateAiPlayerName(roomId);
        var aiUser = CreateUser(aiName);
        aiUser.IsAi = true;
        aiUser.RoomId = roomId;
        aiUser.IsReady = true;
        aiUser.IsConnected = true;

        _userRepository.Save(aiUser);
    }

    public UserModel GetAiUserInRoom(string roomId)
    {
        return _userRepository.FindAiPlayerByRoomId(roomId);
    }

    public void ApplyGameResults(IEnumerable<UserModel> players, Dictionary<long, int> totalScores,
        Dictionary<long, int> correctGuesses, Dictionary<long, int> fastGuesses)
    {
        var trackedPlayers = players
            .Where(p => !p.IsAi && !p.IsGuest)
            .ToList();

        if (trackedPlayers.Count == 0)
        {
            return;
        }

        var maxScore = trackedPlayers
            .Max(p => totalScores.GetValueOrDefault(p.Id, 0));

        var winnerIds = trackedPlayers
            .Where(p => totalScores.GetValueOrDefault(p.Id, 0) == maxScore)
            .Select(p => p.Id)
            .ToHashSet();

        foreach (var player in trackedPlayers)
        {
            var user = GetUser(player.Id);
            user.GamesPlayed += 1;
            if (winnerIds.Contains(user.Id))
            {
                user.GamesWon += 1;
            }

            user.TotalScore += totalScores.GetValueOrDefault(user.Id, 0);
            user.CorrectGuesses += correctGuesses.GetValueOrDefault(user.Id, 0);
            user.FastGuesses += fastGuesses.GetValueOrDefault(user.Id, 0);

            _userRepository.Save(user);
        }
    }

    private string GenerateAiPlayerName(string roomId)
    {
        var tsNow = DateTime.Now.ToString("yyyyMMddHHmmssfff");
        return $"{AiPlayerBaseName}_{roomId}_{tsNow}";
    }
}