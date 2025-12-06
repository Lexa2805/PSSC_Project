using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Identity.Web;
using PSSC.Common.Auth.Configuration;
using PSSC.Common.Auth.Models;
using PSSC.Common.Auth.Services;

namespace PSSC.Common.Auth.Extensions;

/// <summary>
/// Extension methods for configuring Azure AD authentication in ASP.NET Core applications.
/// </summary>
public static class AuthenticationExtensions
{
    /// <summary>
    /// Adds Azure AD authentication to the service collection.
    /// </summary>
    public static IServiceCollection AddAzureAdAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var azureAdConfig = configuration.GetSection(AzureAdConfig.SectionName).Get<AzureAdConfig>()
            ?? new AzureAdConfig();

        services.Configure<AzureAdConfig>(configuration.GetSection(AzureAdConfig.SectionName));

        // Add Microsoft Identity Web for Azure AD authentication
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddMicrosoftIdentityWebApi(options =>
            {
                configuration.Bind(AzureAdConfig.SectionName, options);
                options.TokenValidationParameters.ValidateIssuer = azureAdConfig.ValidateIssuer;
                options.TokenValidationParameters.ValidateAudience = azureAdConfig.ValidateAudience;

                // Handle authentication events
                options.Events = new JwtBearerEvents
                {
                    OnAuthenticationFailed = context =>
                    {
                        Console.WriteLine($"Authentication failed: {context.Exception.Message}");
                        return Task.CompletedTask;
                    },
                    OnTokenValidated = context =>
                    {
                        var user = AuthenticatedUser.FromClaimsPrincipal(context.Principal);
                        Console.WriteLine($"Token validated for user: {user.Email}");
                        return Task.CompletedTask;
                    },
                    OnChallenge = context =>
                    {
                        Console.WriteLine($"Authentication challenge: {context.Error}, {context.ErrorDescription}");
                        return Task.CompletedTask;
                    }
                };
            }, options =>
            {
                configuration.Bind(AzureAdConfig.SectionName, options);
            });

        // Add authorization
        services.AddAuthorization();

        // Register auth services
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<ICurrentUserService>(sp =>
        {
            var httpContextAccessor = sp.GetRequiredService<IHttpContextAccessor>();
            return new CurrentUserService(httpContextAccessor.HttpContext?.User);
        });

        services.AddHttpContextAccessor();

        return services;
    }

    /// <summary>
    /// Adds Azure AD authentication with custom configuration.
    /// </summary>
    public static IServiceCollection AddAzureAdAuthentication(
        this IServiceCollection services,
        Action<AzureAdConfig> configureOptions)
    {
        var config = new AzureAdConfig();
        configureOptions(config);

        services.Configure<AzureAdConfig>(options =>
        {
            options.Instance = config.Instance;
            options.TenantId = config.TenantId;
            options.ClientId = config.ClientId;
            options.ClientSecret = config.ClientSecret;
            options.Audience = config.Audience;
            options.Scopes = config.Scopes;
            options.ValidateIssuer = config.ValidateIssuer;
            options.ValidateAudience = config.ValidateAudience;
            options.AllowedOrigins = config.AllowedOrigins;
        });

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = config.Authority;
                options.Audience = config.Audience ?? config.ClientId;
                options.TokenValidationParameters.ValidateIssuer = config.ValidateIssuer;
                options.TokenValidationParameters.ValidateAudience = config.ValidateAudience;
            });

        services.AddAuthorization();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<ICurrentUserService>(sp =>
        {
            var httpContextAccessor = sp.GetRequiredService<IHttpContextAccessor>();
            return new CurrentUserService(httpContextAccessor.HttpContext?.User);
        });
        services.AddHttpContextAccessor();

        return services;
    }

    /// <summary>
    /// Configures CORS for Azure AD authentication with the frontend application.
    /// </summary>
    public static IServiceCollection AddAzureAdCors(
        this IServiceCollection services,
        IConfiguration configuration,
        string policyName = "AzureAdCors")
    {
        var azureAdConfig = configuration.GetSection(AzureAdConfig.SectionName).Get<AzureAdConfig>()
            ?? new AzureAdConfig();

        services.AddCors(options =>
        {
            options.AddPolicy(policyName, policy =>
            {
                policy.WithOrigins(azureAdConfig.AllowedOrigins)
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials();
            });
        });

        return services;
    }

    /// <summary>
    /// Uses Azure AD authentication middleware.
    /// </summary>
    public static IApplicationBuilder UseAzureAdAuthentication(this IApplicationBuilder app)
    {
        app.UseAuthentication();
        app.UseAuthorization();
        return app;
    }

    /// <summary>
    /// Maps authentication endpoints for the API.
    /// </summary>
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var authGroup = endpoints.MapGroup("/api/auth")
            .WithTags("Authentication");

        // Get current user info
        authGroup.MapGet("/me", (HttpContext context) =>
        {
            var user = AuthenticatedUser.FromClaimsPrincipal(context.User);
            return user.IsAuthenticated
                ? Results.Ok(AuthResponse.FromUser(user))
                : Results.Unauthorized();
        })
        .WithName("GetCurrentUser")
        .RequireAuthorization();

        // Health check for auth (no auth required)
        authGroup.MapGet("/health", () => Results.Ok(new { Status = "Healthy", Timestamp = DateTime.UtcNow }))
        .WithName("AuthHealthCheck");

        // Validate token (requires auth)
        authGroup.MapGet("/validate", (HttpContext context) =>
        {
            var user = AuthenticatedUser.FromClaimsPrincipal(context.User);
            return Results.Ok(new
            {
                IsValid = user.IsAuthenticated,
                User = user.IsAuthenticated ? AuthResponse.FromUser(user) : null
            });
        })
        .WithName("ValidateToken")
        .RequireAuthorization();

        return endpoints;
    }
}
