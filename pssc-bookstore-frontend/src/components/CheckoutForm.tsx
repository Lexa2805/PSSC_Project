'use client';

import { useState, useEffect } from 'react';
import { CheckoutFormData, ValidateFiscalCodeResponse } from '@/types';
import { validateFiscalCode } from '@/lib/api';
import { User, Building2, MapPin, Mail, CheckCircle, AlertCircle, Loader2, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckoutFormProps {
    onSubmit: (data: CheckoutFormData) => void;
    onBack: () => void;
    isSubmitting: boolean;
}

export function CheckoutForm({ onSubmit, onBack, isSubmitting }: CheckoutFormProps) {
    const [formData, setFormData] = useState<CheckoutFormData>({
        clientName: '',
        fiscalCode: '',
        isCompany: false,
        billingAddress: '',
        email: '',
    });

    const [fiscalCodeValidation, setFiscalCodeValidation] = useState<ValidateFiscalCodeResponse | null>(null);
    const [isValidatingFiscalCode, setIsValidatingFiscalCode] = useState(false);
    const [fiscalCodeTouched, setFiscalCodeTouched] = useState(false);

    // Debounced fiscal code validation (only when isCompany is true)
    useEffect(() => {
        if (!formData.isCompany || !fiscalCodeTouched || !formData.fiscalCode?.trim()) {
            setFiscalCodeValidation(null);
            return;
        }

        const timer = setTimeout(async () => {
            setIsValidatingFiscalCode(true);
            try {
                const result = await validateFiscalCode(formData.fiscalCode!);
                setFiscalCodeValidation(result);
                // Update form with normalized value if valid
                if (result.isValid && result.normalizedValue) {
                    setFormData(prev => ({ ...prev, fiscalCode: result.normalizedValue! }));
                }
            } catch (error) {
                console.error('Failed to validate fiscal code:', error);
                setFiscalCodeValidation({
                    isValid: false,
                    isVatPayer: false,
                    error: 'Validarea a eșuat. Încearcă din nou.',
                });
            } finally {
                setIsValidatingFiscalCode(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.fiscalCode, formData.isCompany, fiscalCodeTouched]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCompanyToggle = (isCompany: boolean) => {
        setFormData(prev => ({ 
            ...prev, 
            isCompany,
            fiscalCode: isCompany ? prev.fiscalCode : '' 
        }));
        setFiscalCodeValidation(null);
        setFiscalCodeTouched(false);
    };

    const handleFiscalCodeBlur = () => {
        setFiscalCodeTouched(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isFormValid) {
            onSubmit(formData);
        }
    };

    // Form is valid if:
    // - Client name is filled
    // - Email is filled and valid format
    // - Billing address is filled
    // - If company: fiscal code must be valid
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    const isFiscalCodeValid = !formData.isCompany || (fiscalCodeValidation?.isValid === true);
    
    const isFormValid =
        formData.clientName.trim() !== '' &&
        formData.email.trim() !== '' &&
        isEmailValid &&
        formData.billingAddress.trim() !== '' &&
        isFiscalCodeValid;

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
                    Date Facturare
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Completează datele pentru generarea facturii
                </p>
            </div>

            {/* Customer Type Toggle */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tip Client
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => handleCompanyToggle(false)}
                        className={cn(
                            "flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                            !formData.isCompany
                                ? "border-[#d4849a] bg-[#fdf5f7] text-[#d4849a]"
                                : "border-gray-200 dark:border-gray-600 hover:border-[#f3c9d5] text-gray-600 dark:text-gray-400"
                        )}
                    >
                        <UserCircle className="w-5 h-5" />
                        <span className="font-medium">Persoană Fizică</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleCompanyToggle(true)}
                        className={cn(
                            "flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                            formData.isCompany
                                ? "border-[#d4849a] bg-[#fdf5f7] text-[#d4849a]"
                                : "border-gray-200 dark:border-gray-600 hover:border-[#f3c9d5] text-gray-600 dark:text-gray-400"
                        )}
                    >
                        <Building2 className="w-5 h-5" />
                        <span className="font-medium">Companie</span>
                    </button>
                </div>
            </div>

            {/* Client Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {formData.isCompany ? 'Nume Companie *' : 'Nume și Prenume *'}
                </label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        name="clientName"
                        value={formData.clientName}
                        onChange={handleChange}
                        placeholder={formData.isCompany ? "ex: SC Exemplu SRL" : "ex: Ion Popescu"}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#f8d7e0] dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f3c9d5] dark:focus:ring-gray-500 focus:border-transparent"
                        required
                    />
                </div>
            </div>

            {/* Fiscal Code (CUI) - Only for companies */}
            {formData.isCompany && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Cod Fiscal (CUI) *
                    </label>
                    <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            name="fiscalCode"
                            value={formData.fiscalCode || ''}
                            onChange={handleChange}
                            onBlur={handleFiscalCodeBlur}
                            placeholder="ex: RO18547290"
                            className={cn(
                                "w-full pl-10 pr-12 py-3 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent",
                                fiscalCodeValidation?.isValid === true
                                    ? "border-green-400 focus:ring-green-300"
                                    : fiscalCodeValidation?.isValid === false
                                        ? "border-red-400 focus:ring-red-300"
                                        : "border-[#f8d7e0] dark:border-gray-600 focus:ring-[#f3c9d5] dark:focus:ring-gray-500"
                            )}
                            required={formData.isCompany}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isValidatingFiscalCode && (
                                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                            )}
                            {!isValidatingFiscalCode && fiscalCodeValidation?.isValid === true && (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            )}
                            {!isValidatingFiscalCode && fiscalCodeValidation?.isValid === false && (
                                <AlertCircle className="w-5 h-5 text-red-500" />
                            )}
                        </div>
                    </div>
                    {fiscalCodeValidation && (
                        <div className={cn(
                            "mt-2 text-sm flex items-center gap-1.5",
                            fiscalCodeValidation.isValid ? "text-green-600" : "text-red-600"
                        )}>
                            {fiscalCodeValidation.isValid ? (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    <span>
                                        Cod valid{fiscalCodeValidation.isVatPayer && ' - Plătitor TVA'}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="w-4 h-4" />
                                    <span>{fiscalCodeValidation.error || 'Cod fiscal invalid'}</span>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Email - Required */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email * <span className="text-gray-400 font-normal">(pentru primirea facturii)</span>
                </label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="exemplu@email.com"
                        className={cn(
                            "w-full pl-10 pr-4 py-3 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent",
                            formData.email && !isEmailValid
                                ? "border-red-400 focus:ring-red-300"
                                : "border-[#f8d7e0] dark:border-gray-600 focus:ring-[#f3c9d5] dark:focus:ring-gray-500"
                        )}
                        required
                    />
                </div>
                {formData.email && !isEmailValid && (
                    <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Introdu o adresă de email validă
                    </p>
                )}
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    📧 Factura va fi trimisă automat la această adresă
                </p>
            </div>

            {/* Billing Address */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Adresă Facturare *
                </label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <textarea
                        name="billingAddress"
                        value={formData.billingAddress}
                        onChange={handleChange}
                        placeholder="Str. Exemplu nr. 10, București, 010101"
                        rows={2}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#f8d7e0] dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f3c9d5] dark:focus:ring-gray-500 focus:border-transparent resize-none"
                        required
                    />
                </div>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    📍 Format: Stradă, Oraș, Cod Poștal (ex: Str. Victoriei 10, București, 010101)
                </p>
            </div>

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
                            Se generează factura...
                        </>
                    ) : (
                        <>
                            <Mail className="w-5 h-5" />
                            Finalizează și Trimite Factură
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
