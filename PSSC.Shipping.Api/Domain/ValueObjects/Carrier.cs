namespace PSSC.Shipping.Api.Domain.ValueObjects;

/// <summary>
/// Represents a shipping carrier/courier company.
/// </summary>
public readonly record struct Carrier
{
    public string Code { get; }
    public string Name { get; }
    public decimal BaseCost { get; }

    private Carrier(string code, string name, decimal baseCost)
    {
        Code = code;
        Name = name;
        BaseCost = baseCost;
    }

    // Predefined carriers
    public static Carrier FanCourier => new("FAN", "Fan Courier", 15.00m);
    public static Carrier Cargus => new("CGS", "Cargus", 14.50m);
    public static Carrier DPD => new("DPD", "DPD Romania", 16.00m);
    public static Carrier Sameday => new("SMD", "Sameday", 18.00m);
    public static Carrier GLS => new("GLS", "GLS Romania", 17.00m);

    public static Carrier Create(string code, string name, decimal baseCost)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Carrier code is required", nameof(code));

        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Carrier name is required", nameof(name));

        if (baseCost < 0)
            throw new ArgumentException("Base cost cannot be negative", nameof(baseCost));

        return new Carrier(code.ToUpperInvariant(), name, baseCost);
    }

    public static Carrier GetDefault() => FanCourier;

    public static Carrier? GetByCode(string code)
    {
        return code.ToUpperInvariant() switch
        {
            "FAN" => FanCourier,
            "CGS" => Cargus,
            "DPD" => DPD,
            "SMD" => Sameday,
            "GLS" => GLS,
            _ => null
        };
    }

    public static IReadOnlyList<Carrier> GetAll() => new[]
    {
        FanCourier,
        Cargus,
        DPD,
        Sameday,
        GLS
    };

    public override string ToString() => $"{Name} ({Code})";
}
