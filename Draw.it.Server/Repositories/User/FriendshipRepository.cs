using System.Collections.Concurrent;
using Draw.it.Server.Models.User;

namespace Draw.it.Server.Repositories.User;

public class FriendshipRepository : IFriendshipRepository
{
    private readonly ConcurrentDictionary<long, FriendshipModel> _store = new();
    private long _idCounter = 0;

    public long GetNextId() => Interlocked.Increment(ref _idCounter);

    public void Save(FriendshipModel friendship)
        => _store[friendship.Id] = friendship;

    public FriendshipModel? FindById(long id)
        => _store.TryGetValue(id, out var f) ? f : null;

    public FriendshipModel? FindPending(long requesterId, long addresseeId)
        => _store.Values.FirstOrDefault(f =>
            f.Status == FriendRequestStatus.Pending &&
            f.RequesterId == requesterId &&
            f.AddresseeId == addresseeId);

    public FriendshipModel? FindAccepted(long userAId, long userBId)
        => _store.Values.FirstOrDefault(f =>
            f.Status == FriendRequestStatus.Accepted &&
            ((f.RequesterId == userAId && f.AddresseeId == userBId) ||
             (f.RequesterId == userBId && f.AddresseeId == userAId)));

    public IEnumerable<FriendshipModel> FindAllForUser(long userId)
        => _store.Values
            .Where(f => f.RequesterId == userId || f.AddresseeId == userId)
            .ToList();

    public IEnumerable<FriendshipModel> FindPendingReceived(long userId)
        => _store.Values
            .Where(f => f.Status == FriendRequestStatus.Pending && f.AddresseeId == userId)
            .ToList();

    public bool Delete(long id)
        => _store.TryRemove(id, out _);
}