import { useAuth } from '@/context/AuthContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5122';
const INVOICING_API_URL = process.env.NEXT_PUBLIC_INVOICING_API_URL || 'http://localhost:5109';
const SHIPPING_API_URL = process.env.NEXT_PUBLIC_SHIPPING_API_URL || 'http://localhost:5096';

/**
 * Options for authenticated API calls
 */
interface AuthFetchOptions extends RequestInit {
    requireAuth?: boolean;
}

/**
 * Creates a fetch function that automatically adds the authorization header
 */
export function createAuthenticatedFetch(getAccessToken: () => Promise<string | null>) {
    return async function authFetch(url: string, options: AuthFetchOptions = {}): Promise<Response> {
        const { requireAuth = true, ...fetchOptions } = options;

        const headers = new Headers(fetchOptions.headers);

        if (requireAuth) {
            const token = await getAccessToken();
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }
        }

        return fetch(url, {
            ...fetchOptions,
            headers,
        });
    };
}

/**
 * Hook that provides authenticated fetch functions for all APIs
 */
export function useAuthenticatedApi() {
    const { getAccessToken, isAuthenticated } = useAuth();

    const authFetch = createAuthenticatedFetch(getAccessToken);

    return {
        // Sales API
        salesApi: {
            getProducts: async (category?: string) => {
                const url = category && category !== 'all'
                    ? `${API_BASE_URL}/api/products?category=${encodeURIComponent(category)}`
                    : `${API_BASE_URL}/api/products`;

                const response = await authFetch(url, { requireAuth: false });
                if (!response.ok) throw new Error('Failed to fetch products');
                return response.json();
            },

            getProduct: async (code: string) => {
                const response = await authFetch(`${API_BASE_URL}/api/products/${encodeURIComponent(code)}`, { requireAuth: false });
                if (!response.ok) throw new Error('Failed to fetch product');
                return response.json();
            },

            placeOrder: async (customerId: string, lines: { productCode: string; quantity: number }[]) => {
                const response = await authFetch(`${API_BASE_URL}/api/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customerId, lines }),
                    requireAuth: true,
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.errors?.join(', ') || 'Failed to place order');
                return data;
            },

            getCustomerOrders: async (customerId: string) => {
                const response = await authFetch(`${API_BASE_URL}/api/customers/${customerId}/orders`, { requireAuth: true });
                if (!response.ok) throw new Error('Failed to fetch orders');
                return response.json();
            },
        },

        // Invoicing API
        invoicingApi: {
            validateFiscalCode: async (fiscalCode: string) => {
                const response = await authFetch(`${INVOICING_API_URL}/api/fiscal-code/validate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fiscalCode }),
                    requireAuth: true,
                });
                return response.json();
            },

            generateInvoice: async (data: unknown) => {
                const response = await authFetch(`${INVOICING_API_URL}/api/invoices`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                    requireAuth: true,
                });
                return response.json();
            },

            getInvoices: async () => {
                const response = await authFetch(`${INVOICING_API_URL}/api/invoices`, { requireAuth: true });
                return response.json();
            },
        },

        // Shipping API
        shippingApi: {
            getCarriers: async () => {
                const response = await authFetch(`${SHIPPING_API_URL}/api/carriers`, { requireAuth: false });
                return response.json();
            },

            shipOrder: async (data: unknown) => {
                const response = await authFetch(`${SHIPPING_API_URL}/api/shipments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                    requireAuth: true,
                });
                return response.json();
            },
        },

        // Auth API
        authApi: {
            getCurrentUser: async () => {
                const response = await authFetch(`${API_BASE_URL}/api/auth/me`, { requireAuth: true });
                if (!response.ok) return null;
                return response.json();
            },

            validateToken: async () => {
                const response = await authFetch(`${API_BASE_URL}/api/auth/validate`, { requireAuth: true });
                return response.json();
            },
        },

        isAuthenticated,
        getAccessToken,
    };
}
