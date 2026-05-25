using Draw.it.Server.Enums;
using Draw.it.Server.Data;
using Draw.it.Server.Repositories.Game;
using Draw.it.Server.Repositories.Room;
using Draw.it.Server.Repositories.WordPool;
using Draw.it.Server.Repositories.User;
using Microsoft.EntityFrameworkCore;

namespace Draw.it.Server.Repositories;


public static class RepositoryDependencyInjection
{
    public static IServiceCollection AddApplicationRepositories(this IServiceCollection services, IConfiguration config)
    {
        var repoType = config.GetValue<string>("RepositoryType");

        if (repoType == nameof(RepoType.InMem))
        {
            services.AddSingleton<IUserRepository, InMemUserRepository>();
            services.AddSingleton<IFriendshipRepository, FriendshipRepository>();
            services.AddSingleton<IRoomRepository, InMemRoomRepository>();
            services.AddSingleton<IWordPoolRepository, FileStreamWordPoolRepository>();
            services.AddSingleton<IGameRepository, InMemGameRepository>();
        }
        else
        {
            services.AddScoped<IUserRepository, DbUserRepository>();
            services.AddScoped<IFriendshipRepository, DbFriendshipRepository>();
            services.AddScoped<IRoomRepository, DbRoomRepository>();
            services.AddSingleton<IWordPoolRepository, FileStreamWordPoolRepository>();
            services.AddSingleton<IGameRepository, InMemGameRepository>();
        }
        return services;
    }
}