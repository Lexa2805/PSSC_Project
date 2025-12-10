"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getCustomerOrders, getInvoiceByOrderId, getShipmentByOrderId } from "@/lib/api";
import { Order, InvoiceDto, ShipmentResponse } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { useCart } from "@/context/CartContext";
import { Heart, ShoppingCart, Package, FileText, Truck, ChevronDown, ChevronUp, Clock, CheckCircle, AlertCircle } from "lucide-react";

export default function OrdersPage() {
    const searchParams = useSearchParams();
    const { isAuthenticated, user, isLoading: authLoading } = useAuth();
    const { favorites, removeFromFavorites } = useFavorites();
    const { addToCart } = useCart();

    const [orders, setOrders] = useState<Order[]>([]);
    const [invoices, setInvoices] = useState<Record<string, InvoiceDto | null>>({});
    const [shipments, setShipments] = useState<Record<string, ShipmentResponse | null>>({});
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'orders' | 'favorites'>('orders');

    // Handle URL tab parameter
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'favorites') {
            setActiveTab('favorites');
        }
    }, [searchParams]);

    // Load orders when authenticated
    useEffect(() => {
        const loadOrders = async () => {
            if (!isAuthenticated || !user) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // Try with user email or ID as customer ID
                const customerId = user.email || user.id;
                const data = await getCustomerOrders(customerId);
                setOrders(data);
            } catch (error) {
                console.error("Failed to fetch orders:", error);
                // Try alternative: load from localStorage
                try {
                    const storedCustomerId = localStorage.getItem('lastCustomerId');
                    if (storedCustomerId) {
                        const data = await getCustomerOrders(storedCustomerId);
                        setOrders(data);
                    }
                } catch {
                    setOrders([]);
                }
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            loadOrders();
        }
    }, [isAuthenticated, user, authLoading]);

    // Fetch invoices and shipments for orders
    useEffect(() => {
        const fetchOrderDetails = async () => {
            if (orders.length === 0) return;

            const invoicePromises = orders.map(async (order) => {
                const id = order.id || order.orderId;
                const invoice = await getInvoiceByOrderId(id);
                return { orderId: id, invoice };
            });

            const shipmentPromises = orders.map(async (order) => {
                const id = order.id || order.orderId;
                const shipment = await getShipmentByOrderId(id);
                return { orderId: id, shipment };
            });

            const [invoiceResults, shipmentResults] = await Promise.all([
                Promise.all(invoicePromises),
                Promise.all(shipmentPromises)
            ]);

            const invoiceMap: Record<string, InvoiceDto | null> = {};
            invoiceResults.forEach(({ orderId, invoice }) => {
                invoiceMap[orderId] = invoice;
            });
            setInvoices(invoiceMap);

            const shipmentMap: Record<string, ShipmentResponse | null> = {};
            shipmentResults.forEach(({ orderId, shipment }) => {
                shipmentMap[orderId] = shipment;
            });
            setShipments(shipmentMap);
        };

        fetchOrderDetails();
    }, [orders]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("ro-RO", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case "delivered":
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case "shipped":
                return <Truck className="w-5 h-5 text-blue-500" />;
            case "processing":
                return <Clock className="w-5 h-5 text-yellow-500" />;
            case "failed":
                return <AlertCircle className="w-5 h-5 text-red-500" />;
            default:
                return <Package className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case "placed":
                return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
            case "processing":
                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
            case "shipped":
                return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
            case "delivered":
                return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
            case "failed":
                return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
        }
    };

    const toggleOrder = (orderId: string) => {
        setExpandedOrder(expandedOrder === orderId ? null : orderId);
    };

    // Loading state
    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-[#fdf5f7] dark:bg-gray-900">
                <div className="max-w-6xl mx-auto px-4 py-12">
                    <div className="animate-pulse space-y-6">
                        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl w-1/3 mx-auto" />
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-1/2 mx-auto" />
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fdf5f7] dark:bg-gray-900 transition-colors duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#fce4ec] via-[#f8d7e0] to-[#f3c9d5] dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 py-12">
                <div className="max-w-6xl mx-auto px-4">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white text-center mb-4">
                        Contul Meu
                    </h1>
                    {isAuthenticated && user && (
                        <p className="text-lg text-gray-600 dark:text-gray-300 text-center">
                            Bun venit, {user.displayName || user.email}!
                        </p>
                    )}
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Tabs */}
                <div className="flex gap-4 mb-8 border-b border-[#f8d7e0] dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`flex items-center gap-2 px-6 py-3 font-medium transition-all border-b-2 -mb-px ${activeTab === 'orders'
                            ? 'border-[#d4849a] text-[#d4849a] dark:border-pink-400 dark:text-pink-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                    >
                        <Package className="w-5 h-5" />
                        Comenzile Mele ({orders.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('favorites')}
                        className={`flex items-center gap-2 px-6 py-3 font-medium transition-all border-b-2 -mb-px ${activeTab === 'favorites'
                            ? 'border-[#d4849a] text-[#d4849a] dark:border-pink-400 dark:text-pink-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                    >
                        <Heart className="w-5 h-5" />
                        Favorite ({favorites.length})
                    </button>
                </div>

                {/* Orders Tab */}
                {activeTab === 'orders' && (
                    <div>
                        {!isAuthenticated ? (
                            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                                <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    Autentifică-te pentru a vedea comenzile
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-6">
                                    Trebuie să fii autentificat pentru a vedea istoricul comenzilor tale.
                                </p>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                                <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    Nu ai comenzi încă
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-6">
                                    Explorează colecția noastră de cărți și plasează prima comandă!
                                </p>
                                <Link
                                    href="/books"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#f3c9d5] to-[#e8b4c4] text-gray-800 font-semibold rounded-xl hover:from-[#e8b4c4] hover:to-[#d4849a] transition-all"
                                >
                                    <ShoppingCart className="w-5 h-5" />
                                    Vezi Cărțile
                                </Link>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                                {/* Table Header */}
                                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-[#fdf5f7] dark:bg-gray-700 border-b border-[#f8d7e0] dark:border-gray-600 text-sm font-medium text-gray-500 dark:text-gray-400">
                                    <div className="col-span-3">ID Comandă</div>
                                    <div className="col-span-2">Data</div>
                                    <div className="col-span-2">Produse</div>
                                    <div className="col-span-2">Total</div>
                                    <div className="col-span-2">Status</div>
                                    <div className="col-span-1"></div>
                                </div>

                                {/* Orders List */}
                                <div className="divide-y divide-[#f8d7e0] dark:divide-gray-700">
                                    {orders.map((order) => {
                                        const orderId = order.id || order.orderId;
                                        const isExpanded = expandedOrder === orderId;
                                        const invoice = invoices[orderId];
                                        const shipment = shipments[orderId];

                                        return (
                                            <div key={orderId}>
                                                {/* Order Row */}
                                                <div
                                                    className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 hover:bg-[#fdf5f7] dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                                    onClick={() => toggleOrder(orderId)}
                                                >
                                                    <div className="md:col-span-3 flex items-center gap-3">
                                                        {getStatusIcon(order.status || 'placed')}
                                                        <div>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 md:hidden">ID: </span>
                                                            <span className="font-mono font-semibold text-gray-900 dark:text-white">
                                                                #{order.orderNumber || orderId.slice(0, 8).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-2 text-gray-600 dark:text-gray-300">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 md:hidden">Data: </span>
                                                        {formatDate(order.placedAt)}
                                                    </div>
                                                    <div className="md:col-span-2 text-gray-600 dark:text-gray-300">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 md:hidden">Produse: </span>
                                                        {order.lines.length} {order.lines.length === 1 ? 'produs' : 'produse'}
                                                    </div>
                                                    <div className="md:col-span-2 font-semibold text-gray-900 dark:text-white">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-normal md:hidden">Total: </span>
                                                        {(order.totalAmount || order.totalPrice || 0).toFixed(2)} {order.currency || 'lei'}
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status || 'placed')}`}>
                                                            {order.status || 'Plasată'}
                                                        </span>
                                                    </div>
                                                    <div className="md:col-span-1 flex justify-end">
                                                        {isExpanded ? (
                                                            <ChevronUp className="w-5 h-5 text-gray-400" />
                                                        ) : (
                                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Expanded Details */}
                                                {isExpanded && (
                                                    <div className="px-6 pb-6 bg-[#fdf5f7]/50 dark:bg-gray-700/30">
                                                        {/* Order Lines */}
                                                        <div className="mb-6">
                                                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Produse comandate</h4>
                                                            <div className="space-y-2">
                                                                {order.lines.map((line, index) => (
                                                                    <div key={index} className="flex justify-between items-center py-2 px-4 bg-white dark:bg-gray-800 rounded-lg">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-10 h-12 bg-gradient-to-br from-[#f3c9d5] to-[#e8b4c4] dark:from-gray-600 dark:to-gray-500 rounded flex items-center justify-center">
                                                                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                                                </svg>
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-medium text-gray-900 dark:text-white">{line.productCode}</p>
                                                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                                    {line.quantity} × {line.unitPrice.toFixed(2)} lei
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <span className="font-semibold text-gray-900 dark:text-white">
                                                                            {line.lineTotal.toFixed(2)} lei
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Invoice & Shipment Info */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {/* Invoice */}
                                                            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <FileText className="w-5 h-5 text-[#d4849a]" />
                                                                    <span className="font-medium text-gray-900 dark:text-white">Factură</span>
                                                                </div>
                                                                {invoice ? (
                                                                    <div className="text-sm text-gray-600 dark:text-gray-300">
                                                                        <p>Nr: {invoice.invoiceNumber}</p>
                                                                        <p>Total: {invoice.totalAmount.toFixed(2)} {invoice.currency}</p>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Nu există factură</p>
                                                                )}
                                                            </div>

                                                            {/* Shipment */}
                                                            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <Truck className="w-5 h-5 text-[#d4849a]" />
                                                                    <span className="font-medium text-gray-900 dark:text-white">Livrare</span>
                                                                </div>
                                                                {shipment ? (
                                                                    <div className="text-sm text-gray-600 dark:text-gray-300">
                                                                        <p>AWB: {shipment.awbNumber}</p>
                                                                        <p>Curier: {shipment.carrierName}</p>
                                                                        <p>Cost: {shipment.shippingCost.toFixed(2)} lei</p>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Nu există informații de livrare</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Favorites Tab */}
                {activeTab === 'favorites' && (
                    <div>
                        {favorites.length === 0 ? (
                            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
                                <Heart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                    Nu ai produse favorite
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-6">
                                    Adaugă cărți la favorite pentru a le găsi mai ușor!
                                </p>
                                <Link
                                    href="/books"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#f3c9d5] to-[#e8b4c4] text-gray-800 font-semibold rounded-xl hover:from-[#e8b4c4] hover:to-[#d4849a] transition-all"
                                >
                                    <ShoppingCart className="w-5 h-5" />
                                    Explorează Cărțile
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {favorites.map((product) => (
                                    <div
                                        key={product.code}
                                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                                    >
                                        <div className="aspect-[3/4] bg-gradient-to-br from-[#f3c9d5] to-[#e8b4c4] dark:from-gray-700 dark:to-gray-600 flex items-center justify-center relative">
                                            <svg className="w-16 h-16 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                            <button
                                                onClick={() => removeFromFavorites(product.code)}
                                                className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full text-red-500 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                                            >
                                                <Heart className="w-5 h-5 fill-current" />
                                            </button>
                                        </div>
                                        <div className="p-4">
                                            <span className="text-xs font-medium text-[#d4849a] dark:text-pink-400 uppercase tracking-wider">
                                                {product.category}
                                            </span>
                                            <h3 className="font-semibold text-gray-900 dark:text-white mt-1 line-clamp-2">
                                                {product.name}
                                            </h3>
                                            {product.author && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                    {product.author}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between mt-4">
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                                    {product.price.toFixed(2)} lei
                                                </span>
                                                <button
                                                    onClick={() => addToCart(product)}
                                                    disabled={product.stockQuantity === 0}
                                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#f3c9d5] to-[#e8b4c4] dark:from-gray-600 dark:to-gray-500 text-gray-800 dark:text-white text-sm font-medium rounded-lg hover:from-[#e8b4c4] hover:to-[#d4849a] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <ShoppingCart className="w-4 h-4" />
                                                    Adaugă
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
