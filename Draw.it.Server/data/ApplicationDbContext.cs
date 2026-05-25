using Draw.it.Server.Models.Room;
using Draw.it.Server.Models.User;
using Microsoft.EntityFrameworkCore;

namespace Draw.it.Server.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options)
{
    public DbSet<RoomModel> Rooms => Set<RoomModel>();
    public DbSet<UserModel> Users => Set<UserModel>();
    public DbSet<FriendshipModel> Friendships { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RoomModel>(entity =>
        {
            entity.ToTable("rooms");
            entity.HasKey(r => r.Id);

            entity.Property(r => r.Id)
                .HasColumnName("id")
                .HasMaxLength(16);

            entity.Property(r => r.HostId)
                .HasColumnName("host_id");

            entity.Property(r => r.Status)
                .HasColumnName("status")
                .HasConversion<string>()
                .HasMaxLength(32);

            // Flatten RoomSettingsModel into the same rooms table
            entity.OwnsOne(r => r.Settings, settings =>
            {
                settings.Property(s => s.RoomName)
                    .HasColumnName("room_name")
                    .HasMaxLength(128);
                settings.Property(s => s.CategoryId)
                    .HasColumnName("category_id");
                settings.Property(s => s.DrawingTime)
                    .HasColumnName("drawing_time_seconds");
                settings.Property(s => s.NumberOfRounds)
                    .HasColumnName("number_of_rounds");
                settings.Property(s => s.HasAiPlayer)
                    .HasColumnName("has_ai_player");
            });
        });

        modelBuilder.Entity<UserModel>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(u => u.Id);

            entity.Property(u => u.Id)
                .HasColumnName("id")
                .ValueGeneratedOnAdd();

            entity.Property(u => u.Name)
                .HasColumnName("name")
                .HasMaxLength(128);

            entity.Property(u => u.Email)
                .HasColumnName("email")
                .HasMaxLength(255)
                .IsRequired(false);

            entity.Property(u => u.PasswordHash)
                .HasColumnName("password_hash")
                .HasMaxLength(255)
                .IsRequired(false);

            entity.Property(u => u.TotalScore)
                .HasColumnName("total_score")
                .HasDefaultValue(0);

            entity.Property(u => u.GamesPlayed)
                .HasColumnName("games_played")
                .HasDefaultValue(0);

            entity.Property(u => u.GamesWon)
                .HasColumnName("games_won")
                .HasDefaultValue(0);

            entity.Property(u => u.CorrectGuesses)
                .HasColumnName("correct_guesses")
                .HasDefaultValue(0);

            entity.Property(u => u.FastGuesses)
                .HasColumnName("fast_guesses")
                .HasDefaultValue(0);

            entity.Ignore(u => u.IsGuest);

            entity.HasIndex(u => u.Email).IsUnique();

            entity.Property(u => u.RoomId)
                .HasColumnName("room_id")
                .HasMaxLength(16)
                .IsRequired(false);

            entity.Property(u => u.IsConnected)
                .HasColumnName("is_connected");

            entity.Property(u => u.IsReady)
                .HasColumnName("is_ready");

            entity.Property(u => u.IsAi)
                .HasColumnName("is_ai");

            entity.Property(u => u.LastSeenAt)
                .HasColumnName("last_seen_at")
                .IsRequired(false);

            entity.HasOne<RoomModel>()
                .WithMany()
                .HasForeignKey(u => u.RoomId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}

