using Draw.it.Server.Models.User;

namespace Draw.it.Server.Hubs.DTO;

public record PlayerDto(long Id, string Name, bool IsHost, bool IsConnected, bool IsReady, bool IsGuest)
{
    public PlayerDto(UserModel user, bool IsHost) : this(user.Id, user.Name, IsHost, user.IsConnected, user.IsReady, user.IsGuest) { }
};