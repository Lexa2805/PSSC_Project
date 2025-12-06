using System.Security.Claims;
using PSSC.Common.Auth.Models;

namespace PSSC.Common.Auth.Services;

/// <summary>
/// Service for accessing the current authenticated user.
/// </summary>
public interface ICurrentUserService
{
    /// <summary>
    /// Gets the current authenticated user.
    /// </summary>
    AuthenticatedUser GetCurrentUser();

    /// <summary>
    /// Gets the current user's ID or null if not authenticated.
    /// </summary>
    string? GetUserId();

    /// <summary>
    /// Gets the current user's email or null if not authenticated.
    /// </summary>
    string? GetUserEmail();

    /// <summary>
    /// Checks if the current user is authenticated.
    /// </summary>
    bool IsAuthenticated();

    /// <summary>
    /// Checks if the current user has a specific role.
    /// </summary>
    bool IsInRole(string role);

    /// <summary>
    /// Gets a specific claim value for the current user.
    /// </summary>
    string? GetClaimValue(string claimType);
}

/// <summary>
/// Implementation of ICurrentUserService using HttpContext.
/// </summary>
public class CurrentUserService : ICurrentUserService
{
    private readonly ClaimsPrincipal? _user;
    private AuthenticatedUser? _cachedUser;

    public CurrentUserService(ClaimsPrincipal? user)
    {
        _user = user;
    }

    public AuthenticatedUser GetCurrentUser()
    {
        return _cachedUser ??= AuthenticatedUser.FromClaimsPrincipal(_user);
    }

    public string? GetUserId()
    {
        return GetCurrentUser().IsAuthenticated ? GetCurrentUser().Id : null;
    }

    public string? GetUserEmail()
    {
        return GetCurrentUser().IsAuthenticated ? GetCurrentUser().Email : null;
    }

    public bool IsAuthenticated()
    {
        return _user?.Identity?.IsAuthenticated ?? false;
    }

    public bool IsInRole(string role)
    {
        return _user?.IsInRole(role) ?? false;
    }

    public string? GetClaimValue(string claimType)
    {
        return _user?.FindFirst(claimType)?.Value;
    }
}
