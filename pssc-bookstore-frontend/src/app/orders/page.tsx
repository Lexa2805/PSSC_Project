"use client";

import { useState, useEffect } from "react";
import { getCustomerOrders, getInvoiceByOrderId } from "@/lib/api";
import { Order, InvoiceDto } from "@/types";

export default function OrdersPage() {
    const [customerId, setCustomerId] = useState("");
    const [orders, setOrders] = useState<Order[]>([]);
    const [invoices, setInvoices] = useState<Record<string, InvoiceDto | null>>({});
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerId.trim()) return;

        setLoading(true);
        setSearched(true);
        setInvoices({});
        setExpandedInvoice(null);
        try {
            const data = await getCustomerOrders(customerId);
            setOrders(data);
        } catch (error) {
            console.error("Failed to fetch orders:", error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch invoices for all orders after orders are loaded
    useEffect(() => {
        const fetchInvoices = async () => {
            if (orders.length === 0) return;
            
            const invoicePromises = orders.map(async (order) => {
                const invoice = await getInvoiceByOrderId(order.id);
                return { orderId: order.id, invoice };
            });

            const results = await Promise.all(invoicePromises);
            const invoiceMap: Record<string, InvoiceDto | null> = {};
            results.forEach(({ orderId, invoice }) => {
                invoiceMap[orderId] = invoice;
            });
            setInvoices(invoiceMap);
        };

        fetchInvoices();
    }, [orders]);

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "placed":
                return "bg-green-100 text-green-800";
            case "processing":
                return "bg-blue-100 text-blue-800";
            case "shipped":
                return "bg-pink-100 text-pink-800";
            case "delivered":
                return "bg-emerald-100 text-emerald-800";
            case "failed":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("ro-RO", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const toggleInvoice = (orderId: string) => {
        setExpandedInvoice(expandedInvoice === orderId ? null : orderId);
    };

    return (
        <div className="min-h-screen bg-[#fdf5f7] dark:bg-gray-900 transition-colors duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#fce4ec] via-[#f8d7e0] to-[#f3c9d5] dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white text-center mb-4">
                        Urmărește Comenzile
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 text-center max-w-2xl mx-auto">
                        Introdu ID-ul tău de client pentru a vedea istoricul comenzilor
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Search Form */}
                <form onSubmit={handleSearch} className="mb-12">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Introdu ID-ul de Client..."
                                value={customerId}
                                onChange={(e) => setCustomerId(e.target.value)}
                                className="w-full px-6 py-4 pl-12 rounded-2xl border border-[#f8d7e0] dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f3c9d5] dark:focus:ring-gray-500 focus:border-transparent text-lg"
                            />
                            <svg
                                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                            </svg>
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !customerId.trim()}
                            className="px-8 py-4 bg-gradient-to-r from-[#f3c9d5] to-[#e8b4c4] dark:from-gray-600 dark:to-gray-500 text-gray-800 dark:text-white font-semibold rounded-2xl hover:from-[#e8b4c4] hover:to-[#d4849a] dark:hover:from-gray-500 dark:hover:to-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            {loading ? (
                                <svg
                                    className="animate-spin h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                            ) : (
                                "Search"
                            )}
                        </button>
                    </div>
                </form>

                {/* Results */}
                {loading ? (
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div
                                key={i}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-6 animate-pulse"
                            >
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                            </div>
                        ))}
                    </div>
                ) : searched && orders.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl">
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
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                            />
                        </svg>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Nu am găsit comenzi
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            Nu am găsit comenzi pentru ID-ul de client: {customerId}
                        </p>
                    </div>
                ) : orders.length > 0 ? (
                    <div className="space-y-6">
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                            >
                                {/* Order Header */}
                                <div className="bg-[#fdf5f7] dark:bg-gray-700 px-6 py-4 border-b border-[#f8d7e0] dark:border-gray-600">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">ID Comandă</span>
                                            <p className="font-mono font-semibold text-gray-900 dark:text-white">
                                                #{order.id.slice(0, 8).toUpperCase()}
                                            </p>
                                        </div>
                                        <span
                                            className={`px-4 py-1 rounded-full text-sm font-medium ${getStatusColor(
                                                order.status
                                            )}`}
                                        >
                                            {order.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Order Body */}
                                <div className="p-6">
                                    <div className="space-y-3">
                                        {order.lines.map((line, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between py-2 border-b border-[#f8d7e0] dark:border-gray-700 last:border-0"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-16 rounded-lg bg-gradient-to-br from-[#f3c9d5] to-[#e8b4c4] dark:from-gray-600 dark:to-gray-500 flex items-center justify-center">
                                                        <svg
                                                            className="w-6 h-6 text-white"
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
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            {line.productCode}
                                                        </p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            Cantitate: {line.quantity} × {line.unitPrice.toFixed(2)} lei
                                                        </p>
                                                    </div>
                                                </div>
                                                <p className="font-semibold text-gray-900 dark:text-white">
                                                    {line.lineTotal.toFixed(2)} lei
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Order Total */}
                                    <div className="mt-6 pt-4 border-t border-[#f8d7e0] dark:border-gray-700 flex items-center justify-between">
                                        <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                                            Total
                                        </span>
                                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {order.totalAmount.toFixed(2)} lei
                                        </span>
                                    </div>

                                    {/* Invoice Section */}
                                    {invoices[order.id] !== undefined && (
                                        <div className="mt-4 pt-4 border-t border-[#f8d7e0] dark:border-gray-700">
                                            {invoices[order.id] ? (
                                                <div>
                                                    <button
                                                        onClick={() => toggleInvoice(order.id)}
                                                        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#fce4ec] to-[#f8d7e0] dark:from-gray-700 dark:to-gray-600 rounded-xl hover:from-[#f8d7e0] hover:to-[#f3c9d5] dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <svg
                                                                className="w-5 h-5 text-[#d4849a] dark:text-pink-400"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                                />
                                                            </svg>
                                                            <span className="font-semibold text-gray-800 dark:text-white">
                                                                Factură: {invoices[order.id]!.invoiceNumber}
                                                            </span>
                                                        </div>
                                                        <svg
                                                            className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${
                                                                expandedInvoice === order.id ? "rotate-180" : ""
                                                            }`}
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M19 9l-7 7-7-7"
                                                            />
                                                        </svg>
                                                    </button>

                                                    {/* Expanded Invoice Details */}
                                                    {expandedInvoice === order.id && (
                                                        <div className="mt-4 p-4 bg-white dark:bg-gray-800 border border-[#f3c9d5] dark:border-gray-600 rounded-xl">
                                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                                <div>
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Client</p>
                                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                                        {invoices[order.id]!.clientName}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Tip</p>
                                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                                        {invoices[order.id]!.isCompany ? "Persoană Juridică" : "Persoană Fizică"}
                                                                    </p>
                                                                </div>
                                                                {invoices[order.id]!.fiscalCode && (
                                                                    <div>
                                                                        <p className="text-sm text-gray-500 dark:text-gray-400">CUI</p>
                                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                                            {invoices[order.id]!.fiscalCode}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Data Emiterii</p>
                                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                                        {formatDate(invoices[order.id]!.issuedAt)}
                                                                    </p>
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Adresa de Facturare</p>
                                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                                        {invoices[order.id]!.billingAddress}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Invoice Totals */}
                                                            <div className="border-t border-[#f8d7e0] dark:border-gray-700 pt-4 space-y-2">
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-gray-600 dark:text-gray-400">Subtotal (fără TVA)</span>
                                                                    <span className="text-gray-900 dark:text-white">
                                                                        {invoices[order.id]!.netAmount.toFixed(2)} {invoices[order.id]!.currency}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-gray-600 dark:text-gray-400">
                                                                        TVA ({(invoices[order.id]!.vatRate * 100).toFixed(0)}%)
                                                                    </span>
                                                                    <span className="text-gray-900 dark:text-white">
                                                                        {invoices[order.id]!.vatAmount.toFixed(2)} {invoices[order.id]!.currency}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between font-bold text-lg pt-2 border-t border-[#f8d7e0] dark:border-gray-700">
                                                                    <span className="text-gray-900 dark:text-white">Total</span>
                                                                    <span className="text-[#d4849a] dark:text-pink-400">
                                                                        {invoices[order.id]!.totalAmount.toFixed(2)} {invoices[order.id]!.currency}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Email sent notice */}
                                                            {invoices[order.id]!.email && (
                                                                <div className="mt-4 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                    Factura a fost trimisă la: {invoices[order.id]!.email}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 px-4 py-2">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Factura nu este disponibilă pentru această comandă
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
