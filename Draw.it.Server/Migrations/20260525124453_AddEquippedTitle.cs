using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Draw.it.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddEquippedTitle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "EquippedTitle",
                table: "users",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EquippedTitle",
                table: "users");
        }
    }
}
