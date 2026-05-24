using Draw.it.Server.Models.User;

namespace Draw.it.Server.Controllers.Auth.DTO;

public record AuthMeResponseDto(string Name, string? RoomId, bool IsGuest, int TotalScore)
{
    public AuthMeResponseDto(UserModel user) : this(user.Name, user.RoomId, user.IsGuest, user.TotalScore) { }
};