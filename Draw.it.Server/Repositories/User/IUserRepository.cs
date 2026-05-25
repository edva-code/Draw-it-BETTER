using Draw.it.Server.Models.User;

namespace Draw.it.Server.Repositories.User;

public interface IUserRepository : IRepository<UserModel, long>
{
    long GetNextId();
    IEnumerable<UserModel> FindByRoomId(string roomId);
    UserModel FindAiPlayerByRoomId(string roomId);
    UserModel? FindByEmail(string email);
    UserModel? FindByName(string name);
    IEnumerable<UserModel> SearchByName(string partialName);
}