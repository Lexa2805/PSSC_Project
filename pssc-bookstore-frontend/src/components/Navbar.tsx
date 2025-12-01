'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { ShoppingCart, BookOpen, Search, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
    const { totalItems, totalPrice, openCart } = useCart();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <>
            <nav className="sticky top-0 z-30 bg-[#fdf5f7] dark:bg-gray-900 backdrop-blur-lg border-b border-[#f8d7e0] dark:border-gray-700 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#fce4ec] to-[#f3c9d5] dark:from-gray-700 dark:to-gray-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                <BookOpen className="w-5 h-5 text-[#d4849a] dark:text-gray-300" />
                            </div>
                            <span className="font-bold text-xl text-[#6b4a5a] dark:text-white">
                                ARA Books
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-8">
                            <Link
                                href="/"
                                className="text-gray-600 dark:text-gray-300 hover:text-[#d4849a] dark:hover:text-pink-300 font-medium transition-colors"
                            >
                                Acasă
                            </Link>
                            <Link
                                href="/books"
                                className="text-gray-600 dark:text-gray-300 hover:text-[#d4849a] dark:hover:text-pink-300 font-medium transition-colors"
                            >
                                Toate Cărțile
                            </Link>
                            <Link
                                href="/orders"
                                className="text-gray-600 dark:text-gray-300 hover:text-[#d4849a] dark:hover:text-pink-300 font-medium transition-colors"
                            >
                                Comenzile Mele
                            </Link>
                        </div>

                        {/* Search, Theme Toggle and Cart */}
                        <div className="flex items-center gap-3">
                            {/* Search */}
                            <Link
                                href="/books"
                                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#fce4ec] dark:bg-gray-800 rounded-full text-[#6b4a5a] dark:text-gray-300 hover:bg-[#f8d7e0] dark:hover:bg-gray-700 transition-colors"
                            >
                                <Search className="w-4 h-4" />
                                <span className="text-sm">Caută...</span>
                            </Link>

                            {/* Theme Toggle */}
                            <ThemeToggle />

                            {/* Cart Button */}
                            <button
                                onClick={openCart}
                                className="relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#fce4ec] to-[#f3c9d5] dark:from-gray-700 dark:to-gray-600 text-[#6b4a5a] dark:text-white rounded-full hover:shadow-lg hover:scale-105 transition-all"
                            >
                                <ShoppingCart className="w-5 h-5" />
                                <span className="hidden sm:inline font-medium">
                                    {totalPrice > 0 ? `${totalPrice.toFixed(2)} lei` : 'Coș'}
                                </span>
                                {totalItems > 0 && (
                                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-[#e8a0b4] dark:bg-pink-600 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                                        {totalItems}
                                    </span>
                                )}
                            </button>

                            {/* Mobile menu button */}
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-[#fce4ec] dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                <div
                    className={cn(
                        "md:hidden overflow-hidden transition-all duration-300",
                        isMobileMenuOpen ? "max-h-64" : "max-h-0"
                    )}
                >
                    <div className="px-4 py-4 space-y-2 border-t border-[#f8d7e0] dark:border-gray-700 bg-[#fdf5f7] dark:bg-gray-900">
                        <Link
                            href="/"
                            className="block px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Acasă
                        </Link>
                        <Link
                            href="/books"
                            className="block px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Toate Cărțile
                        </Link>
                        <Link
                            href="/orders"
                            className="block px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Comenzile Mele
                        </Link>
                    </div>
                </div>
            </nav>
        </>
    );
}
