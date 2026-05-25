using Draw.it.Server.Models.User;
using Draw.it.Server.Services.Achievement;

namespace Draw.it.Server.Hubs.DTO;

public record PlayerDto(long Id, string Name, bool IsHost, bool IsConnected, bool IsReady, bool IsGuest, string? EquippedTitle)
{
    public PlayerDto(UserModel user, bool IsHost) : this(
        user.Id,
        user.Name,
        IsHost,
        user.IsConnected,
        user.IsReady,
        user.IsGuest,
        user.EquippedTitle.HasValue
            ? AchievementService.GetDisplayName(user.EquippedTitle.Value)
            : null
    )
    { }
}