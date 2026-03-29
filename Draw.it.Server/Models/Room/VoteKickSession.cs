using System;
using System.Collections.Generic;

namespace Draw.it.Server.Models.Room
{
    public class VoteKickSession
    {
        public string RoomId { get; set; } = string.Empty;
        public long TargetUserId { get; set; }
        public long InitiatorUserId { get; set; }
        
        // Pastaba dėl daugiagijiškumo (thread-safety): SignalR Hub'uose keli vartotojai 
        // gali balsuoti vienu metu, todėl HashSet gali nesuveikti saugiai. 
        // Vėliau su VoteKickService reiktų naudoti lock() bloką, kai pridedami balsai.
        public HashSet<long> VotesFor { get; set; } = new HashSet<long>();
        public HashSet<long> VotesAgainst { get; set; } = new HashSet<long>();
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsCancelled { get; set; }

        public bool HasMajority(int totalPlayersCount)
        {
            // Dauguma pasiekiama, kai "Už" balsuoja daugiau nei pusė VISO kambario žaidėjų skaičiaus
            return VotesFor.Count > totalPlayersCount / 2;
        }
    }
}
