import { BookOpen, Github, Twitter, Mail } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
    return (
        <footer className="bg-[#fdf5f7] dark:bg-gray-900 text-gray-600 dark:text-gray-400 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#fce4ec] to-[#f3c9d5] dark:from-gray-700 dark:to-gray-600 rounded-xl flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-[#d4849a] dark:text-gray-300" />
                            </div>
                            <span className="font-bold text-xl text-gray-800 dark:text-white">ARA Books</span>
                        </Link>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md">
                            Destinația ta pentru cărți de calitate. Descoperă cele mai bune titluri din diverse categorii.
                        </p>
                        <div className="flex gap-4 mt-6">
                            <a href="#" className="p-2 bg-[#fce4ec] dark:bg-gray-800 rounded-lg hover:bg-[#f8d7e0] dark:hover:bg-gray-700 transition-colors">
                                <Twitter className="w-5 h-5" />
                            </a>
                            <a href="#" className="p-2 bg-[#fce4ec] dark:bg-gray-800 rounded-lg hover:bg-[#f8d7e0] dark:hover:bg-gray-700 transition-colors">
                                <Github className="w-5 h-5" />
                            </a>
                            <a href="#" className="p-2 bg-[#fce4ec] dark:bg-gray-800 rounded-lg hover:bg-[#f8d7e0] dark:hover:bg-gray-700 transition-colors">
                                <Mail className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Link-uri Rapide</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/books" className="hover:text-gray-800 dark:hover:text-white transition-colors">
                                    Toate Cărțile
                                </Link>
                            </li>
                            <li>
                                <Link href="/orders" className="hover:text-gray-800 dark:hover:text-white transition-colors">
                                    Comenzile Mele
                                </Link>
                            </li>
                            <li>
                                <a href="#" className="hover:text-gray-800 dark:hover:text-white transition-colors">
                                    Bestsellers
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-gray-800 dark:hover:text-white transition-colors">
                                    Noutăți
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Categories */}
                    <div>
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Categorii</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/books?category=Learn" className="hover:text-gray-800 dark:hover:text-white transition-colors">
                                    Learn
                                </Link>
                            </li>
                            <li>
                                <Link href="/books?category=Romance" className="hover:text-gray-800 dark:hover:text-white transition-colors">
                                    Romance
                                </Link>
                            </li>
                            <li>
                                <Link href="/books?category=Fantasy" className="hover:text-gray-800 dark:hover:text-white transition-colors">
                                    Fantasy
                                </Link>
                            </li>
                            <li>
                                <Link href="/books?category=Thriller" className="hover:text-gray-800 dark:hover:text-white transition-colors">
                                    Thriller
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-[#f8d7e0] dark:border-gray-700 mt-12 pt-8 text-center text-gray-500">
                    <p>&copy; 2025 ARA Books. Built with Next.js and .NET. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
