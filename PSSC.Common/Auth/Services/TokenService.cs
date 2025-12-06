using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using PSSC.Common.Auth.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace PSSC.Common.Auth.Services;

/// <summary>
/// Service for handling token validation and user extraction.
/// </summary>
public interface ITokenService
{
    /// <summary>
    /// Extracts user information from the current HTTP context.
    /// </summary>
    AuthenticatedUser GetUserFromContext(HttpContext context);

    /// <summary>
    /// Validates a JWT token and returns the claims principal.
    /// </summary>
    ClaimsPrincipal? ValidateToken(string token);

    /// <summary>
    /// Decodes a JWT token without validation (for inspection only).
    /// </summary>
    JwtSecurityToken? DecodeToken(string token);
}

/// <summary>
/// Implementation of ITokenService.
/// </summary>
public class TokenService : ITokenService
{
    private readonly ILogger<TokenService> _logger;
    private readonly JwtSecurityTokenHandler _tokenHandler;

    public TokenService(ILogger<TokenService> logger)
    {
        _logger = logger;
        _tokenHandler = new JwtSecurityTokenHandler();
    }

    public AuthenticatedUser GetUserFromContext(HttpContext context)
    {
        return AuthenticatedUser.FromClaimsPrincipal(context.User);
    }

    public ClaimsPrincipal? ValidateToken(string token)
    {
        try
        {
            // Token validation is handled by the authentication middleware
            // This method is for additional validation if needed
            if (string.IsNullOrEmpty(token))
                return null;

            var jwtToken = DecodeToken(token);
            if (jwtToken == null)
                return null;

            // Check if token is expired
            if (jwtToken.ValidTo < DateTime.UtcNow)
            {
                _logger.LogWarning("Token has expired");
                return null;
            }

            var identity = new ClaimsIdentity(jwtToken.Claims, "Bearer");
            return new ClaimsPrincipal(identity);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating token");
            return null;
        }
    }

    public JwtSecurityToken? DecodeToken(string token)
    {
        try
        {
            if (string.IsNullOrEmpty(token))
                return null;

            // Remove "Bearer " prefix if present
            if (token.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                token = token[7..];

            return _tokenHandler.ReadJwtToken(token);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error decoding token");
            return null;
        }
    }
}
