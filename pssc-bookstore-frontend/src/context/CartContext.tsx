'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CartItem, Product } from '@/types';

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
        setItems(currentItems => {
            const existingItem = currentItems.find(item => item.code === product.code);

            if (existingItem) {
                return currentItems.map(item =>
                    item.code === product.code
                        ? { ...item, quantity: Math.min(item.quantity + 1, item.stockQuantity) }
                        : item
                );
            }

            return [...currentItems, { ...product, quantity: 1 }];
        });
    }, []);

    const removeFromCart = useCallback((productCode: string) => {
        setItems(currentItems => currentItems.filter(item => item.code !== productCode));
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
        setItems([]);
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
