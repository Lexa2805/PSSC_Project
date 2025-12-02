'use client';

import { useState, useEffect } from 'react';
import { ShippingFormData, Carrier, ValidateAddressResponse, CalculateShippingResponse } from '@/types';
import { getCarriers, validateDeliveryAddress, calculateShipping } from '@/lib/api';
import { MapPin, Phone, Truck, CheckCircle, AlertCircle, Loader2, Building2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShippingFormProps {
    onSubmit: (data: ShippingFormData) => void;
    onBack: () => void;
    isSubmitting: boolean;
    totalWeight?: number;
}

export function ShippingForm({ onSubmit, onBack, isSubmitting, totalWeight = 1 }: ShippingFormProps) {
    const [formData, setFormData] = useState<ShippingFormData>({
        city: '',
        street: '',
        zipCode: '',
        contactPhone: '',
        preferredCarrierCode: undefined,
    });

    const [carriers, setCarriers] = useState<Carrier[]>([]);
    const [loadingCarriers, setLoadingCarriers] = useState(true);
    const [addressValidation, setAddressValidation] = useState<ValidateAddressResponse | null>(null);
    const [isValidatingAddress, setIsValidatingAddress] = useState(false);
    const [addressTouched, setAddressTouched] = useState(false);
    const [shippingEstimate, setShippingEstimate] = useState<CalculateShippingResponse | null>(null);

    // Load carriers on mount
    useEffect(() => {
        const loadCarriers = async () => {
            try {
                const data = await getCarriers();
                setCarriers(data);
                // Set default carrier
                if (data.length > 0) {
                    setFormData(prev => ({ ...prev, preferredCarrierCode: data[0].code }));
                }
            } catch (error) {
                console.error('Failed to load carriers:', error);
            } finally {
                setLoadingCarriers(false);
            }
        };
        loadCarriers();
    }, []);

    // Debounced address validation
    useEffect(() => {
        if (!addressTouched || !formData.city || !formData.street || !formData.zipCode || !formData.contactPhone) {
            setAddressValidation(null);
            return;
        }

        const timer = setTimeout(async () => {
            setIsValidatingAddress(true);
            try {
                const result = await validateDeliveryAddress({
                    city: formData.city,
                    street: formData.street,
                    zipCode: formData.zipCode,
                    contactPhone: formData.contactPhone,
                });
                setAddressValidation(result);
            } catch (error) {
                console.error('Failed to validate address:', error);
                setAddressValidation({
                    isValid: false,
                    error: 'Validarea adresei a eșuat. Încearcă din nou.',
                });
            } finally {
                setIsValidatingAddress(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.city, formData.street, formData.zipCode, formData.contactPhone, addressTouched]);

    // Calculate shipping when carrier changes
    useEffect(() => {
        if (!formData.preferredCarrierCode) return;

        const calculate = async () => {
            try {
                const result = await calculateShipping({
                    carrierCode: formData.preferredCarrierCode!,
                    totalWeight: totalWeight,
                });
                setShippingEstimate(result);
            } catch (error) {
                console.error('Failed to calculate shipping:', error);
            }
        };
        calculate();
    }, [formData.preferredCarrierCode, totalWeight]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCarrierChange = (carrierCode: string) => {
        setFormData(prev => ({ ...prev, preferredCarrierCode: carrierCode }));
    };

    const handleAddressBlur = () => {
        setAddressTouched(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isFormValid) {
            onSubmit(formData);
        }
    };

    // Phone validation (Romanian format)
    const isPhoneValid = /^(\+40|0)[0-9]{9}$/.test(formData.contactPhone.replace(/\s/g, ''));
    
    // Form is valid if all fields are filled and address is valid
    const isFormValid =
        formData.city.trim() !== '' &&
        formData.street.trim() !== '' &&
        formData.zipCode.trim() !== '' &&
        isPhoneValid &&
        (!addressTouched || addressValidation?.isValid === true);

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
                    Adresă de Livrare
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Completează datele pentru livrarea comenzii
                </p>
            </div>

            {/* Street */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Strada și Număr *
                </label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        name="street"
                        value={formData.street}
                        onChange={handleChange}
                        onBlur={handleAddressBlur}
                        placeholder="ex: Strada Victoriei Nr. 10, Ap. 5"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#f8d7e0] dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f3c9d5] dark:focus:ring-gray-500 focus:border-transparent"
                        required
                    />
                </div>
            </div>

            {/* City and Zip Code Row */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Oraș *
                    </label>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            onBlur={handleAddressBlur}
                            placeholder="București"
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#f8d7e0] dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f3c9d5] dark:focus:ring-gray-500 focus:border-transparent"
                            required
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Cod Poștal *
                    </label>
                    <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleChange}
                        onBlur={handleAddressBlur}
                        placeholder="010101"
                        maxLength={6}
                        className="w-full px-4 py-3 rounded-xl border border-[#f8d7e0] dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f3c9d5] dark:focus:ring-gray-500 focus:border-transparent"
                        required
                    />
                </div>
            </div>

            {/* Contact Phone */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Telefon de Contact *
                </label>
                <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="tel"
                        name="contactPhone"
                        value={formData.contactPhone}
                        onChange={handleChange}
                        onBlur={handleAddressBlur}
                        placeholder="0722 123 456"
                        className={cn(
                            "w-full pl-10 pr-4 py-3 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent",
                            formData.contactPhone && !isPhoneValid
                                ? "border-red-400 focus:ring-red-300"
                                : "border-[#f8d7e0] dark:border-gray-600 focus:ring-[#f3c9d5] dark:focus:ring-gray-500"
                        )}
                        required
                    />
                </div>
                {formData.contactPhone && !isPhoneValid && (
                    <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Format valid: 0722123456 sau +40722123456
                    </p>
                )}
            </div>

            {/* Address Validation Status */}
            {addressTouched && formData.city && formData.street && formData.zipCode && formData.contactPhone && (
                <div className={cn(
                    "p-3 rounded-xl flex items-center gap-2",
                    isValidatingAddress
                        ? "bg-gray-50 dark:bg-gray-800"
                        : addressValidation?.isValid
                            ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                            : addressValidation?.isValid === false
                                ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                                : "bg-gray-50 dark:bg-gray-800"
                )}>
                    {isValidatingAddress ? (
                        <>
                            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Se validează adresa...</span>
                        </>
                    ) : addressValidation?.isValid ? (
                        <>
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <div>
                                <span className="text-sm font-medium text-green-700 dark:text-green-300">Adresă validă</span>
                                {addressValidation.normalizedAddress && (
                                    <p className="text-xs text-green-600 dark:text-green-400">{addressValidation.normalizedAddress}</p>
                                )}
                            </div>
                        </>
                    ) : addressValidation?.isValid === false ? (
                        <>
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            <span className="text-sm text-red-700 dark:text-red-300">{addressValidation.error || 'Adresa nu este validă'}</span>
                        </>
                    ) : null}
                </div>
            )}

            {/* Carrier Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Curier Preferat
                </label>
                {loadingCarriers ? (
                    <div className="flex items-center gap-2 text-gray-500">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Se încarcă curierii...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {carriers.map((carrier) => (
                            <button
                                key={carrier.code}
                                type="button"
                                onClick={() => handleCarrierChange(carrier.code)}
                                className={cn(
                                    "flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                                    formData.preferredCarrierCode === carrier.code
                                        ? "border-[#d4849a] bg-[#fdf5f7] dark:bg-gray-800"
                                        : "border-gray-200 dark:border-gray-600 hover:border-[#f3c9d5]"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center",
                                        formData.preferredCarrierCode === carrier.code
                                            ? "bg-[#f3c9d5] dark:bg-gray-600"
                                            : "bg-gray-100 dark:bg-gray-700"
                                    )}>
                                        <Truck className={cn(
                                            "w-5 h-5",
                                            formData.preferredCarrierCode === carrier.code
                                                ? "text-[#d4849a] dark:text-white"
                                                : "text-gray-500 dark:text-gray-400"
                                        )} />
                                    </div>
                                    <div className="text-left">
                                        <p className={cn(
                                            "font-semibold",
                                            formData.preferredCarrierCode === carrier.code
                                                ? "text-gray-800 dark:text-white"
                                                : "text-gray-600 dark:text-gray-300"
                                        )}>
                                            {carrier.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            De la {carrier.baseCost.toFixed(2)} lei
                                        </p>
                                    </div>
                                </div>
                                {formData.preferredCarrierCode === carrier.code && (
                                    <CheckCircle className="w-5 h-5 text-[#d4849a] dark:text-green-400" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Shipping Estimate */}
            {shippingEstimate && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <span className="font-semibold text-blue-800 dark:text-blue-300">Estimare Livrare</span>
                    </div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-blue-600 dark:text-blue-400">Cost livrare</span>
                            <span className="font-bold text-blue-800 dark:text-blue-300">{shippingEstimate.totalCost.toFixed(2)} {shippingEstimate.currency}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-blue-600 dark:text-blue-400">Livrare estimată</span>
                            <span className="text-blue-800 dark:text-blue-300">{shippingEstimate.estimatedDays} {shippingEstimate.estimatedDays === 1 ? 'zi' : 'zile'} lucrătoare</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="pt-4 space-y-3">
                <button
                    type="submit"
                    disabled={!isFormValid || isSubmitting}
                    className="w-full py-4 bg-gradient-to-r from-[#f3c9d5] to-[#e8b4c4] dark:from-gray-600 dark:to-gray-500 text-gray-800 dark:text-white rounded-xl font-bold text-lg hover:from-[#e8b4c4] hover:to-[#d4849a] dark:hover:from-gray-500 dark:hover:to-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Se procesează...
                        </>
                    ) : (
                        <>
                            <Truck className="w-5 h-5" />
                            Continuă la Facturare
                        </>
                    )}
                </button>

                <button
                    type="button"
                    onClick={onBack}
                    disabled={isSubmitting}
                    className="w-full py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors text-sm disabled:opacity-50"
                >
                    ← Înapoi la coș
                </button>
            </div>
        </form>
    );
}
