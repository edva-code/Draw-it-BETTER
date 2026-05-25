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
    string? CurrentRoomId    // non-null = in a match; used for the "in match together" badge
);

public record PendingRequestDto(
    long FriendshipId,
    long RequesterId,
    string RequesterUsername,
    DateTime SentAt
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