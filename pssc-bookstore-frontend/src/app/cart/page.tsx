"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { placeOrder, generateInvoice } from "@/lib/api";
import { PlaceOrderResponse, GenerateInvoiceResponse, CheckoutFormData, FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from "@/types";
import { getBookImage } from "@/lib/bookImages";
import { CheckoutForm } from "@/components/CheckoutForm";
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
    Mail
} from "lucide-react";

type CheckoutStep = "cart" | "billing" | "success";

export default function CartPage() {
    const { items, removeFromCart, updateQuantity, clearCart, totalPrice, totalItems } = useCart();
    const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("cart");
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [orderResult, setOrderResult] = useState<PlaceOrderResponse | null>(null);
    const [invoiceResult, setInvoiceResult] = useState<GenerateInvoiceResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const hasFreeShipping = totalPrice >= FREE_SHIPPING_THRESHOLD;
    const amountToFreeShipping = FREE_SHIPPING_THRESHOLD - totalPrice;
    const shippingCost = hasFreeShipping ? 0 : SHIPPING_COST;
    const finalTotal = totalPrice + shippingCost;

    const handleProceedToBilling = () => {
        if (items.length === 0) return;
        setError(null);
        toast.success('Continuăm cu datele de facturare', {
            icon: '📝',
        });
        setCheckoutStep("billing");
    };

    const handleCheckoutWithInvoice = async (billingData: CheckoutFormData) => {
        if (items.length === 0) return;

        setIsCheckingOut(true);
        setError(null);

        try {
            const customerId = "customer-web-" + Date.now();
            const orderData = await placeOrder(
                customerId,
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
                clearCart();
                setCheckoutStep("success");
            } else if ("errors" in invoiceData) {
                toast.error('Factura nu a putut fi generată');
                setError(`Comanda a fost plasată dar factura nu a putut fi generată: ${invoiceData.errors.join(", ")}`);
                clearCart();
                setCheckoutStep("success");
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "A apărut o eroare la plasarea comenzii";
            toast.error(errorMessage);
            setError(errorMessage);
        } finally {
            setIsCheckingOut(false);
        }
    };

    const handleBackToCart = () => {
        setCheckoutStep("cart");
        setError(null);
    };

    const handleNewOrder = () => {
        setOrderResult(null);
        setInvoiceResult(null);
        setError(null);
        setCheckoutStep("cart");
    };

    return (
        <div className="min-h-screen bg-[#fdf5f7] dark:bg-gray-900 transition-colors duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#fce4ec] via-[#f8d7e0] to-[#f3c9d5] dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4 mb-4">
                        <Link
                            href="/books"
                            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span>Înapoi la cărți</span>
                        </Link>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white flex items-center gap-4">
                        <ShoppingCart className="w-10 h-10" />
                        {checkoutStep === "success" ? "Comandă Finalizată" : checkoutStep === "billing" ? "Finalizare Comandă" : "Coșul Tău"}
                    </h1>
                    {checkoutStep === "cart" && totalItems > 0 && (
                        <p className="text-xl text-gray-600 dark:text-gray-300 mt-2">
                            {totalItems} {totalItems === 1 ? "produs" : "produse"} în coș
                        </p>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {checkoutStep === "success" ? (
                    /* Success View */
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
                            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Mulțumim pentru comandă!</h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-8">Comanda ta a fost plasată cu succes</p>

                            {/* Order Details */}
                            {orderResult && (
                                <div className="bg-[#fdf5f7] dark:bg-gray-700 rounded-xl p-6 mb-6 text-left">
                                    <div className="flex items-center gap-2 mb-4">
                                        <ShoppingBag className="w-5 h-5 text-[#d4849a]" />
                                        <span className="font-semibold text-gray-800 dark:text-white">Detalii Comandă</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">Număr Comandă</span>
                                            <p className="font-mono font-bold text-[#d4849a]">{orderResult.orderNumber}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">Total</span>
                                            <p className="font-bold text-gray-800 dark:text-white">{orderResult.totalAmount.toFixed(2)} {orderResult.currency}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">Produse</span>
                                            <p className="text-gray-700 dark:text-gray-300">{orderResult.lines.reduce((sum: number, l: { quantity: number }) => sum + l.quantity, 0)}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">Data</span>
                                            <p className="text-gray-700 dark:text-gray-300">{new Date(orderResult.placedAt).toLocaleString("ro-RO")}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Invoice Details */}
                            {invoiceResult && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-6 text-left border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center gap-2 mb-4">
                                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <span className="font-semibold text-blue-800 dark:text-blue-300">Factură Fiscală</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                        <div>
                                            <span className="text-blue-600 dark:text-blue-400">Număr Factură</span>
                                            <p className="font-mono font-bold text-blue-800 dark:text-blue-300">{invoiceResult.invoiceNumber}</p>
                                        </div>
                                        <div>
                                            <span className="text-blue-600 dark:text-blue-400">Client</span>
                                            <p className="text-blue-800 dark:text-blue-300">{invoiceResult.clientName}</p>
                                        </div>
                                        {invoiceResult.fiscalCode && (
                                            <div>
                                                <span className="text-blue-600 dark:text-blue-400">CUI</span>
                                                <p className="font-mono text-blue-800 dark:text-blue-300">{invoiceResult.fiscalCode}</p>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-blue-600 dark:text-blue-400">Tip Client</span>
                                            <p className="text-blue-800 dark:text-blue-300">{invoiceResult.isCompany ? "Companie" : "Persoană Fizică"}</p>
                                        </div>
                                    </div>
                                    <div className="border-t border-blue-200 dark:border-blue-700 pt-4 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-blue-600 dark:text-blue-400">Subtotal (fără TVA)</span>
                                            <span className="text-blue-800 dark:text-blue-300">{invoiceResult.netAmount.toFixed(2)} {invoiceResult.currency}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-blue-600 dark:text-blue-400">TVA ({(invoiceResult.vatRate * 100).toFixed(0)}%)</span>
                                            <span className="text-blue-800 dark:text-blue-300">{invoiceResult.vatAmount.toFixed(2)} {invoiceResult.currency}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-lg pt-2 border-t border-blue-200 dark:border-blue-700">
                                            <span className="text-blue-700 dark:text-blue-300">TOTAL</span>
                                            <span className="text-blue-800 dark:text-blue-200">{invoiceResult.totalAmount.toFixed(2)} {invoiceResult.currency}</span>
                                        </div>
                                    </div>
                                    {invoiceResult.emailSentTo && (
                                        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                                            <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                                                <Mail className="w-4 h-4" />
                                                Factura a fost trimisă la: <span className="font-medium">{invoiceResult.emailSentTo}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {error && (
                                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg mb-6 text-left">
                                    {error}
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link
                                    href="/books"
                                    className="flex-1 py-4 bg-gradient-to-r from-[#f3c9d5] to-[#e8b4c4] text-gray-800 rounded-xl font-bold text-lg hover:from-[#e8b4c4] hover:to-[#d4849a] transition-all flex items-center justify-center gap-2"
                                >
                                    Continuă Cumpărăturile
                                </Link>
                                <Link
                                    href="/orders"
                                    className="flex-1 py-4 border-2 border-[#d4849a] text-[#d4849a] rounded-xl font-bold text-lg hover:bg-[#fdf5f7] transition-all flex items-center justify-center gap-2"
                                >
                                    Vezi Comenzile Mele
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : checkoutStep === "billing" ? (
                    /* Billing Form */
                    <div className="max-w-lg mx-auto">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                            <CheckoutForm
                                onSubmit={handleCheckoutWithInvoice}
                                onBack={handleBackToCart}
                                isSubmitting={isCheckingOut}
                            />
                        </div>
                    </div>
                ) : items.length === 0 ? (
                    /* Empty Cart */
                    <div className="max-w-md mx-auto text-center py-16">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ShoppingBag className="w-12 h-12 text-gray-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Coșul tău este gol</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-8">Adaugă câteva cărți pentru a începe!</p>
                        <Link
                            href="/books"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#f3c9d5] to-[#e8b4c4] text-gray-800 rounded-xl font-bold text-lg hover:from-[#e8b4c4] hover:to-[#d4849a] transition-all"
                        >
                            <ShoppingBag className="w-5 h-5" />
                            Explorează Cărțile
                        </Link>
                    </div>
                ) : (
                    /* Cart Content */
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Cart Items */}
                        <div className="lg:col-span-2 space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                                    {error}
                                </div>
                            )}

                            {items.map((item) => {
                                const bookImage = getBookImage(item.code);
                                return (
                                    <div
                                        key={item.code}
                                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 flex gap-6 hover:shadow-md transition-shadow"
                                    >
                                        {/* Book Image */}
                                        <div className="w-24 h-32 rounded-xl flex-shrink-0 overflow-hidden relative">
                                            {bookImage ? (
                                                <Image
                                                    src={bookImage}
                                                    alt={item.name}
                                                    fill
                                                    className="object-cover"
                                                    sizes="96px"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-[#f3c9d5] to-[#e8b4c4] flex items-center justify-center">
                                                    <span className="text-white text-sm font-bold text-center px-2">
                                                        {item.name.split(" ")[0]}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Item Details */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-1">{item.name}</h3>
                                            {item.author && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{item.author}</p>
                                            )}
                                            <p className="text-[#d4849a] font-bold text-lg">{item.price.toFixed(2)} lei</p>

                                            {/* Quantity Controls */}
                                            <div className="flex items-center gap-4 mt-4">
                                                <div className="flex items-center gap-3 bg-[#fdf5f7] dark:bg-gray-700 rounded-xl p-1">
                                                    <button
                                                        onClick={() => updateQuantity(item.code, item.quantity - 1)}
                                                        className="w-10 h-10 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <span className="font-bold w-8 text-center text-gray-800 dark:text-white">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.code, item.quantity + 1)}
                                                        disabled={item.quantity >= item.stockQuantity}
                                                        className="w-10 h-10 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.code)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Line Total */}
                                        <div className="text-right">
                                            <p className="font-bold text-xl text-gray-800 dark:text-white">
                                                {(item.price * item.quantity).toFixed(2)} lei
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Clear Cart Button */}
                            <button
                                onClick={clearCart}
                                className="text-gray-500 hover:text-red-500 transition-colors text-sm flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Golește coșul
                            </button>
                        </div>

                        {/* Order Summary */}
                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 sticky top-6">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Sumar Comandă</h3>

                                {/* Free Shipping Banner */}
                                {hasFreeShipping ? (
                                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl mb-6">
                                        <Gift className="w-6 h-6 text-green-600" />
                                        <div>
                                            <p className="font-semibold text-green-800 dark:text-green-300">Transport gratuit!</p>
                                            <p className="text-sm text-green-600 dark:text-green-400">Comanda ta depășește 200 lei</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl mb-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Truck className="w-6 h-6 text-amber-600" />
                                            <p className="font-semibold text-amber-800 dark:text-amber-300">
                                                Mai adaugă {amountToFreeShipping.toFixed(2)} lei
                                            </p>
                                        </div>
                                        <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">pentru transport gratuit</p>
                                        <div className="w-full bg-amber-200 dark:bg-amber-800 rounded-full h-2">
                                            <div
                                                className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${Math.min(100, (totalPrice / FREE_SHIPPING_THRESHOLD) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Price Breakdown */}
                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                        <span>Subtotal ({totalItems} produse)</span>
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
                                    <div className="border-t border-[#f8d7e0] dark:border-gray-600 pt-3 flex justify-between">
                                        <span className="font-bold text-lg text-gray-800 dark:text-white">Total</span>
                                        <span className="font-bold text-2xl text-[#d4849a]">{finalTotal.toFixed(2)} lei</span>
                                    </div>
                                </div>

                                {/* Checkout Button */}
                                <button
                                    onClick={handleProceedToBilling}
                                    className="w-full py-4 bg-gradient-to-r from-[#f3c9d5] to-[#e8b4c4] dark:from-gray-600 dark:to-gray-500 text-gray-800 dark:text-white rounded-xl font-bold text-lg hover:from-[#e8b4c4] hover:to-[#d4849a] dark:hover:from-gray-500 dark:hover:to-gray-400 transition-all flex items-center justify-center gap-2"
                                >
                                    Continuă cu Facturarea
                                    <ArrowRight className="w-5 h-5" />
                                </button>

                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                                    Factura va fi trimisă automat pe email
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
