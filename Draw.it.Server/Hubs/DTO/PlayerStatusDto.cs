namespace Draw.it.Server.Hubs.DTO;

public record PlayerStatusDto(
    long Id,
    string Name,
    int Score,
    bool IsDrawer,
    bool HasGuessed
);