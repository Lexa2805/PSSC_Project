"use client";

import { Hero } from "@/components/Hero";
import { BookGrid } from "@/components/BookGrid";
import { CartDrawer } from "@/components/CartDrawer";

export default function Home() {
  return (
    <>
      <Hero />
      <BookGrid />
      <CartDrawer />

      {/* Features Section */}
      <section className="py-20 bg-[#fdf5f7] dark:bg-gray-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
              De ce să alegi ARA Books?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Cărți de calitate din toate categoriile pentru a-ți îmbogăți biblioteca.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="w-14 h-14 bg-[#fce4ec] dark:bg-gray-700 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-[#d4849a] dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">Selecție Atentă</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Cărți alese cu grijă din diverse domenii pentru a satisface orice gust.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">Livrare Rapidă</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Procesare rapidă și livrare sigură pentru a primi cărțile cât mai repede.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">Garanție de Calitate</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Toate cărțile sunt noi și în stare perfectă, cu retururi fără probleme.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 bg-gradient-to-r from-[#fdf5f7] to-[#fce4ec] dark:from-gray-800 dark:to-gray-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
            Rămâi la Curent cu Noutățile
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Abonează-te la newsletter-ul nostru și fii primul care află despre cărțile noi și ofertele exclusive.
          </p>
          <form className="max-w-md mx-auto flex gap-4">
            <input
              type="email"
              placeholder="Introdu email-ul tău"
              className="flex-1 px-6 py-3 rounded-full bg-white/60 dark:bg-gray-800/60 border border-[#f8d7e0] dark:border-gray-600 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f3c9d5]"
            />
            <button
              type="submit"
              className="px-8 py-3 bg-[#fce4ec] dark:bg-gray-700 text-gray-800 dark:text-white font-semibold rounded-full hover:bg-[#f8d7e0] dark:hover:bg-gray-600 transition-colors"
            >
              Abonează-te
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
