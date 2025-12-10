'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/types';
import { BookCard } from './BookCard';
import { getProducts } from '@/lib/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface BookGridProps {
    products?: Product[];
    title?: string;
    subtitle?: string;
}

export function BookGrid({ products: propProducts, title = "Featured Books", subtitle = "Discover our curated selection of programming and software engineering books" }: BookGridProps) {
    const [products, setProducts] = useState<Product[]>(propProducts || []);
    const [loading, setLoading] = useState(!propProducts);
    const [error, setError] = useState<string | null>(null);

    const fetchProducts = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getProducts();
            setProducts(data);
        } catch (err) {
            console.error('Failed to fetch products:', err);
            setError('Nu s-a putut conecta la server. Verifică dacă backend-ul rulează.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!propProducts) {
            fetchProducts();
        }
    }, [propProducts]);

    if (loading) {
        return (
            <section className="py-16 bg-white dark:bg-gray-900 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg mx-auto mb-4 animate-pulse" />
                        <div className="h-6 w-96 bg-gray-200 dark:bg-gray-700 rounded-lg mx-auto animate-pulse" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-[#fdf5f7] dark:bg-gray-800 rounded-2xl p-6 animate-pulse">
                                <div className="w-full h-64 bg-gray-200 dark:bg-gray-700 rounded-xl mb-4" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="py-16 bg-white dark:bg-gray-900 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {(title || subtitle) && (
                    <div className="text-center mb-12">
                        {title && (
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-4">
                                {title}
                            </h2>
                        )}
                        {subtitle && (
                            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                                {subtitle}
                            </p>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {products.map((product) => (
                        <BookCard key={product.code} product={product} />
                    ))}
                </div>

                {products.length === 0 && !loading && !error && (
                    <div className="text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400 text-lg">No books available at the moment.</p>
                    </div>
                )}

                {error && (
                    <div className="text-center py-12">
                        <div className="inline-flex flex-col items-center gap-4 p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl">
                            <AlertCircle className="w-12 h-12 text-red-500" />
                            <p className="text-red-600 dark:text-red-400 text-lg font-medium">{error}</p>
                            <button
                                onClick={fetchProducts}
                                className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Încearcă din nou
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
