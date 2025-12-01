'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { placeOrder } from '@/lib/api';
import { PlaceOrderResponse, FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from '@/types';
import { getBookImage } from '@/lib/bookImages';
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
    Gift
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function CartDrawer() {
    const { items, removeFromCart, updateQuantity, clearCart, totalPrice, totalItems, isCartOpen, closeCart } = useCart();
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [orderResult, setOrderResult] = useState<PlaceOrderResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCheckout = async () => {
        if (items.length === 0) return;

        setIsCheckingOut(true);
        setError(null);

        try {
            const result = await placeOrder(
                'customer-web-' + Date.now(),
                items.map(item => ({
                    productCode: item.code,
                    quantity: item.quantity,
                }))
            );

            setOrderResult(result);
            clearCart();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to place order');
        } finally {
            setIsCheckingOut(false);
        }
    };

    const handleClose = () => {
        setOrderResult(null);
        setError(null);
        closeCart();
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
                    {orderResult ? (
                        /* Order Success */
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Comandă Plasată!</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">Mulțumim pentru achiziție</p>
                            <div className="bg-[#fdf5f7] dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm">
                                <div className="flex justify-between mb-2">
                                    <span className="text-gray-500 dark:text-gray-400">Număr Comandă</span>
                                    <span className="font-mono font-bold text-[#d4849a]">{orderResult.orderNumber}</span>
                                </div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-gray-500">Total Amount</span>
                                    <span className="font-bold">{orderResult.totalAmount.toFixed(2)} {orderResult.currency}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Items</span>
                                    <span>{orderResult.lines.reduce((sum, l) => sum + l.quantity, 0)}</span>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors"
                            >
                                Continue Shopping
                            </button>
                        </div>
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
                {items.length > 0 && !orderResult && (
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

                                    {/* Checkout button */}
                                    <button
                                        onClick={handleCheckout}
                                        disabled={isCheckingOut}
                                        className="w-full py-4 bg-gradient-to-r from-[#f3c9d5] to-[#e8b4c4] dark:from-gray-600 dark:to-gray-500 text-gray-800 dark:text-white rounded-xl font-bold text-lg hover:from-[#e8b4c4] hover:to-[#d4849a] dark:hover:from-gray-500 dark:hover:to-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isCheckingOut ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Se procesează...
                                            </>
                                        ) : (
                                            <>
                                                <CreditCard className="w-5 h-5" />
                                                Finalizează comanda • {finalTotal.toFixed(2)} lei
                                            </>
                                        )}
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
