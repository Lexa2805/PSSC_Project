'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { placeOrder, generateInvoice, shipOrder } from '@/lib/api';
import { PlaceOrderResponse, GenerateInvoiceResponse, CheckoutFormData, ShippingFormData, ShipmentResponse, FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from '@/types';
import { getBookImage } from '@/lib/bookImages';
import { CheckoutForm } from './CheckoutForm';
import { ShippingForm } from './ShippingForm';
import toast from 'react-hot-toast';
import {
    ShoppingCart,
    X,
    Plus,
    Minus,
    Trash2,
    CreditCard,
    CheckCircle,
    Loader2,
    ShoppingBag,
    Truck,
    Gift,
    FileText,
    ArrowRight,
    Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

type CheckoutStep = 'cart' | 'shipping' | 'billing' | 'success';

export function CartDrawer() {
    const { items, removeFromCart, updateQuantity, clearCart, totalPrice, totalItems, isCartOpen, closeCart } = useCart();
    const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('cart');
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [orderResult, setOrderResult] = useState<PlaceOrderResponse | null>(null);
    const [invoiceResult, setInvoiceResult] = useState<GenerateInvoiceResponse | null>(null);
    const [shipmentResult, setShipmentResult] = useState<ShipmentResponse | null>(null);
    const [shippingData, setShippingData] = useState<ShippingFormData | null>(null);
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Proceed to shipping form
    const handleProceedToShipping = () => {
        if (items.length === 0) return;
        setError(null);
        setCheckoutStep('shipping');
    };

    // Handle shipping form submission
    const handleShippingSubmit = (data: ShippingFormData) => {
        setShippingData(data);
        setCheckoutStep('billing');
    };

    // Handle back from billing to shipping
    const handleBackToShipping = () => {
        setCheckoutStep('shipping');
        setError(null);
    };

    // Handle full checkout with invoice generation
    const handleCheckoutWithInvoice = async (billingData: CheckoutFormData) => {
        if (items.length === 0 || !shippingData) return;

        setIsCheckingOut(true);
        setError(null);

        try {
            // Step 1: Place the order
            const newCustomerId = 'customer-web-' + Date.now();
            setCustomerId(newCustomerId);
            
            // Save customer ID to localStorage for orders page
            localStorage.setItem('lastCustomerId', newCustomerId);
            
            const orderData = await placeOrder(
                newCustomerId,
                items.map(item => ({
                    productCode: item.code,
                    quantity: item.quantity,
                }))
            );

            setOrderResult(orderData);
            toast.success(`Comanda #${orderData.orderNumber} a fost plasată!`, {
                icon: '📦',
                duration: 4000,
            });

            // Step 2: Generate invoice
            const invoiceRequest = {
                orderId: orderData.orderId,
                orderNumber: orderData.orderNumber,
                fiscalCode: billingData.isCompany ? billingData.fiscalCode : undefined,
                clientName: billingData.clientName,
                billingAddress: billingData.billingAddress,
                orderTotal: orderData.totalAmount,
                currency: orderData.currency || 'RON',
                orderLines: orderData.lines.map((line: { productCode: string; quantity: number; unitPrice: number; lineTotal: number }) => ({
                    productCode: line.productCode,
                    productName: items.find(i => i.code === line.productCode)?.name || line.productCode,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                    lineTotal: line.lineTotal,
                })),
                email: billingData.email,
            };

            const invoiceData = await generateInvoice(invoiceRequest);

            if ('success' in invoiceData && invoiceData.success) {
                const successResult = invoiceData as GenerateInvoiceResponse;
                setInvoiceResult(successResult);
                toast.success(`Factură ${successResult.invoiceNumber} generată cu succes!`, {
                    icon: '📄',
                    duration: 4000,
                });
                if (successResult.emailSentTo) {
                    toast.success(`Factura a fost trimisă la ${successResult.emailSentTo}`, {
                        icon: '📧',
                        duration: 5000,
                    });
                }
            } else if ('errors' in invoiceData) {
                // Invoice generation failed but order was placed
                toast.error('Factura nu a putut fi generată');
                setError(`Comanda a fost plasată dar factura nu a putut fi generată: ${invoiceData.errors.join(', ')}`);
            }

            // Step 3: Create shipment
            const deliveryAddress = `${shippingData.street}, ${shippingData.city}, ${shippingData.zipCode}`;
            const shipmentRequest = {
                orderId: orderData.orderId,
                orderNumber: orderData.orderNumber,
                customerId: newCustomerId,
                customerName: billingData.clientName,
                deliveryAddress: deliveryAddress,
                contactPhone: shippingData.contactPhone,
                preferredCarrierCode: shippingData.preferredCarrierCode,
                orderLines: orderData.lines.map((line: { productCode: string; quantity: number }) => ({
                    productCode: line.productCode,
                    productName: items.find(i => i.code === line.productCode)?.name || line.productCode,
                    quantity: line.quantity,
                    weight: 0.5, // Default weight per book
                })),
            };

            const shipmentData = await shipOrder(shipmentRequest);

            if ('success' in shipmentData && shipmentData.success) {
                const successShipment = shipmentData as ShipmentResponse;
                setShipmentResult(successShipment);
                toast.success(`Expediere inițiată! AWB: ${successShipment.awbNumber}`, {
                    icon: '🚚',
                    duration: 5000,
                });
            } else if ('errors' in shipmentData) {
                toast.error('Expedierea nu a putut fi inițiată');
                console.error('Shipment errors:', shipmentData.errors);
            }

            clearCart();
            setCheckoutStep('success');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'A apărut o eroare la plasarea comenzii';
            toast.error(errorMessage);
            setError(errorMessage);
        } finally {
            setIsCheckingOut(false);
        }
    };

    const handleClose = () => {
        setOrderResult(null);
        setInvoiceResult(null);
        setShipmentResult(null);
        setShippingData(null);
        setCustomerId(null);
        setError(null);
        setCheckoutStep('cart');
        closeCart();
    };

    const handleBackToCart = () => {
        setCheckoutStep('cart');
        setError(null);
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
                    isCartOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={handleClose}
            />

            {/* Drawer */}
            <div
                className={cn(
                    "fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col",
                    isCartOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#f8d7e0] dark:border-gray-700 bg-gradient-to-r from-[#fdf5f7] to-[#fce4ec] dark:from-gray-800 dark:to-gray-800 text-gray-800 dark:text-white">
                    <div className="flex items-center gap-3">
                        <ShoppingCart className="w-6 h-6" />
                        <h2 className="text-xl font-bold">Coșul Tău</h2>
                        {totalItems > 0 && (
                            <span className="bg-[#f3c9d5]/50 dark:bg-white/20 px-2.5 py-0.5 rounded-full text-sm font-medium">
                                {totalItems} produse
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-[#f3c9d5]/50 dark:hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
                    {checkoutStep === 'success' ? (
                        /* Order & Invoice Success */
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Comandă Plasată!</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">Mulțumim pentru achiziție</p>
                            
                            {/* Order Details */}
                            {orderResult && (
                                <div className="bg-[#fdf5f7] dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm mb-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <ShoppingBag className="w-5 h-5 text-[#d4849a]" />
                                        <span className="font-semibold text-gray-800 dark:text-white">Detalii Comandă</span>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Număr Comandă</span>
                                            <span className="font-mono font-bold text-[#d4849a]">{orderResult.orderNumber}</span>
                                        </div>
                                        {customerId && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 dark:text-gray-400">ID Client</span>
                                                <span className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">{customerId}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Total Comandă</span>
                                            <span className="font-bold text-gray-800 dark:text-white">{orderResult.totalAmount.toFixed(2)} {orderResult.currency}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Produse</span>
                                            <span className="text-gray-700 dark:text-gray-300">{orderResult.lines.reduce((sum: number, l: { quantity: number }) => sum + l.quantity, 0)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Invoice Details */}
                            {invoiceResult && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 w-full max-w-sm mb-4 border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center gap-2 mb-3">
                                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <span className="font-semibold text-blue-800 dark:text-blue-300">Factură Generată</span>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-blue-600 dark:text-blue-400">Număr Factură</span>
                                            <span className="font-mono font-bold text-blue-800 dark:text-blue-300">{invoiceResult.invoiceNumber}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-blue-600 dark:text-blue-400">Client</span>
                                            <span className="text-blue-800 dark:text-blue-300">{invoiceResult.clientName}</span>
                                        </div>
                                        {invoiceResult.fiscalCode && (
                                            <div className="flex justify-between">
                                                <span className="text-blue-600 dark:text-blue-400">CUI</span>
                                                <span className="font-mono text-blue-800 dark:text-blue-300">{invoiceResult.fiscalCode}</span>
                                            </div>
                                        )}
                                        {!invoiceResult.isCompany && (
                                            <div className="flex justify-between">
                                                <span className="text-blue-600 dark:text-blue-400">Tip Client</span>
                                                <span className="text-blue-800 dark:text-blue-300">Persoană Fizică</span>
                                            </div>
                                        )}
                                        <div className="border-t border-blue-200 dark:border-blue-700 my-2 pt-2">
                                            <div className="flex justify-between">
                                                <span className="text-blue-600 dark:text-blue-400">Subtotal (fără TVA)</span>
                                                <span className="text-blue-800 dark:text-blue-300">{invoiceResult.netAmount.toFixed(2)} {invoiceResult.currency}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-blue-600 dark:text-blue-400">TVA ({(invoiceResult.vatRate * 100).toFixed(0)}%)</span>
                                                <span className="text-blue-800 dark:text-blue-300">{invoiceResult.vatAmount.toFixed(2)} {invoiceResult.currency}</span>
                                            </div>
                                            <div className="flex justify-between font-bold mt-1">
                                                <span className="text-blue-700 dark:text-blue-300">Total cu TVA</span>
                                                <span className="text-blue-800 dark:text-blue-200">{invoiceResult.totalAmount.toFixed(2)} {invoiceResult.currency}</span>
                                            </div>
                                        </div>
                                        <div className="text-xs text-blue-500 dark:text-blue-400 mt-2">
                                            Emis: {new Date(invoiceResult.issuedAt).toLocaleString('ro-RO')}
                                        </div>
                                        {invoiceResult.emailSentTo && (
                                            <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                                                <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Factură trimisă la: <span className="font-medium">{invoiceResult.emailSentTo}</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Shipment Details */}
                            {shipmentResult && (
                                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-6 w-full max-w-sm mb-4 border border-purple-200 dark:border-purple-800">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                        <span className="font-semibold text-purple-800 dark:text-purple-300">Expediere Inițiată</span>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-purple-600 dark:text-purple-400">AWB</span>
                                            <span className="font-mono font-bold text-purple-800 dark:text-purple-300">{shipmentResult.awbNumber}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-purple-600 dark:text-purple-400">Curier</span>
                                            <span className="text-purple-800 dark:text-purple-300">{shipmentResult.carrierName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-purple-600 dark:text-purple-400">Cost Livrare</span>
                                            <span className="text-purple-800 dark:text-purple-300">{shipmentResult.shippingCost.toFixed(2)} RON</span>
                                        </div>
                                        {shipmentResult.estimatedDeliveryDate && (
                                            <div className="flex justify-between">
                                                <span className="text-purple-600 dark:text-purple-400">Livrare Estimată</span>
                                                <span className="text-purple-800 dark:text-purple-300">{shipmentResult.estimatedDeliveryDate}</span>
                                            </div>
                                        )}
                                        <div className="border-t border-purple-200 dark:border-purple-700 my-2 pt-2">
                                            <p className="text-xs text-purple-600 dark:text-purple-400">Adresa de livrare:</p>
                                            <p className="text-purple-800 dark:text-purple-300">{shipmentResult.deliveryAddress}</p>
                                        </div>
                                        <div className="mt-3 p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                                            <p className="text-xs text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                                <Truck className="w-3 h-3" />
                                                Urmărește coletul cu AWB: <span className="font-mono font-medium">{shipmentResult.awbNumber}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Error message if invoice failed */}
                            {error && (
                                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg mb-4 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleClose}
                                className="mt-2 px-6 py-3 bg-gradient-to-r from-[#f3c9d5] to-[#e8b4c4] dark:from-gray-600 dark:to-gray-500 text-gray-800 dark:text-white rounded-full font-semibold hover:from-[#e8b4c4] hover:to-[#d4849a] dark:hover:from-gray-500 dark:hover:to-gray-400 transition-colors"
                            >
                                Continuă Cumpărăturile
                            </button>
                        </div>
                    ) : checkoutStep === 'shipping' ? (
                        /* Shipping Form */
                        <ShippingForm
                            onSubmit={handleShippingSubmit}
                            onBack={handleBackToCart}
                            isSubmitting={false}
                            totalWeight={items.reduce((sum, item) => sum + item.quantity * 0.5, 0)}
                        />
                    ) : checkoutStep === 'billing' ? (
                        /* Billing Form */
                        <CheckoutForm
                            onSubmit={handleCheckoutWithInvoice}
                            onBack={handleBackToShipping}
                            isSubmitting={isCheckingOut}
                        />
                    ) : items.length === 0 ? (
                        /* Empty Cart */
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                                <ShoppingBag className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h3>
                            <p className="text-gray-500 mb-6">Add some books to get started!</p>
                            <button
                                onClick={handleClose}
                                className="px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors"
                            >
                                Browse Books
                            </button>
                        </div>
                    ) : (
                        /* Cart Items */
                        <div className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                                    {error}
                                </div>
                            )}

                            {items.map((item) => {
                                const bookImage = getBookImage(item.code);
                                return (
                                    <div
                                        key={item.code}
                                        className="flex gap-4 p-4 bg-[#fdf5f7] dark:bg-gray-800 rounded-xl hover:bg-[#fce4ec] dark:hover:bg-gray-700 transition-colors"
                                    >
                                        {/* Book thumbnail */}
                                        <div className="w-16 h-20 rounded-lg flex-shrink-0 overflow-hidden relative">
                                            {bookImage ? (
                                                <Image
                                                    src={bookImage}
                                                    alt={item.name}
                                                    fill
                                                    className="object-cover"
                                                    sizes="64px"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-[#f3c9d5] to-[#e8b4c4] flex items-center justify-center">
                                                    <span className="text-white text-xs font-bold text-center px-1">
                                                        {item.name.split(' ')[0]}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Item details */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-gray-800 dark:text-white truncate">{item.name}</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{item.price.toFixed(2)} lei</p>

                                            {/* Quantity controls */}
                                            <div className="flex items-center gap-3 mt-2">
                                                <button
                                                    onClick={() => updateQuantity(item.code, item.quantity - 1)}
                                                    className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <span className="font-semibold w-8 text-center text-gray-800 dark:text-white">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.code, item.quantity + 1)}
                                                    disabled={item.quantity >= item.stockQuantity}
                                                    className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Price and remove */}
                                        <div className="flex flex-col items-end justify-between">
                                            <button
                                                onClick={() => removeFromCart(item.code)}
                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <span className="font-bold text-gray-800 dark:text-white">
                                                {(item.price * item.quantity).toFixed(2)} lei
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && checkoutStep === 'cart' && (
                    <div className="border-t border-[#f8d7e0] dark:border-gray-700 p-6 bg-[#fdf5f7] dark:bg-gray-800">
                        {/* Free Shipping Banner */}
                        {(() => {
                            const hasFreeShipping = totalPrice >= FREE_SHIPPING_THRESHOLD;
                            const amountToFreeShipping = FREE_SHIPPING_THRESHOLD - totalPrice;
                            const shippingCost = hasFreeShipping ? 0 : SHIPPING_COST;
                            const finalTotal = totalPrice + shippingCost;

                            return (
                                <>
                                    {hasFreeShipping ? (
                                        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl mb-4">
                                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                                <Gift className="w-5 h-5 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-green-800">Transport gratuit!</p>
                                                <p className="text-sm text-green-600">
                                                    Comanda ta depășește 200 lei
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                                            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                                <Truck className="w-5 h-5 text-amber-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-amber-800">
                                                    Mai adaugă {amountToFreeShipping.toFixed(2)} lei pentru transport gratuit
                                                </p>
                                                <div className="w-full bg-amber-200 rounded-full h-2 mt-1">
                                                    <div
                                                        className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                                                        style={{ width: `${Math.min(100, (totalPrice / FREE_SHIPPING_THRESHOLD) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Subtotal */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                            <span>Subtotal</span>
                                            <span>{totalPrice.toFixed(2)} lei</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                            <span>Transport</span>
                                            {hasFreeShipping ? (
                                                <span className="text-green-600 font-medium flex items-center gap-1">
                                                    <span className="line-through text-gray-400 mr-1">{SHIPPING_COST} lei</span>
                                                    GRATUIT
                                                </span>
                                            ) : (
                                                <span>{SHIPPING_COST.toFixed(2)} lei</span>
                                            )}
                                        </div>
                                        <div className="border-t border-[#f8d7e0] dark:border-gray-600 pt-2 flex justify-between">
                                            <span className="font-bold text-lg text-gray-800 dark:text-white">Total</span>
                                            <span className="font-bold text-xl text-[#d4849a]">{finalTotal.toFixed(2)} lei</span>
                                        </div>
                                    </div>

                                    {/* Error display */}
                                    {error && (
                                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                                            {error}
                                        </div>
                                    )}

                                    {/* Proceed to Shipping button */}
                                    <button
                                        onClick={handleProceedToShipping}
                                        disabled={isCheckingOut}
                                        className="w-full py-4 bg-gradient-to-r from-[#f3c9d5] to-[#e8b4c4] dark:from-gray-600 dark:to-gray-500 text-gray-800 dark:text-white rounded-xl font-bold text-lg hover:from-[#e8b4c4] hover:to-[#d4849a] dark:hover:from-gray-500 dark:hover:to-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <Truck className="w-5 h-5" />
                                        Continuă la Livrare
                                        <ArrowRight className="w-5 h-5" />
                                    </button>

                                    {/* Clear cart */}
                                    <button
                                        onClick={clearCart}
                                        className="w-full mt-3 py-2 text-gray-500 hover:text-red-500 transition-colors text-sm"
                                    >
                                        Golește coșul
                                    </button>
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>
        </>
    );
}
