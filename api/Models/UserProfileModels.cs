namespace PokeScanner.Api.Models;

public record UserProfile(
    Guid     UserId,
    string   UserName,
    string   EmailAddress,
    bool     IsAdmin,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record ResolveUsernameRequest(string UserName);

public record ResolveUsernameResponse(string Email);

public record RegisterProfileRequest(string UserName, string EmailAddress);
