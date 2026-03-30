using Draw.it.Server.Models.Room;

namespace Draw.it.Server.Services.Room
{
    public interface IVoteKickService
    {
        /// <summary>
        /// Initiates a vote kick session against a target user.
        /// Throws exceptions for invalid rules (e.g. kicking host, cooldown, etc.)
        /// </summary>
        VoteKickSession InitiateVote(RoomModel room, long initiatorUserId, long targetUserId);

        /// <summary>
        /// Registers a player's vote in an active session.
        /// </summary>
        /// <returns>A tuple indicating success, and the updated session state to broadcast.</returns>
        (bool Success, VoteKickSession? Session) RegisterVote(string roomId, long voterId, bool voteFor);

        /// <summary>
        /// Cancels an active vote kick session (usually performed by the host).
        /// </summary>
        bool CancelVote(string roomId, long hostId);

        /// <summary>
        /// Checks if a vote kick is currently on cooldown for the given room.
        /// </summary>
        bool IsOnCooldown(string roomId);
        
        /// <summary>
        /// Retrieves the current active session, if any.
        /// </summary>
        VoteKickSession? GetActiveSession(string roomId);
        
        /// <summary>
        /// Removes the session from active sessions (usually called after timeout or success).
        /// </summary>
        void CleanUpSession(string roomId);
    }
}
