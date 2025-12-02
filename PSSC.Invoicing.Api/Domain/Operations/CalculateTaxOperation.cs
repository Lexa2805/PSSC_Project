using PSSC.Invoicing.Api.Domain.Entities;
using PSSC.Invoicing.Api.Domain.ValueObjects;

namespace PSSC.Invoicing.Api.Domain.Operations;

/// <summary>
/// Interface for CalculateTaxOperation.
/// </summary>
public interface ICalculateTaxOperation
{
    /// <summary>
    /// Calculates VAT and total amounts for a validated invoice.
    /// </summary>
    /// <param name="invoice">The validated invoice.</param>
    /// <returns>CalculatedInvoice with VAT applied.</returns>
    CalculatedInvoice Execute(ValidatedInvoice invoice);
}

/// <summary>
/// Calculates taxes (VAT) for a validated invoice.
/// Input: ValidatedInvoice
/// Output: CalculatedInvoice
/// Dependencies: None (pure calculation)
/// 
/// Logic:
/// - Standard VAT rate = 19%
/// - VatAmount = Amount * 0.19
/// - TotalWithVat = Amount + VatAmount
/// </summary>
public class CalculateTaxOperation : ICalculateTaxOperation
{
    /// <summary>
    /// Standard Romanian VAT rate (19%)
    /// </summary>
    public const decimal StandardVatRate = 0.19m;

    /// <summary>
    /// Reduced VAT rate for certain goods (9%)
    /// </summary>
    public const decimal ReducedVatRate = 0.09m;

    /// <summary>
    /// Super-reduced VAT rate for books (5%)
    /// </summary>
    public const decimal SuperReducedVatRate = 0.05m;

    private readonly decimal _vatRate;

    /// <summary>
    /// Creates a new CalculateTaxOperation with the standard VAT rate (19%).
    /// </summary>
    public CalculateTaxOperation() : this(StandardVatRate)
    {
    }

    /// <summary>
    /// Creates a new CalculateTaxOperation with a custom VAT rate.
    /// </summary>
    /// <param name="vatRate">The VAT rate to apply (e.g., 0.19 for 19%).</param>
    public CalculateTaxOperation(decimal vatRate)
    {
        if (vatRate < 0 || vatRate > 1)
            throw new ArgumentException("VAT rate must be between 0 and 1", nameof(vatRate));

        _vatRate = vatRate;
    }

    /// <summary>
    /// Calculates VAT and total amounts for a validated invoice.
    /// </summary>
    public CalculatedInvoice Execute(ValidatedInvoice invoice)
    {
        // Calculate VAT amount: NetTotal * VatRate
        var vatAmount = invoice.NetTotal.Multiply(_vatRate);

        // Calculate total with VAT: NetTotal + VatAmount
        var totalWithVat = invoice.NetTotal.Add(vatAmount);

        return new CalculatedInvoice(
            invoice,
            vatAmount,
            totalWithVat,
            _vatRate
        );
    }
}
