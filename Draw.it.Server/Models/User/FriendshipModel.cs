using System.ComponentModel.DataAnnotations;

namespace Draw.it.Server.Models.User;

public enum FriendRequestStatus
{
    Pending,
    Accepted
}

public class FriendshipModel
{
    [Key]
    public long Id { get; set; }
    public long RequesterId { get; set; }
    public long AddresseeId { get; set; }
    public FriendRequestStatus Status { get; set; } = FriendRequestStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AcceptedAt { get; set; }
}