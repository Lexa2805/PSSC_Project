"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { placeOrder, generateInvoice, shipOrder } from "@/lib/api";
import { PlaceOrderResponse, GenerateInvoiceResponse, CheckoutFormData, ShippingFormData, ShipmentResponse, FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from "@/types";
import { getBookImage } from "@/lib/bookImages";
import { CheckoutForm } from "@/components/CheckoutForm";
import { ShippingForm } from "@/components/ShippingForm";
import toast from "react-hot-toast";
import {
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    CheckCircle,
    ShoppingBag,
    Truck,
    Gift,
    FileText,
    ArrowRight,
    ArrowLeft,
    Mail,
    Package,
    Copy,
    User,
    Shield,
    CreditCard,
    Clock,
    Sparkles,
    Heart,
    Tag,
    ChevronRight,
    Check,
    Info
} from "lucide-react";

type CheckoutStep = "cart" | "shipping" | "billing" | "success";

// Animation wrapper component
const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => {
    const [isVisible, setIsVisible] = useState(false);
    
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);
    
    return (
        <div 
            className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${className}`}
        >
            {children}
        </div>
    );
};

export default function CartPage() {
    const { items, removeFromCart, updateQuantity, clearCart, totalPrice, totalItems } = useCart();
    const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("cart");
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [orderResult, setOrderResult] = useState<PlaceOrderResponse | null>(null);
    const [invoiceResult, setInvoiceResult] = useState<GenerateInvoiceResponse | null>(null);
    const [shipmentResult, setShipmentResult] = useState<ShipmentResponse | null>(null);
    const [shippingData, setShippingData] = useState<ShippingFormData | null>(null);
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const hasFreeShipping = totalPrice >= FREE_SHIPPING_THRESHOLD;
    const amountToFreeShipping = FREE_SHIPPING_THRESHOLD - totalPrice;
    const shippingCost = hasFreeShipping ? 0 : SHIPPING_COST;
    const finalTotal = totalPrice + shippingCost;

    // Proceed to shipping form
    const handleProceedToShipping = () => {
        if (items.length === 0) return;
        setError(null);
        toast.success('Continuăm cu datele de livrare', {
            icon: '🚚',
        });
        setCheckoutStep("shipping");
    };

    // Handle shipping form submission
    const handleShippingSubmit = (data: ShippingFormData) => {
        setShippingData(data);
        toast.success('Date de livrare salvate', {
            icon: '✅',
        });
        setCheckoutStep("billing");
    };

    // Handle back from billing to shipping
    const handleBackToShipping = () => {
        setCheckoutStep("shipping");
        setError(null);
    };

    // Handle back from shipping to cart
    const handleBackToCart = () => {
        setCheckoutStep("cart");
        setError(null);
    };

    const handleCheckoutWithInvoice = async (billingData: CheckoutFormData) => {
        if (items.length === 0 || !shippingData) return;

        setIsCheckingOut(true);
        setError(null);

        try {
            // Step 1: Place the order
            const newCustomerId = "customer-web-" + Date.now();
            setCustomerId(newCustomerId);
            
            const orderData = await placeOrder(
                newCustomerId,
                items.map((item) => ({
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
                currency: orderData.currency || "RON",
                orderLines: orderData.lines.map((line: { productCode: string; quantity: number; unitPrice: number; lineTotal: number }) => ({
                    productCode: line.productCode,
                    productName: items.find((i) => i.code === line.productCode)?.name || line.productCode,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                    lineTotal: line.lineTotal,
                })),
                email: billingData.email,
            };

            const invoiceData = await generateInvoice(invoiceRequest);

            if ("success" in invoiceData && invoiceData.success) {
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
            } else if ("errors" in invoiceData) {
                toast.error('Factura nu a putut fi generată');
                setError(`Comanda a fost plasată dar factura nu a putut fi generată: ${invoiceData.errors.join(", ")}`);
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
            setCheckoutStep("success");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "A apărut o eroare la plasarea comenzii";
            toast.error(errorMessage);
            setError(errorMessage);
        } finally {
            setIsCheckingOut(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiat!`, { icon: '📋', duration: 2000 });
    };

    const handleNewOrder = () => {
        setOrderResult(null);
        setInvoiceResult(null);
        setShipmentResult(null);
        setShippingData(null);
        setCustomerId(null);
        setError(null);
        setCheckoutStep("cart");
    };

    const getStepTitle = () => {
        switch (checkoutStep) {
            case "success":
                return "Comandă Finalizată";
            case "billing":
                return "Date Facturare";
            case "shipping":
                return "Adresa de Livrare";
            default:
                return "Coșul Tău";
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#fdf5f7] via-white to-[#fdf5f7] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
            {/* Header with enhanced gradient */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#fce4ec] via-[#f8d7e0] to-[#f3c9d5] dark:from-gray-800 dark:via-gray-800 dark:to-gray-900" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <FadeIn>
                        <div className="flex items-center gap-4 mb-6">
                            <Link
                                href="/books"
                                className="group flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-[#d4849a] dark:hover:text-[#e8b4c4] transition-all duration-300"
                            >
                                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                <span className="font-medium">Înapoi la cărți</span>
                            </Link>
                        </div>
                    </FadeIn>
                    
                    <FadeIn delay={100}>
                        <div className="flex items-center gap-5 mb-4">
                            <div className="p-4 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-2xl shadow-lg">
                                <ShoppingCart className="w-10 h-10 text-[#d4849a]" />
                            </div>
                            <div>
                                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white">
                                    {getStepTitle()}
                                </h1>
                                {checkoutStep === "cart" && totalItems > 0 && (
                                    <p className="text-lg text-gray-600 dark:text-gray-300 mt-1 flex items-center gap-2">
                                        <span className="inline-flex items-center justify-center w-7 h-7 bg-[#d4849a] text-white rounded-full text-sm font-bold">
                                            {totalItems}
                                        </span>
                                        {totalItems === 1 ? "produs în coș" : "produse în coș"}
                                    </p>
                                )}
                            </div>
                        </div>
                    </FadeIn>
                    
                    {/* Enhanced Progress Steps */}
                    {checkoutStep !== "success" && items.length > 0 && (
                        <FadeIn delay={200}>
                            <div className="flex items-center gap-0 mt-8 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm p-2 rounded-2xl shadow-sm w-fit">
                                {[
                                    { step: "cart", icon: ShoppingCart, label: "Coș", number: 1 },
                                    { step: "shipping", icon: Truck, label: "Livrare", number: 2 },
                                    { step: "billing", icon: FileText, label: "Facturare", number: 3 },
                                ].map((item, index) => {
                                    const isActive = checkoutStep === item.step;
                                    const isPast = 
                                        (item.step === "cart" && (checkoutStep === "shipping" || checkoutStep === "billing")) ||
                                        (item.step === "shipping" && checkoutStep === "billing");
                                    const Icon = item.icon;
                                    
                                    return (
                                        <div key={item.step} className="flex items-center">
                                            <div 
                                                className={`flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-300
                                                    ${isActive 
                                                        ? "bg-gradient-to-r from-[#d4849a] to-[#e8b4c4] text-white shadow-lg scale-105" 
                                                        : isPast 
                                                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                                            : "text-gray-400 dark:text-gray-500"
                                                    }`}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                                                    ${isActive 
                                                        ? "bg-white/20" 
                                                        : isPast 
                                                            ? "bg-green-500 text-white"
                                                            : "bg-gray-200 dark:bg-gray-700"
                                                    }`}
                                                >
                                                    {isPast ? <Check className="w-4 h-4" /> : item.number}
                                                </div>
                                                <Icon className="w-4 h-4" />
                                                <span className="text-sm font-semibold hidden sm:inline">{item.label}</span>
                                            </div>
                                            {index < 2 && (
                                                <ChevronRight className={`w-5 h-5 mx-1 ${isPast ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}`} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </FadeIn>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {checkoutStep === "success" ? (
                    /* Success View - Enhanced */
                    <FadeIn>
                        <div className="max-w-3xl mx-auto">
                            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
                                {/* Success Header */}
                                <div className="relative bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 p-8 text-center">
                                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
                                    <div className="relative">
                                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl animate-bounce">
                                            <CheckCircle className="w-14 h-14 text-green-500" />
                                        </div>
                                        <h2 className="text-3xl font-bold text-white mb-2">Mulțumim pentru comandă!</h2>
                                        <p className="text-green-100 text-lg">Comanda ta a fost procesată cu succes</p>
                                    </div>
                                </div>

                                <div className="p-8 space-y-6">
                                    {/* Customer ID Card */}
                                    {customerId && (
                                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-2xl p-6">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-xl">
                                                    <User className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-amber-800 dark:text-amber-300">ID Client Important</h3>
                                                    <p className="text-sm text-amber-600 dark:text-amber-400">Salvează acest ID pentru a urmări comenzile</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 bg-white dark:bg-gray-700 p-4 rounded-xl border border-amber-200 dark:border-amber-700">
                                                <code className="font-mono text-lg flex-1 text-gray-800 dark:text-gray-200">
                                                    {customerId}
                                                </code>
                                                <button
                                                    onClick={() => copyToClipboard(customerId, "ID Client")}
                                                    className="p-3 bg-amber-100 dark:bg-amber-800 hover:bg-amber-200 dark:hover:bg-amber-700 rounded-xl transition-colors group"
                                                    title="Copiază ID-ul"
                                                >
                                                    <Copy className="w-5 h-5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Order Details Card */}
                                    {orderResult && (
                                        <div className="bg-gradient-to-br from-[#fdf5f7] to-[#fce4ec] dark:from-gray-700 dark:to-gray-700 rounded-2xl p-6 border border-[#f3c9d5] dark:border-gray-600">
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="p-2 bg-[#d4849a]/20 rounded-xl">
                                                    <ShoppingBag className="w-6 h-6 text-[#d4849a]" />
                                                </div>
                                                <h3 className="font-bold text-gray-800 dark:text-white text-lg">Detalii Comandă</h3>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="bg-white dark:bg-gray-600 p-4 rounded-xl text-center">
                                                    <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Număr</span>
                                                    <p className="font-mono font-bold text-[#d4849a] text-lg">{orderResult.orderNumber}</p>
                                                </div>
                                                <div className="bg-white dark:bg-gray-600 p-4 rounded-xl text-center">
                                                    <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Total</span>
                                                    <p className="font-bold text-gray-800 dark:text-white text-lg">{orderResult.totalAmount.toFixed(2)} {orderResult.currency}</p>
                                                </div>
                                                <div className="bg-white dark:bg-gray-600 p-4 rounded-xl text-center">
                                                    <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Produse</span>
                                                    <p className="font-bold text-gray-700 dark:text-gray-300 text-lg">{orderResult.lines.reduce((sum: number, l: { quantity: number }) => sum + l.quantity, 0)}</p>
                                                </div>
                                                <div className="bg-white dark:bg-gray-600 p-4 rounded-xl text-center">
                                                    <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Data</span>
                                                    <p className="font-bold text-gray-700 dark:text-gray-300 text-sm">{new Date(orderResult.placedAt).toLocaleDateString("ro-RO")}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Invoice Details Card */}
                                    {invoiceResult && (
                                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-xl">
                                                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <h3 className="font-bold text-blue-800 dark:text-blue-300 text-lg">Factură Fiscală</h3>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4 mb-5">
                                                <div className="bg-white dark:bg-gray-700 p-4 rounded-xl">
                                                    <span className="text-sm text-blue-600 dark:text-blue-400 block mb-1">Număr Factură</span>
                                                    <p className="font-mono font-bold text-blue-800 dark:text-blue-300">{invoiceResult.invoiceNumber}</p>
                                                </div>
                                                <div className="bg-white dark:bg-gray-700 p-4 rounded-xl">
                                                    <span className="text-sm text-blue-600 dark:text-blue-400 block mb-1">Client</span>
                                                    <p className="font-semibold text-blue-800 dark:text-blue-300">{invoiceResult.clientName}</p>
                                                </div>
                                                {invoiceResult.fiscalCode && (
                                                    <div className="bg-white dark:bg-gray-700 p-4 rounded-xl">
                                                        <span className="text-sm text-blue-600 dark:text-blue-400 block mb-1">CUI</span>
                                                        <p className="font-mono text-blue-800 dark:text-blue-300">{invoiceResult.fiscalCode}</p>
                                                    </div>
                                                )}
                                                <div className="bg-white dark:bg-gray-700 p-4 rounded-xl">
                                                    <span className="text-sm text-blue-600 dark:text-blue-400 block mb-1">Tip Client</span>
                                                    <p className="text-blue-800 dark:text-blue-300">{invoiceResult.isCompany ? "Companie" : "Persoană Fizică"}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-white dark:bg-gray-700 rounded-xl p-5">
                                                <div className="space-y-3">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-500">Subtotal (fără TVA)</span>
                                                        <span className="font-medium">{invoiceResult.netAmount.toFixed(2)} {invoiceResult.currency}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-500">TVA ({(invoiceResult.vatRate * 100).toFixed(0)}%)</span>
                                                        <span className="font-medium">{invoiceResult.vatAmount.toFixed(2)} {invoiceResult.currency}</span>
                                                    </div>
                                                    <div className="border-t pt-3 flex justify-between">
                                                        <span className="font-bold text-blue-700 dark:text-blue-300">TOTAL</span>
                                                        <span className="font-bold text-xl text-blue-800 dark:text-blue-200">{invoiceResult.totalAmount.toFixed(2)} {invoiceResult.currency}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {invoiceResult.emailSentTo && (
                                                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 rounded-xl border border-green-200 dark:border-green-700 flex items-center gap-3">
                                                    <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                                                        <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-green-700 dark:text-green-300">
                                                            Factura a fost trimisă la: <span className="font-semibold">{invoiceResult.emailSentTo}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Shipment Details Card */}
                                    {shipmentResult && (
                                        <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
                                            <div className="flex items-center gap-3 mb-5">
                                                <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-xl">
                                                    <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                                </div>
                                                <h3 className="font-bold text-purple-800 dark:text-purple-300 text-lg">Detalii Expediere</h3>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4 mb-5">
                                                <div className="bg-white dark:bg-gray-700 p-4 rounded-xl">
                                                    <span className="text-sm text-purple-600 dark:text-purple-400 block mb-1">AWB</span>
                                                    <p className="font-mono font-bold text-purple-800 dark:text-purple-300">{shipmentResult.awbNumber}</p>
                                                </div>
                                                <div className="bg-white dark:bg-gray-700 p-4 rounded-xl">
                                                    <span className="text-sm text-purple-600 dark:text-purple-400 block mb-1">Curier</span>
                                                    <p className="font-semibold text-purple-800 dark:text-purple-300">{shipmentResult.carrierName}</p>
                                                </div>
                                                <div className="bg-white dark:bg-gray-700 p-4 rounded-xl">
                                                    <span className="text-sm text-purple-600 dark:text-purple-400 block mb-1">Cost Transport</span>
                                                    <p className="font-bold text-purple-800 dark:text-purple-300">{shipmentResult.shippingCost.toFixed(2)} RON</p>
                                                </div>
                                                <div className="bg-white dark:bg-gray-700 p-4 rounded-xl">
                                                    <span className="text-sm text-purple-600 dark:text-purple-400 block mb-1">Greutate</span>
                                                    <p className="font-semibold text-purple-800 dark:text-purple-300">{shipmentResult.totalWeight.toFixed(2)} kg</p>
                                                </div>
                                            </div>
                                            
                                            {shipmentResult.estimatedDeliveryDate && (
                                                <div className="bg-white dark:bg-gray-700 p-4 rounded-xl mb-4 flex items-center gap-4">
                                                    <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-xl">
                                                        <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                                    </div>
                                                    <div>
                                                        <span className="text-sm text-purple-600 dark:text-purple-400 block">Livrare Estimată</span>
                                                        <p className="font-bold text-purple-800 dark:text-purple-300 text-lg">{shipmentResult.estimatedDeliveryDate}</p>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="bg-white dark:bg-gray-700 p-4 rounded-xl">
                                                <span className="text-sm text-purple-600 dark:text-purple-400 block mb-1">Adresa de Livrare</span>
                                                <p className="text-purple-800 dark:text-purple-300">{shipmentResult.deliveryAddress}</p>
                                            </div>
                                            
                                            <div className="mt-4 p-4 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center gap-3">
                                                <Truck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                                <p className="text-sm text-purple-700 dark:text-purple-300">
                                                    Urmărește coletul cu AWB: <span className="font-mono font-bold">{shipmentResult.awbNumber}</span>
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="bg-amber-50 border-2 border-amber-200 text-amber-700 px-5 py-4 rounded-xl flex items-start gap-3">
                                            <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                            <p>{error}</p>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                        <Link
                                            href="/books"
                                            className="flex-1 py-4 px-6 bg-gradient-to-r from-[#d4849a] to-[#e8b4c4] text-white rounded-xl font-bold text-lg hover:from-[#c27590] hover:to-[#d4849a] transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 group"
                                        >
                                            <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                            Continuă Cumpărăturile
                                        </Link>
                                        <Link
                                            href="/orders"
                                            className="flex-1 py-4 px-6 border-2 border-[#d4849a] text-[#d4849a] rounded-xl font-bold text-lg hover:bg-[#fdf5f7] dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-3"
                                        >
                                            <Package className="w-5 h-5" />
                                            Vezi Comenzile Mele
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                ) : checkoutStep === "shipping" ? (
                    /* Shipping Form - Enhanced */
                    <FadeIn>
                        <div className="max-w-xl mx-auto">
                            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
                                <ShippingForm
                                    onSubmit={handleShippingSubmit}
                                    onBack={handleBackToCart}
                                    isSubmitting={false}
                                    totalWeight={items.reduce((sum, item) => sum + item.quantity * 0.5, 0)}
                                />
                            </div>
                            
                            {/* Trust Badges */}
                            <div className="mt-6 flex justify-center gap-6">
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                    <Shield className="w-5 h-5 text-green-500" />
                                    <span className="text-sm">Livrare Sigură</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                    <Truck className="w-5 h-5 text-blue-500" />
                                    <span className="text-sm">Curieri de Încredere</span>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                ) : checkoutStep === "billing" ? (
                    /* Billing Form - Enhanced */
                    <FadeIn>
                        <div className="max-w-xl mx-auto">
                            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
                                <CheckoutForm
                                    onSubmit={handleCheckoutWithInvoice}
                                    onBack={handleBackToShipping}
                                    isSubmitting={isCheckingOut}
                                />
                            </div>
                            
                            {/* Trust Badges */}
                            <div className="mt-6 flex justify-center gap-6">
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                    <Shield className="w-5 h-5 text-green-500" />
                                    <span className="text-sm">Date Securizate</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                    <CreditCard className="w-5 h-5 text-blue-500" />
                                    <span className="text-sm">Plată Sigură</span>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                ) : items.length === 0 ? (
                    /* Empty Cart - Enhanced */
                    <FadeIn>
                        <div className="max-w-md mx-auto text-center py-16">
                            <div className="relative">
                                <div className="w-32 h-32 bg-gradient-to-br from-[#fce4ec] to-[#f3c9d5] rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
                                    <ShoppingBag className="w-16 h-16 text-[#d4849a]" />
                                </div>
                                <div className="absolute top-0 right-1/4 w-8 h-8 bg-[#f3c9d5] rounded-full animate-ping opacity-50" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-3">Coșul tău este gol</h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg">Descoperă colecția noastră de cărți și adaugă-le în coș!</p>
                            <Link
                                href="/books"
                                className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-[#d4849a] to-[#e8b4c4] text-white rounded-2xl font-bold text-lg hover:from-[#c27590] hover:to-[#d4849a] transition-all shadow-lg hover:shadow-xl hover:scale-105 group"
                            >
                                <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                                Explorează Cărțile
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            
                            {/* Benefits */}
                            <div className="mt-12 grid grid-cols-3 gap-4">
                                <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                                    <Truck className="w-8 h-8 text-[#d4849a] mx-auto mb-2" />
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Transport Rapid</p>
                                </div>
                                <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                                    <Shield className="w-8 h-8 text-[#d4849a] mx-auto mb-2" />
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Plată Sigură</p>
                                </div>
                                <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                                    <Heart className="w-8 h-8 text-[#d4849a] mx-auto mb-2" />
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Cărți de Calitate</p>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                ) : (
                    /* Cart Content - Enhanced */
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Cart Items */}
                        <div className="lg:col-span-2 space-y-4">
                            {error && (
                                <FadeIn>
                                    <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-2xl flex items-start gap-3">
                                        <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                        <p>{error}</p>
                                    </div>
                                </FadeIn>
                            )}

                            {/* Items Header */}
                            <FadeIn>
                                <div className="flex items-center justify-between px-2 mb-2">
                                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                        Produse ({totalItems})
                                    </h3>
                                    <button
                                        onClick={clearCart}
                                        className="text-gray-400 hover:text-red-500 transition-colors text-sm flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Golește coșul
                                    </button>
                                </div>
                            </FadeIn>

                            {items.map((item, index) => {
                                const bookImage = getBookImage(item.code);
                                return (
                                    <FadeIn key={item.code} delay={index * 100}>
                                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 group border border-transparent hover:border-[#f3c9d5] dark:hover:border-gray-600">
                                            <div className="flex gap-6">
                                                {/* Book Image */}
                                                <div className="relative">
                                                    <div className="w-28 h-36 rounded-xl flex-shrink-0 overflow-hidden relative shadow-md group-hover:shadow-lg transition-shadow">
                                                        {bookImage ? (
                                                            <Image
                                                                src={bookImage}
                                                                alt={item.name}
                                                                fill
                                                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                                sizes="112px"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-[#f3c9d5] to-[#e8b4c4] flex items-center justify-center">
                                                                <span className="text-white text-sm font-bold text-center px-2">
                                                                    {item.name.split(" ")[0]}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Quantity Badge */}
                                                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-[#d4849a] text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md">
                                                        {item.quantity}
                                                    </div>
                                                </div>

                                                {/* Item Details */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-1 line-clamp-2">
                                                                {item.name}
                                                            </h3>
                                                            {item.author && (
                                                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1">
                                                                    <User className="w-3 h-3" />
                                                                    {item.author}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => removeFromCart(item.code)}
                                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                            title="Șterge"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <Tag className="w-4 h-4 text-[#d4849a]" />
                                                        <p className="text-[#d4849a] font-bold text-xl">{item.price.toFixed(2)} lei</p>
                                                    </div>

                                                    {/* Quantity Controls */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1 bg-[#fdf5f7] dark:bg-gray-700 rounded-xl p-1">
                                                            <button
                                                                onClick={() => updateQuantity(item.code, item.quantity - 1)}
                                                                className="w-10 h-10 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
                                                            >
                                                                <Minus className="w-4 h-4" />
                                                            </button>
                                                            <span className="font-bold w-10 text-center text-gray-800 dark:text-white text-lg">
                                                                {item.quantity}
                                                            </span>
                                                            <button
                                                                onClick={() => updateQuantity(item.code, item.quantity + 1)}
                                                                disabled={item.quantity >= item.stockQuantity}
                                                                className="w-10 h-10 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                        
                                                        {/* Line Total */}
                                                        <div className="text-right">
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Subtotal</p>
                                                            <p className="font-bold text-xl text-gray-800 dark:text-white">
                                                                {(item.price * item.quantity).toFixed(2)} lei
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Stock Warning */}
                                                    {item.stockQuantity <= 5 && (
                                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-1">
                                                            <Info className="w-3 h-3" />
                                                            Doar {item.stockQuantity} în stoc
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </FadeIn>
                                );
                            })}
                        </div>

                        {/* Order Summary - Enhanced */}
                        <div className="lg:col-span-1">
                            <FadeIn delay={300}>
                                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 sticky top-6 border border-[#f3c9d5]/50 dark:border-gray-700">
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-[#d4849a]" />
                                        Sumar Comandă
                                    </h3>

                                    {/* Free Shipping Progress */}
                                    {hasFreeShipping ? (
                                        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700 rounded-2xl mb-6">
                                            <div className="p-2 bg-green-100 dark:bg-green-800 rounded-xl">
                                                <Gift className="w-6 h-6 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-green-800 dark:text-green-300">Transport gratuit! 🎉</p>
                                                <p className="text-sm text-green-600 dark:text-green-400">Comanda ta depășește {FREE_SHIPPING_THRESHOLD} lei</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-2xl mb-6">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-xl">
                                                    <Truck className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-amber-800 dark:text-amber-300">
                                                        Mai adaugă {amountToFreeShipping.toFixed(2)} lei
                                                    </p>
                                                    <p className="text-sm text-amber-600 dark:text-amber-400">pentru transport gratuit</p>
                                                </div>
                                            </div>
                                            <div className="relative w-full bg-amber-200/50 dark:bg-amber-800/50 rounded-full h-3 overflow-hidden">
                                                <div
                                                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.min(100, (totalPrice / FREE_SHIPPING_THRESHOLD) * 100)}%` }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Price Breakdown */}
                                    <div className="space-y-4 mb-6">
                                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                            <span>Subtotal ({totalItems} {totalItems === 1 ? 'produs' : 'produse'})</span>
                                            <span className="font-medium">{totalPrice.toFixed(2)} lei</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                            <span className="flex items-center gap-2">
                                                <Truck className="w-4 h-4" />
                                                Transport
                                            </span>
                                            {hasFreeShipping ? (
                                                <span className="text-green-600 font-semibold flex items-center gap-2">
                                                    <span className="line-through text-gray-400 text-sm">{SHIPPING_COST} lei</span>
                                                    <span className="bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded-full text-xs">GRATUIT</span>
                                                </span>
                                            ) : (
                                                <span className="font-medium">{SHIPPING_COST.toFixed(2)} lei</span>
                                            )}
                                        </div>
                                        <div className="border-t-2 border-dashed border-[#f8d7e0] dark:border-gray-600 pt-4 flex justify-between items-end">
                                            <span className="font-bold text-lg text-gray-800 dark:text-white">Total</span>
                                            <div className="text-right">
                                                <span className="font-bold text-3xl text-[#d4849a]">{finalTotal.toFixed(2)}</span>
                                                <span className="text-[#d4849a] ml-1 font-medium">lei</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Checkout Button */}
                                    <button
                                        onClick={handleProceedToShipping}
                                        className="w-full py-4 bg-gradient-to-r from-[#d4849a] to-[#e8b4c4] dark:from-gray-600 dark:to-gray-500 text-white rounded-2xl font-bold text-lg hover:from-[#c27590] hover:to-[#d4849a] dark:hover:from-gray-500 dark:hover:to-gray-400 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.02] group"
                                    >
                                        <Truck className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        Continuă la Livrare
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </button>

                                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                                        Vei alege adresa de livrare și curierul în pasul următor
                                    </p>

                                    {/* Trust Badges */}
                                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs">
                                                <Shield className="w-4 h-4 text-green-500" />
                                                <span>Plată Securizată</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs">
                                                <Truck className="w-4 h-4 text-blue-500" />
                                                <span>Livrare Rapidă</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs">
                                                <CreditCard className="w-4 h-4 text-purple-500" />
                                                <span>Facturare Fiscală</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs">
                                                <Gift className="w-4 h-4 text-pink-500" />
                                                <span>Transport Gratuit*</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </FadeIn>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
