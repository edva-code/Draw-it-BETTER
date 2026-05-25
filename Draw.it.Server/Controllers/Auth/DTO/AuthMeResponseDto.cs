using Draw.it.Server.Models.User;
using Draw.it.Server.Services.Achievement;

namespace Draw.it.Server.Controllers.Auth.DTO;

public record AuthMeResponseDto(
    string Name,
    string? RoomId,
    bool IsGuest,
    int TotalScore,
    int GamesWon,
    int GamesPlayed,
    int CorrectGuesses,
    int FastGuesses,
    Dictionary<string, bool> Achievements,  // achievementId -> unlocked
    string? EquippedTitle                   // display name of equipped title, or null
)
{
    public AuthMeResponseDto(UserModel user) : this(
        user.Name,
        user.RoomId,
        user.IsGuest,
        user.TotalScore,
        user.GamesWon,
        user.GamesPlayed,
        user.CorrectGuesses,
        user.FastGuesses,
        BuildAchievements(user),
        user.EquippedTitle.HasValue
            ? AchievementService.GetDisplayName(user.EquippedTitle.Value)
            : null
    )
    { }

    private static Dictionary<string, bool> BuildAchievements(UserModel user)
    {
        var unlocked = AchievementService.GetUnlocked(user);
        return Enum.GetValues<AchievementId>()
            .ToDictionary(
                id => id.ToString(),
                id => unlocked.Contains(id)
            );
    }
}