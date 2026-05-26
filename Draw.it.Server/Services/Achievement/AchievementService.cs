using Draw.it.Server.Models.User;

namespace Draw.it.Server.Services.Achievement;

public static class AchievementService
{
    // Returns the set of achievements a user has unlocked based on their current stats.
    // Pure function — no side effects, no DB. Call after any stat update.
    public static HashSet<AchievementId> GetUnlocked(UserModel user)
    {
        var unlocked = new HashSet<AchievementId>();

        if (user.GamesPlayed >= 3) unlocked.Add(AchievementId.ArtisticRookie);
        if (user.FastGuesses >= 5) unlocked.Add(AchievementId.QuickDraw);
        if (user.TotalScore >= 100) unlocked.Add(AchievementId.Centurion);
        if (user.GamesWon >= 5) unlocked.Add(AchievementId.Master);
        if (user.GamesWon >= 25) unlocked.Add(AchievementId.TheGrandmaster);
        if (user.CorrectGuesses >= 50) unlocked.Add(AchievementId.MindReader);
        if (user.GamesPlayed >= 25) unlocked.Add(AchievementId.ArtisticSoul);

        return unlocked;
    }

    // Human-readable display name for each achievement ID
    public static string GetDisplayName(AchievementId id) => id switch
    {
        AchievementId.ArtisticRookie => "Artistic Rookie",
        AchievementId.QuickDraw => "Quick Draw",
        AchievementId.Centurion => "Centurion",
        AchievementId.Master => "Master",
        AchievementId.TheGrandmaster => "The Grandmaster",
        AchievementId.MindReader => "Mind Reader",
        AchievementId.ArtisticSoul => "Artistic Soul",
        _ => id.ToString()
    };
}