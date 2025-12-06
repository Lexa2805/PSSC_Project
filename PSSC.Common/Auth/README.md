# Azure AD Authentication Setup Guide

This guide explains how to set up Azure AD authentication for the PSSC Project.

## Prerequisites

1. An Azure subscription
2. Access to Azure Active Directory (Azure AD)
3. .NET 9.0 SDK
4. Node.js 18+

## Azure AD App Registration

### Step 1: Create App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in:
   - **Name**: `PSSC Bookstore` (or your preferred name)
   - **Supported account types**: Choose based on your needs (usually "Single tenant")
   - **Redirect URI**: Select "Single-page application (SPA)" and enter `http://localhost:3000`
5. Click **Register**

### Step 2: Note Important Values

After registration, note down:
- **Application (client) ID**: Found on the Overview page
- **Directory (tenant) ID**: Found on the Overview page

### Step 3: Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph** > **Delegated permissions**
4. Add these permissions:
   - `User.Read`
   - `openid`
   - `profile`
   - `email`
5. Click **Grant admin consent** (if you have admin rights)

### Step 4: Expose an API (for backend authentication)

1. Go to **Expose an API**
2. Click **Set** next to "Application ID URI" and accept the default or customize
3. Click **Add a scope**:
   - **Scope name**: `access_as_user`
   - **Who can consent**: Admins and users
   - **Admin consent display name**: `Access PSSC API`
   - **Admin consent description**: `Allow the application to access PSSC API on behalf of the signed-in user`
   - **User consent display name**: `Access PSSC API`
   - **User consent description**: `Allow the application to access PSSC API on your behalf`
   - **State**: Enabled

## Backend Configuration

### Update appsettings.json

Add the following to each API's `appsettings.json`:

```json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "YOUR_TENANT_ID",
    "ClientId": "YOUR_CLIENT_ID",
    "Audience": "api://YOUR_CLIENT_ID",
    "ValidateIssuer": true,
    "ValidateAudience": true,
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://localhost:3000"
    ]
  }
}
```

Replace:
- `YOUR_TENANT_ID` with your Directory (tenant) ID
- `YOUR_CLIENT_ID` with your Application (client) ID

## Frontend Configuration

### Create .env.local

Create a `.env.local` file in the `pssc-bookstore-frontend` folder:

```env
# Azure AD Configuration
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=your-client-id-here
NEXT_PUBLIC_AZURE_AD_TENANT_ID=your-tenant-id-here
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000
NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI=http://localhost:3000

# API URLs
NEXT_PUBLIC_API_URL=http://localhost:5122
NEXT_PUBLIC_INVOICING_API_URL=http://localhost:5109
NEXT_PUBLIC_SHIPPING_API_URL=http://localhost:5096
```

## Usage

### Backend

The authentication is automatically integrated via the `PSSC.Common` library. The APIs now have:

- `/api/auth/me` - Get current user info (requires authentication)
- `/api/auth/validate` - Validate token (requires authentication)
- `/api/auth/health` - Health check (no auth required)

To require authentication on an endpoint:
```csharp
app.MapGet("/api/protected", () => "Protected data")
   .RequireAuthorization();
```

To access the current user in your code:
```csharp
app.MapGet("/api/my-data", (ICurrentUserService userService) =>
{
    var user = userService.GetCurrentUser();
    return Results.Ok(new { user.Email, user.DisplayName });
}).RequireAuthorization();
```

### Frontend

The `AuthProvider` is already integrated in the layout. Use the `useAuth` hook:

```tsx
'use client';
import { useAuth } from '@/context/AuthContext';

function MyComponent() {
    const { isAuthenticated, user, login, logout, isLoading } = useAuth();
    
    if (isLoading) return <div>Loading...</div>;
    
    if (!isAuthenticated) {
        return <button onClick={login}>Sign In</button>;
    }
    
    return (
        <div>
            <p>Welcome, {user?.displayName}!</p>
            <button onClick={logout}>Sign Out</button>
        </div>
    );
}
```

For authenticated API calls:
```tsx
import { useAuthenticatedApi } from '@/lib/authApi';

function MyComponent() {
    const { salesApi, isAuthenticated } = useAuthenticatedApi();
    
    const handlePlaceOrder = async () => {
        if (isAuthenticated) {
            const result = await salesApi.placeOrder(customerId, lines);
        }
    };
}
```

## Project Structure

### PSSC.Common/Auth

```
Auth/
├── Configuration/
│   └── AzureAdConfig.cs          # Configuration model
├── Models/
│   ├── AuthenticatedUser.cs      # User model with claims
│   └── AuthResult.cs             # Auth result/response models
├── Services/
│   ├── ICurrentUserService.cs    # Service to access current user
│   └── TokenService.cs           # Token validation service
├── Authorization/
│   └── AuthorizationPolicies.cs  # Role-based policies
└── Extensions/
    └── AuthenticationExtensions.cs # DI extension methods
```

### Frontend Auth

```
src/
├── lib/
│   ├── authConfig.ts    # MSAL configuration
│   └── authApi.ts       # Authenticated API helpers
├── context/
│   └── AuthContext.tsx  # Auth provider and hook
└── components/
    └── AuthButton.tsx   # Login/logout button
```

## Troubleshooting

### Common Issues

1. **CORS errors**: Ensure AllowedOrigins in backend includes your frontend URL
2. **Token invalid**: Check that TenantId and ClientId match in both frontend and backend
3. **Login popup blocked**: Enable popups for localhost in your browser
4. **Redirect loop**: Ensure redirect URIs are correctly configured in Azure AD

### Development Tips

1. Use browser dev tools to inspect network requests and token contents
2. Check the console for MSAL debug messages
3. Use [jwt.ms](https://jwt.ms) to decode and inspect tokens
