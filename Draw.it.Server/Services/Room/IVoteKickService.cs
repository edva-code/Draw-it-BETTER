using Draw.it.Server.Models.Room;
using Draw.it.Server.Models.User;

namespace Draw.it.Server.Services.Room
{
    public interface IVoteKickService
    {
        /// <summary>
        /// Initiates a vote kick session against a target user.
        /// </summary>
        /// <returns>The created vote kick session.</returns>
        VoteKickSession InitiateVote(string roomId, UserModel initiator, RoomModel room, long targetUserId);

        /// <summary>
        /// Registers a player's vote in an active session.
        /// </summary>
        /// <returns>True if the vote was successfully registered, otherwise false.</returns>
        bool RegisterVote(string roomId, long voterId, bool voteFor);

        /// <summary>
        /// Cancels an active vote kick session (usually performed by the host).
        /// </summary>
        /// <returns>True if the session was found and successfully cancelled, otherwise false.</returns>
        bool CancelVote(string roomId, long hostId);

        /// <summary>
        /// Checks if a vote kick is currently on cooldown for the given room.
        /// </summary>
        /// <returns>True if on cooldown, otherwise false.</returns>
        bool IsOnCooldown(string roomId);
    }
}
