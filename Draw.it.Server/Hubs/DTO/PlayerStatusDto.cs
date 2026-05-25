using Draw.it.Server.Models.User;
using Draw.it.Server.Services.Achievement;

namespace Draw.it.Server.Hubs.DTO;

public record PlayerStatusDto(
    long Id,
    string Name,
    int Score,
    bool IsDrawer,
    bool HasGuessed,
    bool IsHost,
    bool IsGuest,
    string? EquippedTitle
);