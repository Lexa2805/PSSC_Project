namespace PSSC.Invoicing.Api.Domain.ValueObjects;

/// <summary>
/// Unique identifier for the invoice.
/// Format: "INV-{Year}-{SequenceNumber}" (e.g., "INV-2024-0001").
/// Cannot be null or empty.
/// </summary>
public readonly record struct InvoiceNumber
{
    public string Value { get; }
    public int Year { get; }
    public int SequenceNumber { get; }

    private InvoiceNumber(string value, int year, int sequenceNumber)
    {
        Value = value;
        Year = year;
        SequenceNumber = sequenceNumber;
    }

    public static InvoiceNumber Create(int year, int sequenceNumber)
    {
        if (!TryCreate(year, sequenceNumber, out var invoiceNumber, out var error))
        {
            throw new ArgumentException(error);
        }
        return invoiceNumber;
    }

    public static bool TryCreate(int year, int sequenceNumber, out InvoiceNumber invoiceNumber, out string? error)
    {
        error = null;
        invoiceNumber = default;

        if (year < 2000 || year > 2100)
        {
            error = "Year must be between 2000 and 2100";
            return false;
        }

        if (sequenceNumber < 1 || sequenceNumber > 999999999)
        {
            error = "Sequence number must be between 1 and 999999999";
            return false;
        }

        var value = $"INV-{year}-{sequenceNumber:D4}";
        invoiceNumber = new InvoiceNumber(value, year, sequenceNumber);
        return true;
    }

    /// <summary>
    /// Parses an invoice number from its string representation.
    /// Expected format: "INV-YYYY-NNNN"
    /// </summary>
    public static bool TryParse(string value, out InvoiceNumber invoiceNumber, out string? error)
    {
        error = null;
        invoiceNumber = default;

        if (string.IsNullOrWhiteSpace(value))
        {
            error = "Invoice number cannot be empty";
            return false;
        }

        var normalized = value.Trim().ToUpperInvariant();

        if (!normalized.StartsWith("INV-"))
        {
            error = "Invoice number must start with 'INV-'";
            return false;
        }

        var parts = normalized.Split('-');
        if (parts.Length != 3)
        {
            error = "Invoice number must be in format 'INV-YYYY-NNNN'";
            return false;
        }

        if (!int.TryParse(parts[1], out var year))
        {
            error = "Year must be a valid number";
            return false;
        }

        if (!int.TryParse(parts[2], out var sequenceNumber))
        {
            error = "Sequence number must be a valid number";
            return false;
        }

        return TryCreate(year, sequenceNumber, out invoiceNumber, out error);
    }

    /// <summary>
    /// Parses an invoice number from its string representation.
    /// Throws if parsing fails.
    /// </summary>
    public static InvoiceNumber Parse(string value)
    {
        if (!TryParse(value, out var invoiceNumber, out var error))
        {
            throw new ArgumentException(error, nameof(value));
        }
        return invoiceNumber;
    }

    /// <summary>
    /// Creates the next invoice number in sequence for the given year.
    /// </summary>
    public InvoiceNumber NextInSequence()
    {
        return Create(Year, SequenceNumber + 1);
    }

    /// <summary>
    /// Creates the first invoice number for a given year.
    /// </summary>
    public static InvoiceNumber FirstOfYear(int year)
    {
        return Create(year, 1);
    }

    public override string ToString() => Value;

    public static implicit operator string(InvoiceNumber number) => number.Value;
}
