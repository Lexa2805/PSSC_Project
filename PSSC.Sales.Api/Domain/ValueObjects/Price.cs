namespace PSSC.Sales.Api.Domain.ValueObjects;

public readonly record struct Price
{
    public decimal Value { get; }
    public string Currency { get; }

    private Price(decimal value, string currency)
    {
        Value = value;
        Currency = currency;
    }

    public static Price Create(decimal value, string currency = "RON")
    {
        if (value < 0)
            throw new ArgumentException("Price cannot be negative", nameof(value));

        if (string.IsNullOrWhiteSpace(currency))
            throw new ArgumentException("Currency cannot be empty", nameof(currency));

        return new Price(Math.Round(value, 2), currency.ToUpperInvariant());
    }

    public static bool TryCreate(decimal value, out Price price, out string? error, string currency = "RON")
    {
        error = null;
        price = default;

        if (value < 0)
        {
            error = "Price cannot be negative";
            return false;
        }

        if (string.IsNullOrWhiteSpace(currency))
        {
            error = "Currency cannot be empty";
            return false;
        }

        price = new Price(Math.Round(value, 2), currency.ToUpperInvariant());
        return true;
    }

    public static Price Zero(string currency = "RON") => new(0, currency);

    public override string ToString() => $"{Value:F2} {Currency}";

    public static implicit operator decimal(Price price) => price.Value;

    public static Price operator +(Price a, Price b)
    {
        if (a.Currency != b.Currency)
            throw new InvalidOperationException($"Cannot add prices with different currencies: {a.Currency} and {b.Currency}");

        return new Price(a.Value + b.Value, a.Currency);
    }

    public static Price operator *(Price price, Quantity quantity) =>
        new(price.Value * quantity.Value, price.Currency);

    public static Price operator *(Price price, int multiplier) =>
        new(price.Value * multiplier, price.Currency);
}
