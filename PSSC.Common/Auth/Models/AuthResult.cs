namespace PSSC.Common.Auth.Models;

/// <summary>
/// Represents the result of an authentication operation.
/// </summary>
public class AuthResult
{
    public bool Success { get; init; }
    public string? AccessToken { get; init; }
    public string? RefreshToken { get; init; }
    public string? IdToken { get; init; }
    public DateTime? ExpiresAt { get; init; }
    public AuthenticatedUser? User { get; init; }
    public string? Error { get; init; }
    public string? ErrorDescription { get; init; }

    public static AuthResult Successful(
        AuthenticatedUser user,
        string accessToken,
        DateTime expiresAt,
        string? idToken = null,
        string? refreshToken = null)
    {
        return new AuthResult
        {
            Success = true,
            User = user,
            AccessToken = accessToken,
            IdToken = idToken,
            RefreshToken = refreshToken,
            ExpiresAt = expiresAt
        };
    }

    public static AuthResult Failed(string error, string? errorDescription = null)
    {
        return new AuthResult
        {
            Success = false,
            Error = error,
            ErrorDescription = errorDescription
        };
    }
}

/// <summary>
/// Response DTO for authentication endpoints
/// </summary>
public record AuthResponse
{
    public bool IsAuthenticated { get; init; }
    public string? UserId { get; init; }
    public string? Email { get; init; }
    public string? DisplayName { get; init; }
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
    public IEnumerable<string>? Roles { get; init; }
    public string? Error { get; init; }

    public static AuthResponse FromUser(AuthenticatedUser user)
    {
        return new AuthResponse
        {
            IsAuthenticated = user.IsAuthenticated,
            UserId = user.Id,
            Email = user.Email,
            DisplayName = user.DisplayName,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Roles = user.Roles
        };
    }

    public static AuthResponse Unauthenticated(string? error = null)
    {
        return new AuthResponse
        {
            IsAuthenticated = false,
            Error = error
        };
    }
}
