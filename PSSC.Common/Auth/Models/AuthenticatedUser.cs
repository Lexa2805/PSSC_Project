using System.Security.Claims;

namespace PSSC.Common.Auth.Models;

/// <summary>
/// Represents an authenticated user from Azure AD.
/// </summary>
public class AuthenticatedUser
{
    /// <summary>
    /// User's unique identifier (Object ID from Azure AD)
    /// </summary>
    public string Id { get; init; } = string.Empty;

    /// <summary>
    /// User's email address
    /// </summary>
    public string Email { get; init; } = string.Empty;

    /// <summary>
    /// User's display name
    /// </summary>
    public string DisplayName { get; init; } = string.Empty;

    /// <summary>
    /// User's first name
    /// </summary>
    public string? FirstName { get; init; }

    /// <summary>
    /// User's last name
    /// </summary>
    public string? LastName { get; init; }

    /// <summary>
    /// User's roles from Azure AD
    /// </summary>
    public IReadOnlyList<string> Roles { get; init; } = Array.Empty<string>();

    /// <summary>
    /// Whether the user is authenticated
    /// </summary>
    public bool IsAuthenticated { get; init; }

    /// <summary>
    /// The tenant ID the user belongs to
    /// </summary>
    public string? TenantId { get; init; }

    /// <summary>
    /// Additional claims from the token
    /// </summary>
    public IDictionary<string, string> AdditionalClaims { get; init; } = new Dictionary<string, string>();

    /// <summary>
    /// Creates an AuthenticatedUser from ClaimsPrincipal
    /// </summary>
    public static AuthenticatedUser FromClaimsPrincipal(ClaimsPrincipal? principal)
    {
        if (principal?.Identity?.IsAuthenticated != true)
        {
            return new AuthenticatedUser { IsAuthenticated = false };
        }

        var claims = principal.Claims.ToList();

        return new AuthenticatedUser
        {
            IsAuthenticated = true,
            Id = GetClaimValue(claims, ClaimTypes.NameIdentifier, "oid", "sub") ?? string.Empty,
            Email = GetClaimValue(claims, ClaimTypes.Email, "preferred_username", "email", "upn") ?? string.Empty,
            DisplayName = GetClaimValue(claims, "name", ClaimTypes.Name) ?? string.Empty,
            FirstName = GetClaimValue(claims, ClaimTypes.GivenName, "given_name"),
            LastName = GetClaimValue(claims, ClaimTypes.Surname, "family_name"),
            TenantId = GetClaimValue(claims, "tid", "http://schemas.microsoft.com/identity/claims/tenantid"),
            Roles = claims
                .Where(c => c.Type == ClaimTypes.Role || c.Type == "roles")
                .Select(c => c.Value)
                .Distinct()
                .ToList(),
            AdditionalClaims = claims
                .Where(c => !IsStandardClaim(c.Type))
                .GroupBy(c => c.Type)
                .ToDictionary(g => g.Key, g => g.First().Value)
        };
    }

    private static string? GetClaimValue(IEnumerable<Claim> claims, params string[] claimTypes)
    {
        foreach (var claimType in claimTypes)
        {
            var value = claims.FirstOrDefault(c => c.Type == claimType)?.Value;
            if (!string.IsNullOrEmpty(value))
                return value;
        }
        return null;
    }

    private static bool IsStandardClaim(string claimType)
    {
        var standardClaims = new[]
        {
            ClaimTypes.NameIdentifier, ClaimTypes.Email, ClaimTypes.Name,
            ClaimTypes.GivenName, ClaimTypes.Surname, ClaimTypes.Role,
            "oid", "sub", "preferred_username", "email", "upn", "name",
            "given_name", "family_name", "tid", "roles", "aud", "iss",
            "iat", "nbf", "exp", "aio", "azp", "azpacr", "nonce", "auth_time"
        };
        return standardClaims.Contains(claimType);
    }
}
