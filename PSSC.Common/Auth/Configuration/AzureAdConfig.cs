namespace PSSC.Common.Auth.Configuration;

/// <summary>
/// Configuration settings for Azure AD authentication.
/// </summary>
public class AzureAdConfig
{
    public const string SectionName = "AzureAd";

    /// <summary>
    /// Azure AD instance URL (e.g., https://login.microsoftonline.com/)
    /// </summary>
    public string Instance { get; set; } = "https://login.microsoftonline.com/";

    /// <summary>
    /// Azure AD tenant ID or domain
    /// </summary>
    public string TenantId { get; set; } = string.Empty;

    /// <summary>
    /// Application (client) ID from Azure AD app registration
    /// </summary>
    public string ClientId { get; set; } = string.Empty;

    /// <summary>
    /// Client secret for backend API authentication (optional for public clients)
    /// </summary>
    public string? ClientSecret { get; set; }

    /// <summary>
    /// The audience for the API (usually the client ID or a custom URI)
    /// </summary>
    public string? Audience { get; set; }

    /// <summary>
    /// Scopes required for API access
    /// </summary>
    public string[] Scopes { get; set; } = Array.Empty<string>();

    /// <summary>
    /// Authority URL combining Instance and TenantId
    /// </summary>
    public string Authority => $"{Instance.TrimEnd('/')}/{TenantId}";

    /// <summary>
    /// Whether to validate the issuer
    /// </summary>
    public bool ValidateIssuer { get; set; } = true;

    /// <summary>
    /// Whether to validate the audience
    /// </summary>
    public bool ValidateAudience { get; set; } = true;

    /// <summary>
    /// Allowed origins for CORS (frontend URLs)
    /// </summary>
    public string[] AllowedOrigins { get; set; } = new[] { "http://localhost:3000", "https://localhost:3000" };
}
