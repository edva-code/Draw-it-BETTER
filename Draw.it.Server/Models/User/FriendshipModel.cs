namespace Draw.it.Server.Models.User;

public enum FriendRequestStatus
{
    Pending,
    Accepted
}

public class FriendshipModel
{
    public required long Id { get; set; }
    public required long RequesterId { get; set; }   // who sent the request
    public required long AddresseeId { get; set; }   // who received it
    public FriendRequestStatus Status { get; set; } = FriendRequestStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AcceptedAt { get; set; }
}