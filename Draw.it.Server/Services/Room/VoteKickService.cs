using System;
using System.Collections.Concurrent;
using Draw.it.Server.Exceptions;
using Draw.it.Server.Models.Room;

namespace Draw.it.Server.Services.Room
{
    public class VoteKickService : IVoteKickService
    {
        // Thread-safe dictionary for active sessions
        private readonly ConcurrentDictionary<string, VoteKickSession> _activeSessions = new();
        
        // Cooldown implementation: room ID mapped to the cooldown expiration time
        private readonly ConcurrentDictionary<string, DateTime> _cooldowns = new();
        
        // Settings: a standard length for cooldown, matching 1st Diagram description (30s)
        private readonly TimeSpan _cooldownTime = TimeSpan.FromSeconds(30);

        public VoteKickSession InitiateVote(RoomModel room, long initiatorUserId, long targetUserId)
        {
            if (room.HostId == targetUserId)
            {
                throw new AppException("The room host cannot be vote-kicked.");
            }

            if (IsOnCooldown(room.Id))
            {
                throw new AppException("Please wait before starting another vote.");
            }

            if (_activeSessions.ContainsKey(room.Id))
            {
                throw new AppException("A vote is already in progress.");
            }

            var session = new VoteKickSession
            {
                RoomId = room.Id,
                InitiatorUserId = initiatorUserId,
                TargetUserId = targetUserId,
                CreatedAt = DateTime.UtcNow,
                IsCancelled = false
            };

            // Kadangi iniciatorius nori išmesti vartotoją, automatiškai užskaitome jo balsą "Už"
            session.VotesFor.Add(initiatorUserId);

            if (!_activeSessions.TryAdd(room.Id, session))
            {
                throw new AppException("Failed to initiate vote due to a concurrency conflict.");
            }

            return session;
        }

        public (bool Success, VoteKickSession? Session) RegisterVote(string roomId, long voterId, bool voteFor)
        {
            if (!_activeSessions.TryGetValue(roomId, out var session))
            {
                return (false, null);
            }

            /* Naudojame lock'ą ant paties sesijos objekto apsaugoti HashSet konvertuojant operaciją į Thread-Safe. 
            Nes HashSet nėra thread-safe kolekcija.*/
            lock (session)
            {
                if (session.IsCancelled)
                {
                    return (false, session); // Balsavimai į atšauktą sesiją nepriimami
                }

                /* Užtikriname, kad žmogus balsuotų tik vieną kartą ir negalėtų "perbalsuoti" 
                arba pašaliname iš prieš tai buvusio (aiškumo dėlei, jei apsigalvojo)
                Šiuo atveju paliekame paprastai: jei jau balsavęs, naujas balsas ignoruojamas */

                if (session.VotesFor.Contains(voterId) || session.VotesAgainst.Contains(voterId))
                {
                    return (false, session);
                }

                if (voteFor)
                {
                    session.VotesFor.Add(voterId);
                }
                else
                {
                    session.VotesAgainst.Add(voterId);
                }
                
                return (true, session);
            }
        }

        public bool CancelVote(string roomId, long hostId)
        {
            if (_activeSessions.TryGetValue(roomId, out var session))
            {
                lock (session)
                {
                    session.IsCancelled = true;
                    return true;
                }
            }
            return false;
        }

        public bool IsOnCooldown(string roomId)
        {
            if (_cooldowns.TryGetValue(roomId, out var cooldownEnd))
            {
                return DateTime.UtcNow <= cooldownEnd;
            }
            return false;
        }

        public VoteKickSession? GetActiveSession(string roomId)
        {
            _activeSessions.TryGetValue(roomId, out var session);
            return session;
        }

        public void CleanUpSession(string roomId)
        {
            _activeSessions.TryRemove(roomId, out _);

            _cooldowns[roomId] = DateTime.UtcNow.Add(_cooldownTime);

            foreach (var kvp in _cooldowns)
            {
                if (kvp.Value < DateTime.UtcNow)
                {
                    _cooldowns.TryRemove(kvp.Key, out _);
                }
            }
        }
    }
}
