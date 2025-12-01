'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getProduct, getProductsByCategory } from '@/lib/api';
import { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { getBookImage } from '@/lib/bookImages';
import {
    ArrowLeft,
    ShoppingCart,
    Star,
    BookOpen,
    User,
    Tag,
    Package,
    Truck,
    Shield,
    Heart,
    Share2,
    ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock reviews data
const mockReviews = [
    {
        id: 1,
        author: "Alexandru M.",
        rating: 5,
        date: "15 Noiembrie 2025",
        title: "O carte excepțională!",
        content: "Am citit această carte de două ori și încă descopăr lucruri noi. Recomand tuturor!",
        helpful: 24
    },
    {
        id: 2,
        author: "Maria P.",
        rating: 4,
        date: "10 Noiembrie 2025",
        title: "Foarte bună, dar puțin densă",
        content: "Conținutul este excelent, dar uneori devine puțin greu de urmărit. Totuși, merită fiecare pagină.",
        helpful: 18
    },
    {
        id: 3,
        author: "Ion D.",
        rating: 5,
        date: "5 Noiembrie 2025",
        title: "Must-read!",
        content: "Această carte mi-a schimbat perspectiva. O recomand oricui vrea să învețe ceva nou.",
        helpful: 31
    },
    {
        id: 4,
        author: "Elena S.",
        rating: 4,
        date: "1 Noiembrie 2025",
        title: "Inspirațională",
        content: "Am găsit multe idei utile pe care le-am aplicat deja în viața de zi cu zi.",
        helpful: 12
    }
];

export default function BookDetailPage() {
    const params = useParams();
    const router = useRouter();
    const code = params.code as string;

    const { addToCart, items } = useCart();
    const [product, setProduct] = useState<Product | null>(null);
    const [similarBooks, setSimilarBooks] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');

    const cartItem = product ? items.find(item => item.code === product.code) : null;
    const quantityInCart = cartItem?.quantity || 0;

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const productData = await getProduct(code);
                setProduct(productData);

                // Fetch similar books from the same category
                const categoryBooks = await getProductsByCategory(productData.category);
                // Filter out the current book and limit to 4
                setSimilarBooks(
                    categoryBooks
                        .filter(b => b.code !== productData.code)
                        .slice(0, 4)
                );
            } catch (err) {
                setError('Nu am putut găsi această carte');
            } finally {
                setLoading(false);
            }
        };

        if (code) {
            fetchData();
        }
    }, [code]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#fdf5f7] dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-[#f3c9d5] dark:border-gray-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen bg-[#fdf5f7] dark:bg-gray-900 flex flex-col items-center justify-center">
                <BookOpen className="w-24 h-24 text-gray-300 dark:text-gray-600 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Carte negăsită</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{error || 'Această carte nu există'}</p>
                <Link
                    href="/books"
                    className="px-6 py-3 bg-[#f3c9d5] dark:bg-gray-700 text-gray-800 dark:text-white rounded-full font-semibold hover:bg-[#e8b4c4] dark:hover:bg-gray-600 transition-colors"
                >
                    Înapoi la Cărți
                </Link>
            </div>
        );
    }

    const bookImage = getBookImage(product.code);
    const averageRating = 4.3;
    const totalReviews = mockReviews.length;

    const handleAddToCart = () => {
        for (let i = 0; i < quantity; i++) {
            addToCart(product);
        }
        setQuantity(1);
    };

    return (
        <div className="min-h-screen bg-[#fdf5f7] dark:bg-gray-900 transition-colors duration-300">
            {/* Breadcrumb */}
            <div className="bg-white dark:bg-gray-800 border-b border-[#f8d7e0] dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <nav className="flex items-center gap-2 text-sm">
                        <Link href="/" className="text-gray-500 dark:text-gray-400 hover:text-[#d4849a] dark:hover:text-white transition-colors">
                            Acasă
                        </Link>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        <Link href="/books" className="text-gray-500 dark:text-gray-400 hover:text-[#d4849a] dark:hover:text-white transition-colors">
                            Cărți
                        </Link>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        <Link
                            href={`/books?category=${product.category}`}
                            className="text-gray-500 dark:text-gray-400 hover:text-[#d4849a] dark:hover:text-white transition-colors"
                        >
                            {product.category}
                        </Link>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white font-medium truncate max-w-[200px]">
                            {product.name}
                        </span>
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid lg:grid-cols-2 gap-12">
                    {/* Book Image */}
                    <div className="space-y-4">
                        <div className="relative aspect-[3/4] max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-gray-800">
                            {bookImage ? (
                                <Image
                                    src={bookImage}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#f3c9d5] to-[#e8b4c4] dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                                    <BookOpen className="w-32 h-32 text-white/30" />
                                </div>
                            )}
                            {/* Category badge */}
                            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2 rounded-full">
                                {product.category}
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-center gap-4">
                            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors">
                                <Heart className="w-5 h-5" />
                                <span>Salvează</span>
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-[#d4849a] transition-colors">
                                <Share2 className="w-5 h-5" />
                                <span>Distribuie</span>
                            </button>
                        </div>
                    </div>

                    {/* Book Info */}
                    <div className="space-y-6">
                        {/* Title & Author */}
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                                {product.name}
                            </h1>
                            {product.author && (
                                <p className="text-lg text-[#d4849a] font-medium flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    {product.author}
                                </p>
                            )}
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={cn(
                                            "w-5 h-5",
                                            star <= Math.round(averageRating)
                                                ? "text-amber-400 fill-amber-400"
                                                : "text-gray-300"
                                        )}
                                    />
                                ))}
                            </div>
                            <span className="text-lg font-semibold text-gray-900">{averageRating}</span>
                            <span className="text-gray-500">({totalReviews} recenzii)</span>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-4">
                            <span className="text-4xl font-bold text-gray-900 dark:text-white">
                                {product.price.toFixed(2)} lei
                            </span>
                            {product.price >= 200 && (
                                <span className="text-green-600 font-medium flex items-center gap-1">
                                    <Truck className="w-4 h-4" />
                                    Transport gratuit
                                </span>
                            )}
                        </div>

                        {/* Stock Status */}
                        <div className="flex items-center gap-2">
                            <Package className={cn(
                                "w-5 h-5",
                                product.stockQuantity > 0 ? "text-green-600" : "text-red-500"
                            )} />
                            <span className={cn(
                                "font-medium",
                                product.stockQuantity > 0 ? "text-green-600" : "text-red-500"
                            )}>
                                {product.stockQuantity > 0
                                    ? `În stoc (${product.stockQuantity} disponibile)`
                                    : "Stoc epuizat"
                                }
                            </span>
                        </div>

                        {/* Quantity & Add to Cart */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg">
                                <button
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    className="px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    disabled={quantity <= 1}
                                >
                                    -
                                </button>
                                <span className="px-4 py-3 font-semibold min-w-[50px] text-center text-gray-900 dark:text-white">
                                    {quantity}
                                </span>
                                <button
                                    onClick={() => setQuantity(q => Math.min(product.stockQuantity - quantityInCart, q + 1))}
                                    className="px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    disabled={quantity >= product.stockQuantity - quantityInCart}
                                >
                                    +
                                </button>
                            </div>
                            <button
                                onClick={handleAddToCart}
                                disabled={product.stockQuantity === 0 || quantityInCart >= product.stockQuantity}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all",
                                    product.stockQuantity > 0 && quantityInCart < product.stockQuantity
                                        ? "bg-gradient-to-r from-[#f3c9d5] to-[#e8b4c4] dark:from-gray-600 dark:to-gray-500 text-gray-800 dark:text-white hover:from-[#e8b4c4] hover:to-[#d4849a] dark:hover:from-gray-500 dark:hover:to-gray-400 shadow-lg hover:shadow-xl"
                                        : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                )}
                            >
                                <ShoppingCart className="w-5 h-5" />
                                {quantityInCart > 0
                                    ? `Adaugă (${quantityInCart} în coș)`
                                    : "Adaugă în Coș"
                                }
                            </button>
                        </div>

                        {/* Features */}
                        <div className="grid grid-cols-3 gap-4 py-6 border-t border-b border-[#f8d7e0] dark:border-gray-700">
                            <div className="text-center">
                                <Truck className="w-8 h-8 text-[#d4849a] dark:text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600 dark:text-gray-400">Livrare rapidă</p>
                            </div>
                            <div className="text-center">
                                <Shield className="w-8 h-8 text-[#d4849a] dark:text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600 dark:text-gray-400">Garanție 30 zile</p>
                            </div>
                            <div className="text-center">
                                <Tag className="w-8 h-8 text-[#d4849a] dark:text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600 dark:text-gray-400">Prețuri mici</p>
                            </div>
                        </div>

                        {/* Product Code */}
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Cod produs: <span className="font-mono">{product.code}</span>
                        </p>
                    </div>
                </div>

                {/* Tabs: Description & Reviews */}
                <div className="mt-12">
                    <div className="flex border-b border-[#f8d7e0] dark:border-gray-700">
                        <button
                            onClick={() => setActiveTab('description')}
                            className={cn(
                                "px-6 py-4 font-semibold text-lg transition-colors relative",
                                activeTab === 'description'
                                    ? "text-[#d4849a] dark:text-white"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            )}
                        >
                            Descriere
                            {activeTab === 'description' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d4849a] dark:bg-white" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('reviews')}
                            className={cn(
                                "px-6 py-4 font-semibold text-lg transition-colors relative",
                                activeTab === 'reviews'
                                    ? "text-[#d4849a] dark:text-white"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            )}
                        >
                            Recenzii ({totalReviews})
                            {activeTab === 'reviews' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d4849a] dark:bg-white" />
                            )}
                        </button>
                    </div>

                    <div className="py-8">
                        {activeTab === 'description' ? (
                            <div className="prose max-w-none dark:prose-invert">
                                <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {product.description}
                                </p>
                                <div className="mt-6 p-6 bg-[#fce4ec] dark:bg-gray-800 rounded-xl">
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-3">
                                        De ce să alegi această carte?
                                    </h3>
                                    <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                                        <li className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-[#d4849a] dark:bg-gray-400 rounded-full" />
                                            Conținut de calitate, verificat de experți
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-[#d4849a] dark:bg-gray-400 rounded-full" />
                                            Rating excelent de la cititori
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-[#d4849a] dark:bg-gray-400 rounded-full" />
                                            Livrare rapidă și sigură
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Reviews Summary */}
                                <div className="flex items-center gap-8 p-6 bg-[#fce4ec] dark:bg-gray-800 rounded-xl">
                                    <div className="text-center">
                                        <div className="text-5xl font-bold text-gray-900 dark:text-white">{averageRating}</div>
                                        <div className="flex items-center justify-center gap-1 mt-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={cn(
                                                        "w-4 h-4",
                                                        star <= Math.round(averageRating)
                                                            ? "text-amber-400 fill-amber-400"
                                                            : "text-gray-300 dark:text-gray-600"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{totalReviews} recenzii</p>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        {[5, 4, 3, 2, 1].map((rating) => {
                                            const count = mockReviews.filter(r => r.rating === rating).length;
                                            const percentage = (count / totalReviews) * 100;
                                            return (
                                                <div key={rating} className="flex items-center gap-3">
                                                    <span className="w-3 text-sm text-gray-600 dark:text-gray-400">{rating}</span>
                                                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-amber-400 rounded-full"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                    <span className="w-8 text-sm text-gray-500 dark:text-gray-400">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Individual Reviews */}
                                <div className="space-y-6">
                                    {mockReviews.map((review) => (
                                        <div key={review.id} className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-[#f8d7e0] dark:border-gray-700 shadow-sm">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-10 h-10 bg-[#fce4ec] dark:bg-gray-700 rounded-full flex items-center justify-center">
                                                            <span className="text-[#d4849a] dark:text-gray-300 font-bold">
                                                                {review.author.charAt(0)}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900 dark:text-white">{review.author}</p>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">{review.date}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star
                                                            key={star}
                                                            className={cn(
                                                                "w-4 h-4",
                                                                star <= review.rating
                                                                    ? "text-amber-400 fill-amber-400"
                                                                    : "text-gray-300 dark:text-gray-600"
                                                            )}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{review.title}</h4>
                                            <p className="text-gray-600 dark:text-gray-300">{review.content}</p>
                                            <div className="mt-4 flex items-center gap-4">
                                                <button className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#d4849a] dark:hover:text-white transition-colors">
                                                    👍 Util ({review.helpful})
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Similar Books */}
                {similarBooks.length > 0 && (
                    <div className="mt-12 pt-12 border-t border-[#f8d7e0] dark:border-gray-700">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Cărți similare din {product.category}
                            </h2>
                            <Link
                                href={`/books?category=${product.category}`}
                                className="text-[#d4849a] dark:text-gray-300 hover:text-[#c4748a] dark:hover:text-white font-medium flex items-center gap-1"
                            >
                                Vezi toate <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {similarBooks.map((book) => {
                                const image = getBookImage(book.code);
                                return (
                                    <Link
                                        key={book.code}
                                        href={`/books/${book.code}`}
                                        className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                                    >
                                        <div className="relative aspect-[3/4] overflow-hidden">
                                            {image ? (
                                                <Image
                                                    src={image}
                                                    alt={book.name}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-[#f3c9d5] to-[#e8b4c4] dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                                                    <BookOpen className="w-16 h-16 text-white/30" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-[#d4849a] dark:group-hover:text-gray-300 transition-colors">
                                                {book.name}
                                            </h3>
                                            {book.author && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{book.author}</p>
                                            )}
                                            <p className="font-bold text-lg text-gray-900 dark:text-white mt-2">
                                                {book.price.toFixed(2)} lei
                                            </p>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
