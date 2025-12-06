'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
    PublicClientApplication,
    AccountInfo,
    InteractionRequiredAuthError,
    SilentRequest,
    AuthenticationResult,
    EventType,
    EventMessage,
} from '@azure/msal-browser';
import { msalConfig, loginRequest, apiRequest } from '@/lib/authConfig';

// User type
export interface AuthUser {
    id: string;
    email: string;
    displayName: string;
    firstName?: string;
    lastName?: string;
    roles: string[];
}

// Auth context type
interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: AuthUser | null;
    accessToken: string | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    getAccessToken: () => Promise<string | null>;
    error: string | null;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    accessToken: null,
    login: async () => { },
    logout: async () => { },
    getAccessToken: async () => null,
    error: null,
});

// MSAL instance (singleton)
let msalInstance: PublicClientApplication | null = null;
let msalInitialized = false;

const getMsalInstance = async (): Promise<PublicClientApplication> => {
    if (!msalInstance) {
        msalInstance = new PublicClientApplication(msalConfig);
    }
    if (!msalInitialized) {
        await msalInstance.initialize();
        msalInitialized = true;
    }
    return msalInstance;
};

// Convert AccountInfo to AuthUser
const accountToUser = (account: AccountInfo): AuthUser => {
    return {
        id: account.localAccountId || account.homeAccountId || '',
        email: account.username || '',
        displayName: account.name || account.username || '',
        firstName: account.idTokenClaims?.given_name as string | undefined,
        lastName: account.idTokenClaims?.family_name as string | undefined,
        roles: (account.idTokenClaims?.roles as string[]) || [],
    };
};

// Auth Provider Props
interface AuthProviderProps {
    children: ReactNode;
}

// Auth Provider Component
export function AuthProvider({ children }: AuthProviderProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [instance, setInstance] = useState<PublicClientApplication | null>(null);

    // Initialize MSAL
    useEffect(() => {
        let isMounted = true;

        const initializeMsal = async () => {
            try {
                const msalInst = await getMsalInstance();

                if (!isMounted) return;

                setInstance(msalInst);

                // Handle redirect promise (for redirect flow)
                try {
                    const response = await msalInst.handleRedirectPromise();
                    if (!isMounted) return;

                    if (response) {
                        const account = response.account;
                        if (account) {
                            msalInst.setActiveAccount(account);
                            setUser(accountToUser(account));
                            setIsAuthenticated(true);
                            setAccessToken(response.accessToken);
                        }
                    } else {
                        // Check for existing accounts
                        const accounts = msalInst.getAllAccounts();
                        if (accounts.length > 0) {
                            const account = accounts[0];
                            msalInst.setActiveAccount(account);
                            setUser(accountToUser(account));
                            setIsAuthenticated(true);

                            // Try to get a silent token
                            try {
                                const silentRequest: SilentRequest = {
                                    ...loginRequest,
                                    account: account,
                                };
                                const tokenResponse = await msalInst.acquireTokenSilent(silentRequest);
                                if (isMounted) {
                                    setAccessToken(tokenResponse.accessToken);
                                }
                            } catch (silentError) {
                                console.log('Silent token acquisition failed, user may need to re-authenticate');
                            }
                        }
                    }
                } catch (redirectError) {
                    console.error('Redirect promise error:', redirectError);
                }

                // Register event callback for account changes
                msalInst.addEventCallback((event: EventMessage) => {
                    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
                        const payload = event.payload as AuthenticationResult;
                        if (payload.account) {
                            msalInst.setActiveAccount(payload.account);
                            setUser(accountToUser(payload.account));
                            setIsAuthenticated(true);
                            setAccessToken(payload.accessToken);
                        }
                    }
                    if (event.eventType === EventType.LOGOUT_SUCCESS) {
                        setUser(null);
                        setIsAuthenticated(false);
                        setAccessToken(null);
                    }
                });

            } catch (err) {
                console.error('MSAL initialization error:', err);
                if (isMounted) {
                    setError('Failed to initialize authentication');
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        initializeMsal();

        return () => {
            isMounted = false;
        };
    }, []);

    // Login function
    const login = useCallback(async () => {
        if (!instance) {
            setError('Authentication not initialized');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Try popup first
            const response = await instance.loginPopup(loginRequest);

            if (response.account) {
                instance.setActiveAccount(response.account);
                setUser(accountToUser(response.account));
                setIsAuthenticated(true);
                setAccessToken(response.accessToken);
            }
        } catch (popupError) {
            console.log('Popup login failed, trying redirect:', popupError);

            try {
                // Fall back to redirect
                await instance.loginRedirect(loginRequest);
            } catch (redirectError) {
                console.error('Login failed:', redirectError);
                setError('Login failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [instance]);

    // Logout function
    const logout = useCallback(async () => {
        if (!instance) {
            return;
        }

        setIsLoading(true);

        try {
            const account = instance.getActiveAccount();
            await instance.logoutPopup({
                account: account,
                postLogoutRedirectUri: msalConfig.auth.postLogoutRedirectUri,
            });

            setUser(null);
            setIsAuthenticated(false);
            setAccessToken(null);
        } catch (err) {
            console.error('Logout error:', err);
            // Try redirect logout
            try {
                await instance.logoutRedirect({
                    postLogoutRedirectUri: msalConfig.auth.postLogoutRedirectUri,
                });
            } catch (redirectErr) {
                console.error('Redirect logout also failed:', redirectErr);
            }
        } finally {
            setIsLoading(false);
        }
    }, [instance]);

    // Get access token for API calls
    const getAccessToken = useCallback(async (): Promise<string | null> => {
        if (!instance) {
            return null;
        }

        const account = instance.getActiveAccount();
        if (!account) {
            return null;
        }

        try {
            const silentRequest: SilentRequest = {
                ...apiRequest,
                account: account,
            };

            const response = await instance.acquireTokenSilent(silentRequest);
            setAccessToken(response.accessToken);
            return response.accessToken;
        } catch (err) {
            if (err instanceof InteractionRequiredAuthError) {
                // Token expired or requires interaction
                try {
                    const response = await instance.acquireTokenPopup(apiRequest);
                    setAccessToken(response.accessToken);
                    return response.accessToken;
                } catch (popupErr) {
                    console.error('Token acquisition failed:', popupErr);
                    return null;
                }
            }
            console.error('Silent token acquisition failed:', err);
            return null;
        }
    }, [instance]);

    const value: AuthContextType = {
        isAuthenticated,
        isLoading,
        user,
        accessToken,
        login,
        logout,
        getAccessToken,
        error,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook to use auth context
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
