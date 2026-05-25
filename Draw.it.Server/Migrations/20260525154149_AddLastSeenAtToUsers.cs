using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Draw.it.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddLastSeenAtToUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "last_seen_at",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "last_seen_at",
                table: "users");
        }
    }
}
