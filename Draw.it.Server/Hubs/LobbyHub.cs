using Draw.it.Server.Exceptions;
using Draw.it.Server.Extensions;
using Draw.it.Server.Hubs.DTO;
using Draw.it.Server.Models.Room;
using Draw.it.Server.Services.Game;
using Draw.it.Server.Services.Room;
using Draw.it.Server.Services.User;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Draw.it.Server.Hubs;

/// <summary>
/// Hub for connecting players to rooms and lobby-related real-time updates.
/// </summary>
[Authorize]
public class LobbyHub : BaseHub<LobbyHub>
{
    private readonly IGameService _gameService;
    private readonly IVoteKickService _voteKickService;

    public LobbyHub(ILogger<LobbyHub> logger, IRoomService roomService, IUserService userService, IGameService gameService, IVoteKickService voteKickService)
        : base(logger, userService, roomService)
    {
        _gameService = gameService;
        _voteKickService = voteKickService;
    }

    public override async Task OnConnectedAsync()
    {
        var user = await ResolveUserAsync();
        var roomId = user.RoomId!;

        await AddConnectionToRoomGroupAsync(user);
        _userService.SetConnectedStatus(user.Id, true);

        // If the user is not the host, send them the current room settings
        if (!_roomService.IsHost(roomId, user))
        {
            var settings = _roomService.GetRoomSettings(roomId);
            await Clients.Caller.SendAsync("ReceiveUpdateSettings", new SettingsDto(settings));
        }

        await base.OnConnectedAsync();
        _logger.LogInformation("Connected: User with id={UserId} to room {RoomId}", user.Id, user.RoomId);

        await SendPlayerListUpdate(roomId);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var user = Context.ResolveUser(_userService);

        _logger.LogInformation("User with id={UserId} disconnecting... Exception:\n{Ex}", user.Id, exception?.Message);
        _userService.SetConnectedStatus(user.Id, false);

        // If user is still in a room (unintended disconnection) wait a bit for reconnection
        if (!string.IsNullOrEmpty(user.RoomId))
        {
            await Task.Run(async () =>
            {
                await Task.Delay(8000);
                if (!user.IsConnected)
                    await LeaveRoom();
            });
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task LeaveRoom()
    {
        var user = await ResolveUserAsync();
        string roomId = user.RoomId!;

        try
        {
            if (_roomService.IsHost(roomId, user))
            {
                // If the user is the host, delete the room
                _roomService.DeleteRoom(roomId, user);
                _logger.LogInformation("Disconnected: host with id={UserId}. Room {RoomId} deleted.", user.Id, roomId);

                await Clients.Group(roomId).SendAsync("ReceiveRoomDeleted");
            }
            else
            {
                // If the user is not the host, just leave the room
                _roomService.LeaveRoom(roomId, user);
                _logger.LogInformation("Disconnected: user with id={UserId} left room {RoomId}.", user.Id, roomId);

                await SendPlayerListUpdate(roomId);
            }
        }
        catch (AppException ex)
        {
            throw new HubException(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError("Error during HandleUserDisconnection for user with id={UserId}:\n{Ex}", user.Id, ex);
            throw new HubException("An unexpected error occurred while trying to leave the room.");
        }
    }

    public async Task UpdateRoomSettings(RoomSettingsModel settings)
    {
        var user = await ResolveUserAsync();
        var roomId = user.RoomId!;
        var updated = false;

        await Task.Run(() => updated = _roomService.UpdateSettings(roomId, user, settings));
        _logger.LogInformation("User with id={UserId} updated settings for room {RoomId}", user.Id, roomId);

        if (!updated)
        {
            return;
        }

        await Clients.Group(roomId).SendAsync("ReceiveUpdateSettings", new SettingsDto(settings));
    }

    public async Task SendPlayerListUpdate(string roomId)
    {
        var players = _roomService.GetUsersInRoom(roomId).Select(p => new PlayerDto(p, _roomService.IsHost(roomId, p))).ToList();

        await Clients.Group(roomId).SendAsync("ReceivePlayerList", players);
    }

    public async Task SetPlayerReady(bool isReady)
    {
        var user = await ResolveUserAsync();

        _userService.SetReadyStatus(user.Id, isReady);

        await SendPlayerListUpdate(user.RoomId!);
    }

    public async Task StartGame()
    {
        var user = await ResolveUserAsync();
        var roomId = user.RoomId!;

        try
        {
            await Task.Run(() => _roomService.StartGame(roomId, user));

            await Task.Run(() => _gameService.CreateGame(roomId));
        }
        catch (AppException ex)
        {
            await Clients.Caller.SendAsync("ReceiveErrorOnGameStart", ex.Message);
            return;
        }
        catch (Exception ex)
        {
            _logger.LogError("Error occurred while trying to start the game:\n{Ex}", ex);
            await Clients.Caller.SendAsync("ReceiveErrorOnGameStart", "An unexpected error occurred while trying to start the game.");
            return;
        }

        await Clients.Group(roomId).SendAsync("ReceiveGameStart");
    }

    public async Task InitiateVoteKick(long targetId)
    {
        var user = await ResolveUserAsync();
        var roomId = user.RoomId!;

        try
        {
            var room = _roomService.GetRoom(roomId);

            if (_roomService.IsHost(roomId, user))
            {
                await DirectKickPlayer(targetId);
                return;
            }

            var session = _voteKickService.InitiateVote(room, user.Id, targetId);

            await Clients.Group(roomId).SendAsync("ReceiveVoteKickStarted", new 
            {
                TargetUserId = session.TargetUserId,
                InitiatorUserId = session.InitiatorUserId,
                CreatedAt = session.CreatedAt
            });
            
            _logger.LogInformation("Vote kick initiated in room {RoomId} by user {InitiatorId} against user {TargetId}", roomId, user.Id, targetId);
            
            // 30s laukimas, per kurį žaidėjai gali balsuoti. Po to tikriname rezultatus ir imamės veiksmų.
            _ = ExecuteVoteKickResolutionAsync(roomId, targetId);
        }
        catch (AppException ex)
        {
            await Clients.Caller.SendAsync("ReceiveVoteKickError", ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError("Unexpected error initiating vote kick:\n{Ex}", ex);
            await Clients.Caller.SendAsync("ReceiveVoteKickError", "An unexpected error occurred while starting the vote.");
        }
    }

    public async Task DirectKickPlayer(long targetId)
    {
        var user = await ResolveUserAsync();
        var roomId = user.RoomId!;
        
        if (!_roomService.IsHost(roomId, user))
        {
            await Clients.Caller.SendAsync("ReceiveVoteKickError", "Only the host can directly kick a player.");
            return;
        }

        await ExecuteKick(roomId, targetId);
    }

    public async Task RegisterVote(long targetUserId, bool voteFor)
    {
        var user = await ResolveUserAsync();
        var roomId = user.RoomId!;

        var (success, session) = _voteKickService.RegisterVote(roomId, user.Id, voteFor);
        if (success && session != null)
        {
            await Clients.Group(roomId).SendAsync("ReceiveVoteRegistered", new 
            {
                TargetUserId = session.TargetUserId,
                VotesFor = session.VotesFor.Count,
                VotesAgainst = session.VotesAgainst.Count
            });
            _logger.LogInformation("User {UserId} registered vote {Vote} for kicking {TargetId} in room {RoomId}", user.Id, voteFor, targetUserId, roomId);
        }
        else if (session == null || session.IsCancelled)
        {
            await Clients.Caller.SendAsync("ReceiveVoteKickError", "Vote session not found or cancelled.");
        }
    }

    public async Task CancelVoteKick()
    {
        var user = await ResolveUserAsync();
        var roomId = user.RoomId!;

        if (!_roomService.IsHost(roomId, user))
        {
            await Clients.Caller.SendAsync("ReceiveVoteKickError", "Only the host can cancel a vote kick.");
            return;
        }

        if (_voteKickService.CancelVote(roomId, user.Id))
        {
            await Clients.Group(roomId).SendAsync("ReceiveVoteKickCancelled", "The host cancelled the vote kick.");
            _logger.LogInformation("Host {HostId} cancelled vote kick in room {RoomId}", user.Id, roomId);
        }
        else
        {
            await Clients.Caller.SendAsync("ReceiveVoteKickError", "No active vote kick session found.");
        }
    }

    private async Task ExecuteVoteKickResolutionAsync(string roomId, long targetUserId)
    {
        // 30s laukimas, per kurį žaidėjai gali balsuoti. Po to tikriname rezultatus ir imamės veiksmų.
        await Task.Delay(TimeSpan.FromSeconds(30));

        try
        {
            var session = _voteKickService.GetActiveSession(roomId);
            if (session == null)
            {
                return;
            }

            if (session.TargetUserId != targetUserId)
            {
                return;
            }

            if (session.IsCancelled)
            {
                // valome sesija iš aktyvių sesijų, kad būtų galima pradėti naują kick procesą, jei bus norima
                _voteKickService.CleanUpSession(roomId);
                return;
            }

            var usersInRoom = _roomService.GetUsersInRoom(roomId).ToList();
            bool hasMajority = session.HasMajority(usersInRoom.Count);

            if (hasMajority)
            {
                await ExecuteKick(roomId, targetUserId);
                
                await Clients.Group(roomId).SendAsync("ReceiveVoteKickSuccessful", targetUserId);
            }
            else
            {
                await Clients.Group(roomId).SendAsync("ReceiveVoteKickFailed", "Pritrūko balsų vartotojui išmesti.");
            }

            _voteKickService.CleanUpSession(roomId);
        }
        catch (Exception ex)
        {
            _logger.LogError("Error resolving vote kick in room {RoomId}:\n{Ex}", roomId, ex);
        }
    }

    private async Task ExecuteKick(string roomId, long targetId)
    {
        var targetUser = _userService.GetUser(targetId);
        if (targetUser != null && targetUser.RoomId == roomId)
        {
            _roomService.LeaveRoom(roomId, targetUser);
            
            await SendPlayerListUpdate(roomId);

            await Clients.User(targetId.ToString()).SendAsync("ReceiveKickedFromRoom");
            
            _logger.LogInformation("User {TargetId} was kicked from room {RoomId}", targetId, roomId);
        }
    }
}