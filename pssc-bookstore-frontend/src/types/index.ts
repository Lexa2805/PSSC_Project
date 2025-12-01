export interface Product {
    code: string;
    name: string;
    description: string | null;
    category: string;
    author: string | null;
    price: number;
    stockQuantity: number;
}

export interface OrderLine {
    productCode: string;
    quantity: number;
}

export interface OrderLineResponse {
    productCode: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

export interface PlaceOrderRequest {
    customerId: string;
    lines: OrderLine[];
}

export interface PlaceOrderResponse {
    orderId: string;
    orderNumber: string;
    customerId: string;
    totalAmount: number;
    currency: string;
    placedAt: string;
    lines: OrderLineResponse[];
}

export interface ErrorResponse {
    orderId: string;
    errors: string[];
}

export interface CartItem extends Product {
    quantity: number;
}

// Order type for order history
export interface Order {
    id: string;
    orderId: string;
    orderNumber: string;
    customerId: string;
    totalAmount: number;
    totalPrice: number;
    currency: string;
    placedAt: string;
    status: string;
    lines: OrderLineResponse[];
}

// Shipping constants
export const FREE_SHIPPING_THRESHOLD = 200; // Free shipping for orders over 200 lei
export const SHIPPING_COST = 15; // Standard shipping cost in lei
