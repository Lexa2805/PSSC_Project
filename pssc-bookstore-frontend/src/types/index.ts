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

// === Invoice Types ===

export interface ValidateFiscalCodeRequest {
    fiscalCode: string;
}

export interface ValidateFiscalCodeResponse {
    isValid: boolean;
    normalizedValue?: string;
    numericValue?: string;
    isVatPayer: boolean;
    error?: string;
}

export interface OrderLineInvoiceRequest {
    productCode: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

export interface GenerateInvoiceRequest {
    orderId: string;
    orderNumber: string;
    fiscalCode?: string; // Optional - null for individuals
    clientName: string;
    billingAddress: string;
    orderTotal: number;
    currency: string;
    orderLines: OrderLineInvoiceRequest[];
    email: string; // Required for invoice delivery
}

export interface GenerateInvoiceResponse {
    success: boolean;
    invoiceNumber: string;
    orderId: string;
    clientName: string;
    fiscalCode?: string; // Null for individuals
    isCompany: boolean; // True if FiscalCode was provided
    netAmount: number;
    vatAmount: number;
    vatRate: number;
    totalAmount: number;
    currency: string;
    issuedAt: string;
    billingAddress: string;
    emailSentTo?: string; // Email where invoice was sent
}

export interface GenerateInvoiceErrorResponse {
    success: boolean;
    orderId: string;
    errors: string[];
}

// Checkout form data
export interface CheckoutFormData {
    clientName: string;
    fiscalCode?: string; // Optional - for companies only
    isCompany: boolean;
    billingAddress: string;
    email: string; // Required
}

// === Invoice Retrieval Types ===

export interface InvoiceLineDto {
    productCode: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

export interface InvoiceDto {
    id: string;
    invoiceNumber: string;
    orderId: string;
    orderNumber: string;
    clientName: string;
    fiscalCode?: string;
    isCompany: boolean;
    billingAddress: string;
    email?: string;
    netAmount: number;
    vatAmount: number;
    vatRate: number;
    totalAmount: number;
    currency: string;
    issuedAt: string;
    createdAt: string;
    lines: InvoiceLineDto[];
}

export interface InvoicesListResponse {
    total: number;
    skip: number;
    take: number;
    items: InvoiceDto[];
}
