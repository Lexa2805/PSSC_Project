namespace PSSC.Sales.Api.Domain.ValueObjects;

public readonly record struct ProductCode
{
    public string Value { get; }

    private ProductCode(string value)
    {
        Value = value;
    }

    public static ProductCode Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Product code cannot be empty", nameof(value));

        if (value.Length < 3 || value.Length > 50)
            throw new ArgumentException("Product code must be between 3 and 50 characters", nameof(value));

        return new ProductCode(value.Trim().ToUpperInvariant());
    }

    public static bool TryCreate(string value, out ProductCode productCode, out string? error)
    {
        error = null;
        productCode = default;

        if (string.IsNullOrWhiteSpace(value))
        {
            error = "Product code cannot be empty";
            return false;
        }

        if (value.Length < 3 || value.Length > 50)
        {
            error = "Product code must be between 3 and 50 characters";
            return false;
        }

        productCode = new ProductCode(value.Trim().ToUpperInvariant());
        return true;
    }

    public override string ToString() => Value;

    public static implicit operator string(ProductCode code) => code.Value;
}
