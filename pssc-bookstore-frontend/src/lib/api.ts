import { Product } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5122';

export async function getProducts(category?: string): Promise<Product[]> {
    const url = category && category !== 'all'
        ? `${API_BASE_URL}/api/products?category=${encodeURIComponent(category)}`
        : `${API_BASE_URL}/api/products`;

    const response = await fetch(url, {
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch products');
    }

    return response.json();
}

export async function getCategories(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/api/categories`, {
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch categories');
    }

    return response.json();
}

export async function placeOrder(customerId: string, lines: { productCode: string; quantity: number }[]) {
    const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            customerId,
            lines,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.errors?.join(', ') || 'Failed to place order');
    }

    return data;
}

export async function getProduct(code: string): Promise<Product> {
    const response = await fetch(`${API_BASE_URL}/api/products/${encodeURIComponent(code)}`, {
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch product');
    }

    return response.json();
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
    const response = await fetch(`${API_BASE_URL}/api/products?category=${encodeURIComponent(category)}`, {
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch products');
    }

    return response.json();
}

export async function getCustomerOrders(customerId: string) {
    const response = await fetch(`${API_BASE_URL}/api/customers/${customerId}/orders`, {
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch orders');
    }

    return response.json();
}
