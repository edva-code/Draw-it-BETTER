using Draw.it.Server.Models.User;

namespace Draw.it.Server.Services.User;

public interface IFriendService
{
    void SendFriendRequest(long requesterId, string targetUsername);
    void AcceptFriendRequest(long addresseeId, long friendshipId);
    void DeclineFriendRequest(long addresseeId, long friendshipId);
    void RemoveFriend(long userId, long friendId);
    IEnumerable<FriendDto> GetFriends(long userId);
    IEnumerable<PendingRequestDto> GetPendingRequests(long userId);
    IEnumerable<SearchUserDto> SearchUsers(long requesterId, string partialName);
    UserProfileDto GetFriendProfile(long requestingUserId, long targetUserId);
    bool AreFriends(long userAId, long userBId);
}

// DTOs returned by the service (used in controller responses)
public record FriendDto(
    long FriendshipId,
    long UserId,
    string Username,
    bool IsOnline,
    DateTime? LastSeenAt,
    int TotalScore,
    int GamesPlayed,
    int GamesWon,
    string? CurrentRoomId,
    string? EquippedTitle
);

public record PendingRequestDto(
    long FriendshipId,
    long RequesterId,
    string RequesterUsername,
    DateTime SentAt
);

public record SearchUserDto(
    long UserId,
    string Username,
    bool IsOnline,
    DateTime? LastSeenAt,
    bool IsFriend,
    bool HasPendingRequestFromMe,
    bool HasPendingRequestToMe,
    long? PendingFriendshipId,
    string? EquippedTitle
);

public record UserProfileDto(
    long UserId,
    string Username,
    bool IsOnline,
    DateTime? LastSeenAt,
    int TotalScore,
    int GamesPlayed,
    int GamesWon,
    int CorrectGuesses,
    int FastGuesses,
    bool IsFriend,
    bool HasPendingRequestFromMe,
    bool HasPendingRequestToMe,
    long? PendingFriendshipId    // if HasPendingRequestToMe, lets the UI show "Accept"
);