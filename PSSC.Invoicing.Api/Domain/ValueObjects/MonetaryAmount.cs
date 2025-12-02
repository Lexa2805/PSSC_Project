namespace PSSC.Invoicing.Api.Domain.ValueObjects;

/// <summary>
/// Represents a sum of money and its currency.
/// Amount cannot be negative. Default currency is "RON".
/// </summary>
public readonly record struct MonetaryAmount
{
    public decimal Amount { get; }
    public string Currency { get; }

    private MonetaryAmount(decimal amount, string currency)
    {
        Amount = amount;
        Currency = currency;
    }

    public static MonetaryAmount Create(decimal amount, string currency = "RON")
    {
        if (!TryCreate(amount, out var monetaryAmount, out var error, currency))
        {
            throw new ArgumentException(error, nameof(amount));
        }
        return monetaryAmount;
    }

    public static bool TryCreate(decimal amount, out MonetaryAmount monetaryAmount, out string? error, string currency = "RON")
    {
        error = null;
        monetaryAmount = default;

        if (amount < 0)
        {
            error = "Amount cannot be negative";
            return false;
        }

        if (string.IsNullOrWhiteSpace(currency))
        {
            error = "Currency cannot be empty";
            return false;
        }

        monetaryAmount = new MonetaryAmount(Math.Round(amount, 2), currency.ToUpperInvariant());
        return true;
    }

    /// <summary>
    /// Creates a zero amount with the specified currency.
    /// </summary>
    public static MonetaryAmount Zero(string currency = "RON") => new(0, currency.ToUpperInvariant());

    /// <summary>
    /// Parses an amount from a string representation.
    /// </summary>
    public static bool TryParse(string value, out MonetaryAmount monetaryAmount, out string? error, string currency = "RON")
    {
        error = null;
        monetaryAmount = default;

        if (string.IsNullOrWhiteSpace(value))
        {
            error = "Amount cannot be empty";
            return false;
        }

        if (!decimal.TryParse(value, out var amount))
        {
            error = "Amount must be a valid number";
            return false;
        }

        return TryCreate(amount, out monetaryAmount, out error, currency);
    }

    /// <summary>
    /// Adds two monetary amounts together. Currencies must match.
    /// </summary>
    public MonetaryAmount Add(MonetaryAmount other)
    {
        if (Currency != other.Currency)
            throw new InvalidOperationException($"Cannot add amounts with different currencies: {Currency} and {other.Currency}");

        return new MonetaryAmount(Amount + other.Amount, Currency);
    }

    /// <summary>
    /// Multiplies the amount by a factor (useful for tax calculations).
    /// </summary>
    public MonetaryAmount Multiply(decimal factor)
    {
        if (factor < 0)
            throw new ArgumentException("Factor cannot be negative", nameof(factor));

        return new MonetaryAmount(Math.Round(Amount * factor, 2), Currency);
    }

    /// <summary>
    /// Multiplies the amount by an integer factor.
    /// </summary>
    public MonetaryAmount Multiply(int factor)
    {
        return Multiply((decimal)factor);
    }

    public override string ToString() => $"{Amount:F2} {Currency}";

    public static implicit operator decimal(MonetaryAmount amount) => amount.Amount;

    public static MonetaryAmount operator +(MonetaryAmount a, MonetaryAmount b) => a.Add(b);

    public static MonetaryAmount operator *(MonetaryAmount amount, decimal factor) => amount.Multiply(factor);

    public static MonetaryAmount operator *(MonetaryAmount amount, int factor) => amount.Multiply(factor);
}
