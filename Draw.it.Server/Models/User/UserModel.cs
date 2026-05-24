namespace Draw.it.Server.Models.User;

public class UserModel
{
    public required long Id { get; set; }
    public required string Name { get; set; }
    public string? Email { get; set; }
    public string? PasswordHash { get; set; }
    public int TotalScore { get; set; } = 0;
    public bool IsGuest => Email == null;
    public string? RoomId { get; set; } // Link to Room
    public bool IsConnected { get; set; } = false;
    public bool IsReady { get; set; } = false;
    public bool IsAi { get; set; } = false;
}