'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CartItem, Product } from '@/types';
import toast from 'react-hot-toast';

interface CartContextType {
    items: CartItem[];
    addToCart: (product: Product) => void;
    removeFromCart: (productCode: string) => void;
    updateQuantity: (productCode: string, quantity: number) => void;
    clearCart: () => void;
    totalItems: number;
    totalPrice: number;
    isCartOpen: boolean;
    openCart: () => void;
    closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    const openCart = useCallback(() => setIsCartOpen(true), []);
    const closeCart = useCallback(() => setIsCartOpen(false), []);

    const addToCart = useCallback((product: Product) => {
        let toastMessage: { type: 'success' | 'error'; message: string } | null = null;

        setItems(currentItems => {
            const existingItem = currentItems.find(item => item.code === product.code);

            if (existingItem) {
                if (existingItem.quantity >= existingItem.stockQuantity) {
                    toastMessage = { type: 'error', message: `Stoc maxim atins pentru "${product.name}"` };
                    return currentItems;
                }
                toastMessage = { type: 'success', message: `"${product.name}" - cantitate actualizată` };
                return currentItems.map(item =>
                    item.code === product.code
                        ? { ...item, quantity: Math.min(item.quantity + 1, item.stockQuantity) }
                        : item
                );
            }

            toastMessage = { type: 'success', message: `"${product.name}" adăugat în coș` };
            return [...currentItems, { ...product, quantity: 1 }];
        });

        // Show toast after state update
        setTimeout(() => {
            if (toastMessage) {
                if (toastMessage.type === 'error') {
                    toast.error(toastMessage.message);
                } else {
                    toast.success(toastMessage.message, { icon: '🛒' });
                }
            }
        }, 0);
    }, []);

    const removeFromCart = useCallback((productCode: string) => {
        let itemName: string | null = null;

        setItems(currentItems => {
            const item = currentItems.find(i => i.code === productCode);
            if (item) {
                itemName = item.name;
            }
            return currentItems.filter(i => i.code !== productCode);
        });

        // Show toast after state update
        setTimeout(() => {
            if (itemName) {
                toast.success(`"${itemName}" eliminat din coș`, { icon: '🗑️' });
            }
        }, 0);
    }, []);

    const updateQuantity = useCallback((productCode: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(productCode);
            return;
        }

        setItems(currentItems =>
            currentItems.map(item =>
                item.code === productCode
                    ? { ...item, quantity: Math.min(quantity, item.stockQuantity) }
                    : item
            )
        );
    }, [removeFromCart]);

    const clearCart = useCallback(() => {
        let hadItems = false;

        setItems(currentItems => {
            hadItems = currentItems.length > 0;
            return [];
        });

        // Show toast after state update
        setTimeout(() => {
            if (hadItems) {
                toast.success('Coșul a fost golit', { icon: '🧹' });
            }
        }, 0);
    }, []);

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <CartContext.Provider value={{
            items,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            totalItems,
            totalPrice,
            isCartOpen,
            openCart,
            closeCart,
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
