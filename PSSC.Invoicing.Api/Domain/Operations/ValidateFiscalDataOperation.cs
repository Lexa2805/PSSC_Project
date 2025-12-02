using PSSC.Invoicing.Api.Domain.Entities;
using PSSC.Invoicing.Api.Domain.ValueObjects;

namespace PSSC.Invoicing.Api.Domain.Operations;

/// <summary>
/// Interface for ValidateFiscalDataOperation.
/// </summary>
public interface IValidateFiscalDataOperation
{
    /// <summary>
    /// Validates the fiscal data from an unvalidated invoice.
    /// </summary>
    /// <param name="invoice">The unvalidated invoice to validate.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Either a ValidatedInvoice or InvalidInvoice.</returns>
    Task<IInvoice> ExecuteAsync(UnvalidatedInvoice invoice, CancellationToken cancellationToken = default);
}

/// <summary>
/// Validates fiscal data from an unvalidated invoice.
/// Input: UnvalidatedInvoice
/// Output: ValidatedInvoice or InvalidInvoice
/// Dependencies: Func&lt;FiscalCode, bool&gt; checkCompanyActive (Checks if the company is active in ANAF)
/// </summary>
public class ValidateFiscalDataOperation : IValidateFiscalDataOperation
{
    private readonly Func<FiscalCode, Task<bool>> _checkCompanyActive;

    /// <summary>
    /// Creates a new instance of ValidateFiscalDataOperation.
    /// </summary>
    /// <param name="checkCompanyActive">
    /// Function to check if a company is active in ANAF registry.
    /// This should be injected - can be mocked for testing.
    /// </param>
    public ValidateFiscalDataOperation(Func<FiscalCode, Task<bool>> checkCompanyActive)
    {
        _checkCompanyActive = checkCompanyActive ?? throw new ArgumentNullException(nameof(checkCompanyActive));
    }

    /// <summary>
    /// Validates the fiscal data from an unvalidated invoice.
    /// </summary>
    public async Task<IInvoice> ExecuteAsync(UnvalidatedInvoice invoice, CancellationToken cancellationToken = default)
    {
        var errors = new List<string>();

        // Step 1: Parse and validate FiscalCode (OPTIONAL - for individuals without CUI)
        FiscalCode? fiscalCode = null;
        bool hasFiscalCode = !string.IsNullOrWhiteSpace(invoice.FiscalCode);
        
        if (hasFiscalCode)
        {
            if (!FiscalCode.TryCreate(invoice.FiscalCode, out var parsedFiscalCode, out var fiscalCodeError))
            {
                errors.Add($"Invalid Fiscal Code: {fiscalCodeError}");
            }
            else
            {
                fiscalCode = parsedFiscalCode;
            }
        }

        // Step 2: Parse and validate BillingAddress
        if (!BillingAddress.TryParse(invoice.Address, out var billingAddress, out var addressError))
        {
            errors.Add($"Invalid Address: {addressError}");
        }

        // Step 3: Parse and validate OrderTotal as MonetaryAmount
        if (!MonetaryAmount.TryParse(invoice.OrderTotal, out var netTotal, out var amountError))
        {
            errors.Add($"Invalid Order Total: {amountError}");
        }

        // Step 4: Validate client name
        if (string.IsNullOrWhiteSpace(invoice.ClientName))
        {
            errors.Add("Client name is required");
        }

        // Step 5: Validate order lines
        if (!invoice.OrderLines.Any())
        {
            errors.Add("Invoice must have at least one order line");
        }

        // If we have parsing errors, return InvalidInvoice immediately
        if (errors.Any())
        {
            return Invoice.Invalid(invoice.OrderId, errors);
        }

        // Step 6: Check if the company is active in ANAF (only if fiscal code provided)
        if (fiscalCode.HasValue)
        {
            try
            {
                var isActive = await _checkCompanyActive(fiscalCode.Value);
                if (!isActive)
                {
                    errors.Add($"Company with fiscal code {fiscalCode.Value} is not active in ANAF registry");
                }
            }
            catch (Exception ex)
            {
                errors.Add($"Failed to verify company status in ANAF: {ex.Message}");
            }
        }

        // If ANAF validation failed, return InvalidInvoice
        if (errors.Any())
        {
            return Invoice.Invalid(invoice.OrderId, errors);
        }

        // All validations passed - return ValidatedInvoice
        return new ValidatedInvoice(
            invoice.OrderId,
            fiscalCode,
            invoice.ClientName.Trim(),
            billingAddress,
            netTotal,
            invoice.OrderLines,
            invoice.ReceivedAt
        );
    }
}

/// <summary>
/// Mock implementation of ANAF company check for development/testing.
/// In production, this would call the actual ANAF API.
/// </summary>
public static class AnafCompanyChecker
{
    /// <summary>
    /// Creates a mock ANAF checker that returns true for all companies.
    /// Use this for testing and development.
    /// </summary>
    public static Func<FiscalCode, Task<bool>> CreateMockChecker(bool defaultResult = true)
    {
        return fiscalCode => Task.FromResult(defaultResult);
    }

    /// <summary>
    /// Creates a mock ANAF checker that checks against a list of known active companies.
    /// </summary>
    public static Func<FiscalCode, Task<bool>> CreateMockCheckerWithList(IEnumerable<string> activeFiscalCodes)
    {
        var activeSet = new HashSet<string>(activeFiscalCodes, StringComparer.OrdinalIgnoreCase);
        return fiscalCode => Task.FromResult(activeSet.Contains(fiscalCode.NumericValue));
    }

    /// <summary>
    /// In a real implementation, this would call the ANAF API.
    /// ANAF provides a public API for checking company status.
    /// API: https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva
    /// </summary>
    public static async Task<bool> CheckCompanyInAnaf(FiscalCode fiscalCode)
    {
        // TODO: Implement actual ANAF API call
        // For now, this is a mock that always returns true
        await Task.Delay(100); // Simulate API call
        return true;
    }
}
