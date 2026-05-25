using Draw.it.Server.Models.User;

namespace Draw.it.Server.Repositories.User;

public interface IFriendshipRepository
{
    long GetNextId();
    void Save(FriendshipModel friendship);
    FriendshipModel? FindById(long id);
    FriendshipModel? FindPending(long requesterId, long addresseeId);
    FriendshipModel? FindAccepted(long userAId, long userBId);
    IEnumerable<FriendshipModel> FindAllForUser(long userId);           // pending + accepted
    IEnumerable<FriendshipModel> FindPendingReceived(long userId);      // incoming requests
    bool Delete(long id);
}