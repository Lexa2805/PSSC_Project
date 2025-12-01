"use client";

import { useState, useEffect } from "react";
import { BookCard } from "@/components/BookCard";
import { CartDrawer } from "@/components/CartDrawer";
import { getProducts, getCategories } from "@/lib/api";
import { Product, FREE_SHIPPING_THRESHOLD } from "@/types";
import { Truck } from "lucide-react";

export default function BooksPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productsData, categoriesData] = await Promise.all([
                    getProducts(selectedCategory !== "all" ? selectedCategory : undefined),
                    getCategories()
                ]);
                setProducts(productsData);
                setCategories(categoriesData);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedCategory]);

    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (product.author?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
        return matchesSearch;
    });

    return (
        <>
            <div className="min-h-screen bg-[#fdf5f7] dark:bg-gray-900 transition-colors duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#fce4ec] via-[#f8d7e0] to-[#f3c9d5] dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 py-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white text-center mb-4">
                            Explorează Colecția Noastră
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-300 text-center max-w-2xl mx-auto mb-6">
                            Descoperă cele mai bune cărți din toate categoriile
                        </p>
                        {/* Free shipping banner */}
                        <div className="flex justify-center">
                            <div className="inline-flex items-center gap-2 bg-white/40 dark:bg-gray-700/50 backdrop-blur-sm px-6 py-3 rounded-full text-gray-800 dark:text-white">
                                <Truck className="w-5 h-5" />
                                <span className="font-medium">
                                    Transport GRATUIT pentru comenzi peste {FREE_SHIPPING_THRESHOLD} lei
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col gap-6">
                        {/* Search */}
                        <div className="relative w-full max-w-xl mx-auto">
                            <input
                                type="text"
                                placeholder="Caută cărți sau autori..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-6 py-4 pl-14 rounded-2xl border border-[#f8d7e0] dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f3c9d5] focus:border-transparent shadow-sm text-lg transition-colors duration-300"
                            />
                            <svg
                                className="absolute left-5 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </div>

                        {/* Categories */}
                        <div className="flex flex-wrap gap-3 justify-center">
                            <button
                                onClick={() => setSelectedCategory("all")}
                                className={`px-6 py-3 rounded-full text-sm font-semibold transition-all ${selectedCategory === "all"
                                    ? "bg-gradient-to-r from-[#fce4ec] to-[#f3c9d5] dark:from-gray-600 dark:to-gray-500 text-gray-800 dark:text-white shadow-lg"
                                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-[#fdf5f7] dark:hover:bg-gray-700 border border-[#f8d7e0] dark:border-gray-600"
                                    }`}
                            >
                                🏠 Toate Cărțile
                            </button>
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`px-6 py-3 rounded-full text-sm font-semibold transition-all ${selectedCategory === category
                                        ? "bg-gradient-to-r from-[#fce4ec] to-[#f3c9d5] dark:from-gray-600 dark:to-gray-500 text-gray-800 dark:text-white shadow-lg"
                                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-[#fdf5f7] dark:hover:bg-gray-700 border border-[#f8d7e0] dark:border-gray-600"
                                        }`}
                                >
                                    {getCategoryEmoji(category)} {category}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Books Grid */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                    {/* Results count */}
                    <div className="mb-6 text-gray-600 dark:text-gray-400">
                        {!loading && (
                            <p>{filteredProducts.length} {filteredProducts.length === 1 ? 'carte găsită' : 'cărți găsite'}</p>
                        )}
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {[...Array(8)].map((_, i) => (
                                <div
                                    key={i}
                                    className="bg-white dark:bg-gray-800 rounded-2xl p-6 animate-pulse"
                                >
                                    <div className="w-full h-64 bg-gray-200 dark:bg-gray-700 rounded-xl mb-4" />
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                                </div>
                            ))}
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-16">
                            <svg
                                className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                />
                            </svg>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                Nu am găsit cărți
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Încearcă să ajustezi căutarea sau filtrele
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {filteredProducts.map((product) => (
                                <BookCard key={product.code} product={product} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <CartDrawer />
        </>
    );
}

function getCategoryEmoji(category: string): string {
    const emojis: Record<string, string> = {
        'Learn': '📚',
        'Psychology': '🧠',
        'Romance': '💕',
        'Sci-Fi': '🚀',
        'Thriller': '🔪',
        'Fantasy': '🐉',
        'Business': '💼',
    };
    return emojis[category] || '📖';
}
