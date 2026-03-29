using System;
using System.Collections.Generic;

namespace Draw.it.Server.Models.Room
{
    public class VoteKickSession
    {
        public string RoomId { get; set; } = string.Empty;
        public long TargetUserId { get; set; }
        public long InitiatorUserId { get; set; }
        
        public HashSet<long> VotesFor { get; set; } = new HashSet<long>();
        public HashSet<long> VotesAgainst { get; set; } = new HashSet<long>();
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsCancelled { get; set; }

        public bool HasMajority(int totalPlayersCount)
        {
            // If there are only 2 players, 1 vote is enough to vote kick the other.
            // Otherwise, we need strictly more than half of the total players in the room.
            int requiredVotes = totalPlayersCount == 2 ? 1 : (totalPlayersCount / 2) + 1;
            return VotesFor.Count >= requiredVotes;
        }
    }
}
