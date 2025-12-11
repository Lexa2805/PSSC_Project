'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Product } from '@/types';
import toast from 'react-hot-toast';

interface FavoritesContextType {
    favorites: Product[];
    addToFavorites: (product: Product) => void;
    removeFromFavorites: (productCode: string) => void;
    isFavorite: (productCode: string) => boolean;
    toggleFavorite: (product: Product) => void;
    clearFavorites: () => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const FAVORITES_STORAGE_KEY = 'pssc-favorites';

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
    const [favorites, setFavorites] = useState<Product[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load favorites from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
            if (stored) {
                setFavorites(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Failed to load favorites:', error);
        }
        setIsLoaded(true);
    }, []);

    // Save favorites to localStorage when they change
    useEffect(() => {
        if (isLoaded) {
            try {
                localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
            } catch (error) {
                console.error('Failed to save favorites:', error);
            }
        }
    }, [favorites, isLoaded]);

    const addToFavorites = useCallback((product: Product) => {
        let wasAdded = false;

        setFavorites(current => {
            if (current.some(p => p.code === product.code)) {
                return current;
            }
            wasAdded = true;
            return [...current, product];
        });

        // Show toast after state update
        if (wasAdded) {
            setTimeout(() => {
                toast.success(`"${product.name}" adăugat la favorite`, { icon: '❤️' });
            }, 0);
        }
    }, []);

    const removeFromFavorites = useCallback((productCode: string) => {
        let productName: string | null = null;

        setFavorites(current => {
            const product = current.find(p => p.code === productCode);
            if (product) {
                productName = product.name;
            }
            return current.filter(p => p.code !== productCode);
        });

        // Show toast after state update
        if (productName) {
            setTimeout(() => {
                toast.success(`"${productName}" eliminat din favorite`, { icon: '💔' });
            }, 0);
        }
    }, []);

    const isFavorite = useCallback((productCode: string) => {
        return favorites.some(p => p.code === productCode);
    }, [favorites]);

    const toggleFavorite = useCallback((product: Product) => {
        if (isFavorite(product.code)) {
            removeFromFavorites(product.code);
        } else {
            addToFavorites(product);
        }
    }, [isFavorite, addToFavorites, removeFromFavorites]);

    const clearFavorites = useCallback(() => {
        setFavorites([]);
        toast.success('Toate favoritele au fost eliminate');
    }, []);

    return (
        <FavoritesContext.Provider value={{
            favorites,
            addToFavorites,
            removeFromFavorites,
            isFavorite,
            toggleFavorite,
            clearFavorites,
        }}>
            {children}
        </FavoritesContext.Provider>
    );
}

export function useFavorites() {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error('useFavorites must be used within a FavoritesProvider');
    }
    return context;
}
