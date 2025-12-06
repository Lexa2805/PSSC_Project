using Microsoft.AspNetCore.Authorization;

namespace PSSC.Common.Auth.Authorization;

/// <summary>
/// Policy names for authorization.
/// </summary>
public static class AuthPolicies
{
    public const string RequireAuthenticatedUser = "RequireAuthenticatedUser";
    public const string RequireAdmin = "RequireAdmin";
    public const string RequireManager = "RequireManager";
    public const string RequireCustomer = "RequireCustomer";
}

/// <summary>
/// Role names for the application.
/// </summary>
public static class AppRoles
{
    public const string Admin = "Admin";
    public const string Manager = "Manager";
    public const string Customer = "Customer";
    public const string Guest = "Guest";
}

/// <summary>
/// Extension methods for configuring authorization policies.
/// </summary>
public static class AuthorizationExtensions
{
    /// <summary>
    /// Adds default authorization policies for the application.
    /// </summary>
    public static AuthorizationOptions AddDefaultPolicies(this AuthorizationOptions options)
    {
        options.AddPolicy(AuthPolicies.RequireAuthenticatedUser, policy =>
            policy.RequireAuthenticatedUser());

        options.AddPolicy(AuthPolicies.RequireAdmin, policy =>
            policy.RequireRole(AppRoles.Admin));

        options.AddPolicy(AuthPolicies.RequireManager, policy =>
            policy.RequireRole(AppRoles.Admin, AppRoles.Manager));

        options.AddPolicy(AuthPolicies.RequireCustomer, policy =>
            policy.RequireRole(AppRoles.Admin, AppRoles.Manager, AppRoles.Customer));

        return options;
    }
}
