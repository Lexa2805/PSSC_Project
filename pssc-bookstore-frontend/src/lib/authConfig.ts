import { Configuration, LogLevel } from '@azure/msal-browser';

/**
 * Azure AD configuration for MSAL.js
 * 
 * To configure:
 * 1. Create an App Registration in Azure AD
 * 2. Add a Single-page application (SPA) platform with redirect URI: http://localhost:3000
 * 3. Copy the Application (client) ID and Directory (tenant) ID
 * 4. Create a .env.local file with the values below
 */

// Azure AD app registration settings
export const msalConfig: Configuration = {
    auth: {
        clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || 'YOUR_CLIENT_ID',
        authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID || 'YOUR_TENANT_ID'}`,
        redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000',
        postLogoutRedirectUri: process.env.NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI || 'http://localhost:3000',
        navigateToLoginRequestUrl: true,
    },
    cache: {
        cacheLocation: 'localStorage', // sessionStorage for more security
        storeAuthStateInCookie: false, // Set to true for IE11 support
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        return;
                    case LogLevel.Info:
                        console.info(message);
                        return;
                    case LogLevel.Verbose:
                        console.debug(message);
                        return;
                    case LogLevel.Warning:
                        console.warn(message);
                        return;
                }
            },
            logLevel: LogLevel.Warning,
        },
    },
};

// Scopes for API access
export const loginRequest = {
    scopes: ['User.Read', 'openid', 'profile', 'email'],
};

// API scopes (for accessing your backend)
export const apiRequest = {
    scopes: [
        `api://${process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || 'YOUR_CLIENT_ID'}/access_as_user`,
    ],
};

// Graph API scopes
export const graphConfig = {
    graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
};
