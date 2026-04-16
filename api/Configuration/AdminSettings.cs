namespace PokeScanner.Api.Configuration;

public sealed record AdminSettings(HashSet<Guid> AdminUserIds)
{
    public bool IsAdmin(Guid userId) => AdminUserIds.Contains(userId);
}
