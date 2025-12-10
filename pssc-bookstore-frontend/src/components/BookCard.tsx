'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/context/FavoritesContext';
import { ShoppingCart, BookOpen, Star, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBookImage } from '@/lib/bookImages';

interface BookCardProps {
    product: Product;
}

// Book cover colors based on category (fallback when no image)
const categoryColors: Record<string, { bg: string; accent: string }> = {
    'Learn': { bg: 'from-blue-600 to-indigo-800', accent: 'bg-blue-400' },
    'Psychology': { bg: 'from-purple-600 to-purple-800', accent: 'bg-purple-400' },
    'Romance': { bg: 'from-pink-500 to-rose-700', accent: 'bg-pink-400' },
    'Sci-Fi': { bg: 'from-cyan-600 to-teal-800', accent: 'bg-cyan-400' },
    'Thriller': { bg: 'from-gray-700 to-gray-900', accent: 'bg-gray-400' },
    'Fantasy': { bg: 'from-amber-600 to-orange-800', accent: 'bg-amber-400' },
    'Business': { bg: 'from-emerald-600 to-green-800', accent: 'bg-emerald-400' },
};

export function BookCard({ product }: BookCardProps) {
    const { addToCart, items } = useCart();
    const { isFavorite, toggleFavorite } = useFavorites();
    const cartItem = items.find(item => item.code === product.code);
    const quantityInCart = cartItem?.quantity || 0;
    const isOutOfStock = product.stockQuantity === 0;
    const canAddMore = quantityInCart < product.stockQuantity;
    const isProductFavorite = isFavorite(product.code);

    const colors = categoryColors[product.category] || { bg: 'from-gray-600 to-gray-800', accent: 'bg-gray-400' };
    const bookImage = getBookImage(product.code);

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(product);
    };

    const handleToggleFavorite = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(product);
    };

    return (
        <Link
            href={`/books/${product.code}`}
            className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden block"
        >
            {/* Book Cover */}
            <div className={cn(
                "relative h-72 overflow-hidden",
                !bookImage && `bg-gradient-to-br ${colors.bg}`
            )}>
                {bookImage ? (
                    /* Actual book cover image */
                    <Image
                        src={bookImage}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                ) : (
                    /* Fallback gradient with icon */
                    <div className="flex items-center justify-center h-full">
                        <div className={cn("absolute top-4 left-4 w-16 h-1 rounded-full opacity-50", colors.accent)} />
                        <div className={cn("absolute top-8 left-4 w-12 h-1 rounded-full opacity-30", colors.accent)} />
                        <div className="relative">
                            <BookOpen className="w-24 h-24 text-white/20" strokeWidth={1} />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-white font-bold text-lg text-center px-4 leading-tight">
                                    {product.name.split(' ').slice(0, 2).join(' ')}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Category badge */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {product.category}
                </div>

                {/* Favorite button */}
                <button
                    onClick={handleToggleFavorite}
                    className={cn(
                        "absolute top-4 right-4 p-2 rounded-full transition-all z-10",
                        isProductFavorite
                            ? "bg-red-500 text-white"
                            : "bg-white/80 text-gray-600 hover:bg-white hover:text-red-500"
                    )}
                >
                    <Heart className={cn("w-4 h-4", isProductFavorite && "fill-current")} />
                </button>

                {/* Stock badge */}
                {isOutOfStock ? (
                    <div className="absolute bottom-4 right-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        Stoc Epuizat
                    </div>
                ) : product.stockQuantity < 10 ? (
                    <div className="absolute bottom-4 right-4 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        Doar {product.stockQuantity} rămase
                    </div>
                ) : null}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                    <button
                        onClick={handleAddToCart}
                        disabled={isOutOfStock || !canAddMore}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all transform scale-90 group-hover:scale-100",
                            isOutOfStock || !canAddMore
                                ? "bg-gray-400 cursor-not-allowed text-gray-200"
                                : "bg-white text-gray-900 hover:bg-gray-100 hover:shadow-lg"
                        )}
                    >
                        <ShoppingCart className="w-5 h-5" />
                        {quantityInCart > 0 ? `Adaugă (${quantityInCart} în coș)` : 'Adaugă în Coș'}
                    </button>
                </div>
            </div>

            {/* Book Info */}
            <div className="p-6">
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white truncate group-hover:text-[#d4849a] transition-colors">
                        {product.name}
                    </h3>
                    {product.author && (
                        <p className="text-sm text-[#d4849a] font-medium mt-1">
                            by {product.author}
                        </p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                        {product.description}
                    </p>
                </div>

                {/* Rating placeholder */}
                <div className="flex items-center gap-1 mt-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            className={cn(
                                "w-4 h-4",
                                star <= 4 ? "text-amber-400 fill-amber-400" : "text-gray-300 dark:text-gray-600"
                            )}
                        />
                    ))}
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">(4.0)</span>
                </div>

                {/* Price */}
                <div className="flex items-end justify-between mt-4">
                    <div>
                        <span className="text-2xl font-bold text-gray-800 dark:text-white">
                            {product.price.toFixed(2)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">lei</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
