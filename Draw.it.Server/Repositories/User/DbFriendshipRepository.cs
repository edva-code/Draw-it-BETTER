using Draw.it.Server.Data;
using Draw.it.Server.Models.User;
using Microsoft.EntityFrameworkCore;

namespace Draw.it.Server.Repositories.User;

public class DbFriendshipRepository : IFriendshipRepository
{
    private readonly ApplicationDbContext _db;

    public DbFriendshipRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public long GetNextId() => 0; // EF generates the ID automatically

    public void Save(FriendshipModel friendship)
    {
        var existing = _db.Friendships.Find(friendship.Id);
        if (existing == null)
            _db.Friendships.Add(friendship);
        else
            _db.Entry(existing).CurrentValues.SetValues(friendship);
        _db.SaveChanges();
    }

    public FriendshipModel? FindById(long id)
        => _db.Friendships.Find(id);

    public FriendshipModel? FindPending(long requesterId, long addresseeId)
        => _db.Friendships.FirstOrDefault(f =>
            f.Status == FriendRequestStatus.Pending &&
            f.RequesterId == requesterId &&
            f.AddresseeId == addresseeId);

    public FriendshipModel? FindAccepted(long userAId, long userBId)
        => _db.Friendships.FirstOrDefault(f =>
            f.Status == FriendRequestStatus.Accepted &&
            ((f.RequesterId == userAId && f.AddresseeId == userBId) ||
             (f.RequesterId == userBId && f.AddresseeId == userAId)));

    public IEnumerable<FriendshipModel> FindAllForUser(long userId)
        => _db.Friendships
            .Where(f => f.RequesterId == userId || f.AddresseeId == userId)
            .ToList();

    public IEnumerable<FriendshipModel> FindPendingReceived(long userId)
        => _db.Friendships
            .Where(f => f.Status == FriendRequestStatus.Pending && f.AddresseeId == userId)
            .ToList();

    public bool Delete(long id)
    {
        var f = _db.Friendships.Find(id);
        if (f == null) return false;
        _db.Friendships.Remove(f);
        _db.SaveChanges();
        return true;
    }
}