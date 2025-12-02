import { Product, ValidateFiscalCodeResponse, GenerateInvoiceRequest, GenerateInvoiceResponse, GenerateInvoiceErrorResponse, InvoiceDto, InvoicesListResponse, Carrier, ShipOrderRequest, ShipmentResponse, ShipmentErrorResponse, TrackingResponse, ValidateAddressRequest, ValidateAddressResponse, CalculateShippingRequest, CalculateShippingResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5122';
const INVOICING_API_URL = process.env.NEXT_PUBLIC_INVOICING_API_URL || 'http://localhost:5109';
const SHIPPING_API_URL = process.env.NEXT_PUBLIC_SHIPPING_API_URL || 'http://localhost:5096';

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

// === Invoicing API ===

export async function validateFiscalCode(fiscalCode: string): Promise<ValidateFiscalCodeResponse> {
    const response = await fetch(`${INVOICING_API_URL}/api/fiscal-code/validate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fiscalCode }),
    });

    if (!response.ok) {
        throw new Error('Failed to validate fiscal code');
    }

    return response.json();
}

export async function generateInvoice(request: GenerateInvoiceRequest): Promise<GenerateInvoiceResponse | GenerateInvoiceErrorResponse> {
    const response = await fetch(`${INVOICING_API_URL}/api/invoices/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    const data = await response.json();
    
    if (!response.ok) {
        return data as GenerateInvoiceErrorResponse;
    }

    return data as GenerateInvoiceResponse;
}

// === Invoice Retrieval ===

export async function getInvoiceByOrderId(orderId: string): Promise<InvoiceDto | null> {
    try {
        const response = await fetch(`${INVOICING_API_URL}/api/invoices/by-order/${orderId}`, {
            cache: 'no-store',
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error('Failed to fetch invoice');
        }

        return response.json();
    } catch {
        return null;
    }
}

export async function getInvoiceByNumber(invoiceNumber: string): Promise<InvoiceDto | null> {
    try {
        const response = await fetch(`${INVOICING_API_URL}/api/invoices/${encodeURIComponent(invoiceNumber)}`, {
            cache: 'no-store',
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error('Failed to fetch invoice');
        }

        return response.json();
    } catch {
        return null;
    }
}

export async function getInvoicesByEmail(email: string): Promise<InvoiceDto[]> {
    try {
        const response = await fetch(`${INVOICING_API_URL}/api/invoices/by-email/${encodeURIComponent(email)}`, {
            cache: 'no-store',
        });

        if (!response.ok) {
            return [];
        }

        return response.json();
    } catch {
        return [];
    }
}

export async function getAllInvoices(skip = 0, take = 50): Promise<InvoicesListResponse> {
    const response = await fetch(`${INVOICING_API_URL}/api/invoices?skip=${skip}&take=${take}`, {
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch invoices');
    }

    return response.json();
}

// === Shipping API ===

export async function getCarriers(): Promise<Carrier[]> {
    const response = await fetch(`${SHIPPING_API_URL}/api/carriers`, {
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error('Failed to fetch carriers');
    }

    const data = await response.json();
    // API returns { value: Carrier[], Count: number }
    return data.value || data;
}

export async function shipOrder(request: ShipOrderRequest): Promise<ShipmentResponse | ShipmentErrorResponse> {
    const response = await fetch(`${SHIPPING_API_URL}/api/shipments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
        return data as ShipmentErrorResponse;
    }

    return data as ShipmentResponse;
}

export async function getShipmentByOrderId(orderId: string): Promise<ShipmentResponse | null> {
    try {
        const response = await fetch(`${SHIPPING_API_URL}/api/shipments/order/${orderId}`, {
            cache: 'no-store',
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error('Failed to fetch shipment');
        }

        return response.json();
    } catch {
        return null;
    }
}

export async function trackShipment(awbNumber: string): Promise<TrackingResponse | null> {
    try {
        const response = await fetch(`${SHIPPING_API_URL}/api/shipments/track/${encodeURIComponent(awbNumber)}`, {
            cache: 'no-store',
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error('Failed to track shipment');
        }

        return response.json();
    } catch {
        return null;
    }
}

export async function getCustomerShipments(customerId: string): Promise<ShipmentResponse[]> {
    try {
        const response = await fetch(`${SHIPPING_API_URL}/api/customers/${customerId}/shipments`, {
            cache: 'no-store',
        });

        if (!response.ok) {
            return [];
        }

        return response.json();
    } catch {
        return [];
    }
}

export async function validateDeliveryAddress(request: ValidateAddressRequest): Promise<ValidateAddressResponse> {
    const response = await fetch(`${SHIPPING_API_URL}/api/address/validate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        throw new Error('Failed to validate address');
    }

    return response.json();
}

export async function calculateShipping(request: CalculateShippingRequest): Promise<CalculateShippingResponse> {
    const response = await fetch(`${SHIPPING_API_URL}/api/shipping/calculate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        throw new Error('Failed to calculate shipping');
    }

    return response.json();
}
