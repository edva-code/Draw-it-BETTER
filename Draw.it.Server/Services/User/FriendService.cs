using Draw.it.Server.Exceptions;
using Draw.it.Server.Models.User;
using Draw.it.Server.Repositories.User;
using Draw.it.Server.Services.Achievement;

namespace Draw.it.Server.Services.User;

public class FriendService : IFriendService
{
    private readonly IFriendshipRepository _friendshipRepo;
    private readonly IUserRepository _userRepo;
    private readonly ILogger<FriendService> _logger;

    // "Recently online" threshold
    private static readonly TimeSpan OnlineThreshold = TimeSpan.FromMinutes(5);

    public FriendService(
        IFriendshipRepository friendshipRepo,
        IUserRepository userRepo,
        ILogger<FriendService> logger)
    {
        _friendshipRepo = friendshipRepo;
        _userRepo = userRepo;
        _logger = logger;
    }

    public void SendFriendRequest(long requesterId, string targetUsername)
    {
        targetUsername = targetUsername.Trim();
        if (string.IsNullOrWhiteSpace(targetUsername))
            throw new AppException("Username cannot be empty", System.Net.HttpStatusCode.BadRequest);

        var requester = _userRepo.FindById(requesterId)
            ?? throw new EntityNotFoundException($"Requester {requesterId} not found");

        if (requester.IsGuest)
            throw new AppException("Guests cannot send friend requests", System.Net.HttpStatusCode.Forbidden);

        var target = _userRepo.FindByName(targetUsername)
            ?? throw new AppException("User not found", System.Net.HttpStatusCode.NotFound);

        if (target.Id == requesterId)
            throw new AppException("You cannot add yourself as a friend", System.Net.HttpStatusCode.BadRequest);

        if (target.IsGuest)
            throw new AppException("Cannot send friend request to a guest account", System.Net.HttpStatusCode.BadRequest);

        // Already friends?
        if (_friendshipRepo.FindAccepted(requesterId, target.Id) != null)
            throw new AppException("You are already friends with this user", System.Net.HttpStatusCode.Conflict);

        // Already sent a request?
        if (_friendshipRepo.FindPending(requesterId, target.Id) != null)
            throw new AppException("Friend request already sent", System.Net.HttpStatusCode.Conflict);

        // They already sent us a request? Auto-accept (mutual interest)
        var theirPendingRequest = _friendshipRepo.FindPending(target.Id, requesterId);
        if (theirPendingRequest != null)
        {
            theirPendingRequest.Status = FriendRequestStatus.Accepted;
            theirPendingRequest.AcceptedAt = DateTime.UtcNow;
            _friendshipRepo.Save(theirPendingRequest);
            _logger.LogInformation("Auto-accepted mutual friend request between {A} and {B}", requesterId, target.Id);
            return;
        }

        var friendship = new FriendshipModel
        {
            Id = _friendshipRepo.GetNextId(),
            RequesterId = requesterId,
            AddresseeId = target.Id
        };
        _friendshipRepo.Save(friendship);
        _logger.LogInformation("Friend request sent from {Requester} to {Target}", requesterId, target.Id);
    }

    public void AcceptFriendRequest(long addresseeId, long friendshipId)
    {
        var friendship = _friendshipRepo.FindById(friendshipId)
            ?? throw new EntityNotFoundException($"Friend request {friendshipId} not found");

        if (friendship.AddresseeId != addresseeId)
            throw new AppException("You cannot accept this request", System.Net.HttpStatusCode.Forbidden);

        if (friendship.Status != FriendRequestStatus.Pending)
            throw new AppException("This request has already been handled", System.Net.HttpStatusCode.Conflict);

        friendship.Status = FriendRequestStatus.Accepted;
        friendship.AcceptedAt = DateTime.UtcNow;
        _friendshipRepo.Save(friendship);
        _logger.LogInformation("Friend request {Id} accepted by {Addressee}", friendshipId, addresseeId);
    }

    public void DeclineFriendRequest(long addresseeId, long friendshipId)
    {
        var friendship = _friendshipRepo.FindById(friendshipId)
            ?? throw new EntityNotFoundException($"Friend request {friendshipId} not found");

        if (friendship.AddresseeId != addresseeId)
            throw new AppException("You cannot decline this request", System.Net.HttpStatusCode.Forbidden);

        if (friendship.Status != FriendRequestStatus.Pending)
            throw new AppException("This request has already been handled", System.Net.HttpStatusCode.Conflict);

        _friendshipRepo.Delete(friendshipId);
    }

    public void RemoveFriend(long userId, long friendId)
    {
        var friendship = _friendshipRepo.FindAccepted(userId, friendId)
            ?? throw new EntityNotFoundException("Friendship not found");

        _friendshipRepo.Delete(friendship.Id);
    }

