namespace PSSC.Sales.Api.Domain.ValueObjects;

public readonly record struct Quantity
{
    public int Value { get; }

    private Quantity(int value)
    {
        Value = value;
    }

    public static Quantity Create(int value)
    {
        if (value <= 0)
            throw new ArgumentException("Quantity must be greater than zero", nameof(value));

        if (value > 10000)
            throw new ArgumentException("Quantity cannot exceed 10000", nameof(value));

        return new Quantity(value);
    }

    public static bool TryCreate(int value, out Quantity quantity, out string? error)
    {
        error = null;
        quantity = default;

        if (value <= 0)
        {
            error = "Quantity must be greater than zero";
            return false;
        }

        if (value > 10000)
        {
            error = "Quantity cannot exceed 10000";
            return false;
        }

        quantity = new Quantity(value);
        return true;
    }

    public override string ToString() => Value.ToString();

    public static implicit operator int(Quantity quantity) => quantity.Value;

    public static Quantity operator +(Quantity a, Quantity b) => new(a.Value + b.Value);
    public static Quantity operator -(Quantity a, Quantity b) => Create(a.Value - b.Value);
}
