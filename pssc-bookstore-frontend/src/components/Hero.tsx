'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BookOpen, Truck, Shield, CreditCard } from 'lucide-react';

export function Hero() {
    return (
        <section className="relative overflow-hidden bg-gradient-to-br from-[#fdf5f7] via-[#fce4ec] to-[#f8d7e0] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4849a' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }} />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    {/* Content */}
                    <div>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f3c9d5]/40 dark:bg-gray-700/50 rounded-full text-sm font-medium mb-6 backdrop-blur text-[#6b4a5a] dark:text-gray-300">
                            <span className="w-2 h-2 bg-[#d4849a] dark:bg-pink-400 rounded-full animate-pulse" />
                            Noutăți în fiecare săptămână
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-gray-800 dark:text-white">
                            Descoperă Cele Mai Bune
                            <span className="block text-[#c77d94] dark:text-pink-300">
                                Cărți din Toate Categoriile
                            </span>
                        </h1>

                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-lg">
                            Explorează colecția noastră vastă de cărți din categorii variate:
                            de la programare și business până la psihologie, fantezie și romance.
                        </p>

                        <div className="flex flex-wrap gap-4">
                            <Link
                                href="/books"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-[#f3c9d5] dark:bg-gray-700 text-gray-800 dark:text-white rounded-full font-bold hover:bg-[#ebbdcd] dark:hover:bg-gray-600 hover:shadow-xl transition-all group"
                            >
                                Vezi Colecția
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                href="/orders"
                                className="inline-flex items-center gap-2 px-8 py-4 border-2 border-[#f3c9d5] dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-full font-semibold hover:bg-[#fce4ec] dark:hover:bg-gray-800 transition-all"
                            >
                                Comenzile Mele
                            </Link>
                        </div>
                    </div>

                    {/* Decorative books with actual images */}
                    <div className="hidden md:flex justify-center">
                        <div className="relative w-80 h-96">
                            {/* Book stack */}
                            <div className="absolute top-0 right-0 w-48 h-64 rounded-lg shadow-2xl transform rotate-6 hover:rotate-3 transition-transform overflow-hidden">
                                <Image
                                    src="/books/Dune.jpeg"
                                    alt="Dune"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="absolute top-8 left-8 w-48 h-64 rounded-lg shadow-2xl transform -rotate-6 hover:-rotate-3 transition-transform overflow-hidden">
                                <Image
                                    src="/books/Atomic_Habits.jpeg"
                                    alt="Atomic Habits"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="absolute top-16 left-16 w-48 h-64 rounded-lg shadow-2xl transform hover:scale-105 transition-transform overflow-hidden">
                                <Image
                                    src="/books/clean_code.jpeg"
                                    alt="Clean Code"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-16 border-t border-[#f3c9d5]/40 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#f3c9d5]/50 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                            <Truck className="w-6 h-6 text-[#c77d94] dark:text-pink-300" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-white">Livrare Gratuită</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Comenzi peste 200 lei</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#f3c9d5]/50 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                            <Shield className="w-6 h-6 text-[#c77d94] dark:text-pink-300" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-white">Plată Securizată</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">100% sigur</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#f3c9d5]/50 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-[#c77d94] dark:text-pink-300" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-white">Retur Ușor</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">30 zile garanție</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#f3c9d5]/50 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-[#c77d94] dark:text-pink-300" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-white">Cărți de Calitate</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Colecție selectată</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
