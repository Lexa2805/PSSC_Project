'use client';

import { useAuth } from '@/context/AuthContext';
import { User, LogIn, LogOut, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function AuthButton() {
    const { isAuthenticated, isLoading, user, login, logout } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#fce4ec] dark:bg-gray-800 rounded-full text-[#6b4a5a] dark:text-gray-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline text-sm">Se încarcă...</span>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <button
                onClick={() => login()}
                className="flex items-center gap-2 px-4 py-2 bg-[#fce4ec] dark:bg-gray-800 rounded-full text-[#6b4a5a] dark:text-gray-300 hover:bg-[#f8d7e0] dark:hover:bg-gray-700 transition-colors"
            >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">Autentificare</span>
            </button>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-[#fce4ec] dark:bg-gray-800 rounded-full text-[#6b4a5a] dark:text-gray-300 hover:bg-[#f8d7e0] dark:hover:bg-gray-700 transition-colors"
            >
                <div className="w-6 h-6 bg-gradient-to-br from-[#d4849a] to-[#b86b82] dark:from-gray-600 dark:to-gray-500 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                </div>
                <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
                    {user?.displayName || user?.email || 'Utilizator'}
                </span>
            </button>

            {showDropdown && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDropdown(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-[#f8d7e0] dark:border-gray-700 z-50 overflow-hidden">
                        {/* User info */}
                        <div className="px-4 py-3 border-b border-[#f8d7e0] dark:border-gray-700">
                            <p className="text-sm font-medium text-[#6b4a5a] dark:text-white truncate">
                                {user?.displayName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {user?.email}
                            </p>
                            {user?.roles && user.roles.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {user.roles.map((role) => (
                                        <span
                                            key={role}
                                            className="inline-block px-2 py-0.5 text-xs bg-[#fce4ec] dark:bg-gray-700 text-[#d4849a] dark:text-pink-300 rounded-full"
                                        >
                                            {role}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="p-2">
                            <button
                                onClick={() => {
                                    setShowDropdown(false);
                                    logout();
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-[#fce4ec] dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Deconectare</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