    public IEnumerable<FriendDto> GetFriends(long userId)
    {
        var friendships = _friendshipRepo.FindAllForUser(userId)
            .Where(f => f.Status == FriendRequestStatus.Accepted);

        var result = new List<FriendDto>();
        foreach (var f in friendships)
        {
            var friendId = f.RequesterId == userId ? f.AddresseeId : f.RequesterId;
            var friend = _userRepo.FindById(friendId);
            if (friend == null) continue;

            result.Add(new FriendDto(
                FriendshipId: f.Id,
                UserId: friend.Id,
                Username: friend.Name,
                IsOnline: IsUserOnline(friend),
                LastSeenAt: friend.LastSeenAt,
                TotalScore: friend.TotalScore,
                GamesPlayed: friend.GamesPlayed,
                GamesWon: friend.GamesWon,
                CurrentRoomId: friend.RoomId,
                EquippedTitle: friend.EquippedTitle.HasValue
                    ? AchievementService.GetDisplayName(friend.EquippedTitle.Value)
                    : null
            ));
        }
        return result;
    }

    public IEnumerable<PendingRequestDto> GetPendingRequests(long userId)
    {
        return _friendshipRepo.FindPendingReceived(userId)
            .Select(f =>
            {
                var requester = _userRepo.FindById(f.RequesterId);
                return requester == null ? null : new PendingRequestDto(
                    FriendshipId: f.Id,
                    RequesterId: f.RequesterId,
                    RequesterUsername: requester.Name,
                    SentAt: f.CreatedAt
                );
            })
            .Where(x => x != null)
            .Select(x => x!)
            .ToList();
    }

    public IEnumerable<SearchUserDto> SearchUsers(long requesterId, string partialName)
    {
        var requester = _userRepo.FindById(requesterId)
            ?? throw new EntityNotFoundException($"Requester {requesterId} not found");

        if (requester.IsGuest)
            throw new AppException("Guests cannot search users", System.Net.HttpStatusCode.Forbidden);

        var candidates = _userRepo.SearchByName(partialName)
            .Where(u => u.Id != requesterId && !u.IsGuest)
            .ToList();

        return candidates.Select(user =>
        {
            var accepted = _friendshipRepo.FindAccepted(requesterId, user.Id);
            var myPending = _friendshipRepo.FindPending(requesterId, user.Id);
            var theirPending = _friendshipRepo.FindPending(user.Id, requesterId);

            return new SearchUserDto(
                UserId: user.Id,
                Username: user.Name,
                IsOnline: IsUserOnline(user),
                LastSeenAt: user.LastSeenAt,
                IsFriend: accepted != null,
                HasPendingRequestFromMe: myPending != null,
                HasPendingRequestToMe: theirPending != null,
                PendingFriendshipId: theirPending?.Id,
                EquippedTitle: user.EquippedTitle.HasValue
                    ? AchievementService.GetDisplayName(user.EquippedTitle.Value)
                    : null
            );
        }).ToList();
    }

    public UserProfileDto GetFriendProfile(long requestingUserId, long targetUserId)
    {
        var target = _userRepo.FindById(targetUserId)
            ?? throw new EntityNotFoundException($"User {targetUserId} not found");

        var accepted = _friendshipRepo.FindAccepted(requestingUserId, targetUserId);
        var myPending = _friendshipRepo.FindPending(requestingUserId, targetUserId);
        var theirPending = _friendshipRepo.FindPending(targetUserId, requestingUserId);
        var isSelf = requestingUserId == targetUserId;
        var isFriend = accepted != null || isSelf;

        return new UserProfileDto(
            UserId: target.Id,
            Username: target.Name,
            IsOnline: IsUserOnline(target),
            LastSeenAt: target.LastSeenAt,
            TotalScore: isFriend ? target.TotalScore : 0,
            GamesPlayed: isFriend ? target.GamesPlayed : 0,
            GamesWon: isFriend ? target.GamesWon : 0,
            CorrectGuesses: isFriend ? target.CorrectGuesses : 0,
            FastGuesses: isFriend ? target.FastGuesses : 0,
            IsFriend: isFriend,
            HasPendingRequestFromMe: myPending != null,
            HasPendingRequestToMe: theirPending != null,
            PendingFriendshipId: theirPending?.Id
        );
    }

    public bool AreFriends(long userAId, long userBId)
        => _friendshipRepo.FindAccepted(userAId, userBId) != null;

    private static bool IsUserOnline(UserModel user)
        => user.IsConnected ||
           (user.LastSeenAt.HasValue && DateTime.UtcNow - user.LastSeenAt.Value < OnlineThreshold);
}