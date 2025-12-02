namespace PSSC.Invoicing.Api.Domain.ValueObjects;

/// <summary>
/// Romanian Fiscal Code (CUI/CIF) - The fiscal identification code for the client.
/// Format: Can optionally start with "RO" (case insensitive), followed by digits.
/// Validation: Must respect the control digit validation algorithm for Romanian CUI (test key 753217532).
/// </summary>
public readonly record struct FiscalCode
{
    public string Value { get; }

    /// <summary>
    /// The numeric part of the CUI (without the "RO" prefix)
    /// </summary>
    public string NumericValue { get; }

    /// <summary>
    /// Whether this is a VAT payer (has RO prefix)
    /// </summary>
    public bool IsVatPayer { get; }

    private FiscalCode(string value, string numericValue, bool isVatPayer)
    {
        Value = value;
        NumericValue = numericValue;
        IsVatPayer = isVatPayer;
    }

    /// <summary>
    /// Test key for Romanian CUI validation algorithm
    /// </summary>
    private static readonly int[] TestKey = { 7, 5, 3, 2, 1, 7, 5, 3, 2 };

    public static FiscalCode Create(string value)
    {
        if (!TryCreate(value, out var fiscalCode, out var error))
        {
            throw new ArgumentException(error, nameof(value));
        }
        return fiscalCode;
    }

    public static bool TryCreate(string value, out FiscalCode fiscalCode, out string? error)
    {
        error = null;
        fiscalCode = default;

        // Empty fiscal code is handled at the operation level (optional for individuals)
        if (string.IsNullOrWhiteSpace(value))
        {
            error = "Fiscal code (CUI) cannot be empty";
            return false;
        }

        // Normalize: remove spaces and convert to uppercase
        var normalized = value.Replace(" ", "").ToUpperInvariant();

        // Check for RO prefix
        bool isVatPayer = false;
        string numericPart;

        if (normalized.StartsWith("RO"))
        {
            isVatPayer = true;
            numericPart = normalized.Substring(2);
        }
        else
        {
            numericPart = normalized;
        }

        // Validate that the remaining part contains only digits
        if (!numericPart.All(char.IsDigit))
        {
            error = "Fiscal code must contain only digits (optionally prefixed with 'RO')";
            return false;
        }

        // CUI must have between 2 and 10 digits
        if (numericPart.Length < 2 || numericPart.Length > 10)
        {
            error = "Fiscal code must have between 2 and 10 digits";
            return false;
        }

        // Validate using the Romanian CUI control digit algorithm
        if (!ValidateCuiControlDigit(numericPart, out var validationError))
        {
            error = validationError;
            return false;
        }

        // Reconstruct the normalized value
        var finalValue = isVatPayer ? $"RO{numericPart}" : numericPart;

        fiscalCode = new FiscalCode(finalValue, numericPart, isVatPayer);
        return true;
    }

    /// <summary>
    /// Validates the Romanian CUI using the control digit algorithm.
    /// The algorithm uses the test key 753217532.
    /// </summary>
    private static bool ValidateCuiControlDigit(string cui, out string? error)
    {
        error = null;

        // The CUI should have at least 2 digits
        if (cui.Length < 2)
        {
            error = "CUI must have at least 2 digits";
            return false;
        }

        // Pad the CUI to 9 digits (excluding control digit) from the left with zeros
        // The last digit is the control digit
        var controlDigit = int.Parse(cui[^1].ToString());
        var cuiWithoutControl = cui[..^1];

        // Pad to 9 digits for calculation
        var paddedCui = cuiWithoutControl.PadLeft(9, '0');

        // Calculate the weighted sum
        int sum = 0;
        for (int i = 0; i < 9; i++)
        {
            sum += int.Parse(paddedCui[i].ToString()) * TestKey[i];
        }

        // Multiply by 10 and get the remainder when divided by 11
        var remainder = (sum * 10) % 11;

        // If remainder is 10, the control digit should be 0
        var expectedControlDigit = remainder == 10 ? 0 : remainder;

        if (controlDigit != expectedControlDigit)
        {
            error = $"Invalid CUI control digit. Expected {expectedControlDigit}, got {controlDigit}";
            return false;
        }

        return true;
    }

    /// <summary>
    /// Parses a fiscal code without throwing an exception.
    /// Returns null if parsing fails.
    /// </summary>
    public static FiscalCode? TryParse(string value)
    {
        return TryCreate(value, out var fiscalCode, out _) ? fiscalCode : null;
    }

    public override string ToString() => Value;

    public static implicit operator string(FiscalCode code) => code.Value;
}
