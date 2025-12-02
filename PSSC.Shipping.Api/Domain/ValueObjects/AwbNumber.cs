namespace PSSC.Shipping.Api.Domain.ValueObjects;

/// <summary>
/// AWB (Air Waybill) Number - unique identifier for the shipment.
/// Format: CARRIER-YYYYMMDD-XXXXXXXX (e.g., FAN-20251202-12345678)
/// </summary>
public readonly record struct AwbNumber
{
    public string Value { get; }
    public string CarrierPrefix { get; }
    public string DatePart { get; }
    public string SequencePart { get; }

    private AwbNumber(string value, string carrierPrefix, string datePart, string sequencePart)
    {
        Value = value;
        CarrierPrefix = carrierPrefix;
        DatePart = datePart;
        SequencePart = sequencePart;
    }

    /// <summary>
    /// Creates a new AWB number from its parts.
    /// </summary>
    public static AwbNumber Create(string carrierPrefix, DateTime date, long sequenceNumber)
    {
        if (string.IsNullOrWhiteSpace(carrierPrefix))
            throw new ArgumentException("Carrier prefix is required", nameof(carrierPrefix));

        if (carrierPrefix.Length < 2 || carrierPrefix.Length > 5)
            throw new ArgumentException("Carrier prefix must be 2-5 characters", nameof(carrierPrefix));

        if (sequenceNumber < 0)
            throw new ArgumentException("Sequence number must be non-negative", nameof(sequenceNumber));

        var normalizedPrefix = carrierPrefix.ToUpperInvariant();
        var datePart = date.ToString("yyyyMMdd");
        var sequencePart = sequenceNumber.ToString("D8");

        var value = $"{normalizedPrefix}-{datePart}-{sequencePart}";

        return new AwbNumber(value, normalizedPrefix, datePart, sequencePart);
    }

    /// <summary>
    /// Tries to parse an AWB number from a string.
    /// </summary>
    public static bool TryParse(string awbString, out AwbNumber awbNumber, out string? error)
    {
        error = null;
        awbNumber = default;

        if (string.IsNullOrWhiteSpace(awbString))
        {
            error = "AWB number is required";
            return false;
        }

        var parts = awbString.Split('-');

        if (parts.Length != 3)
        {
            error = "AWB number must be in format CARRIER-YYYYMMDD-XXXXXXXX";
            return false;
        }

        var carrierPrefix = parts[0];
        var datePart = parts[1];
        var sequencePart = parts[2];

        if (carrierPrefix.Length < 2 || carrierPrefix.Length > 5)
        {
            error = "Carrier prefix must be 2-5 characters";
            return false;
        }

        if (datePart.Length != 8 || !datePart.All(char.IsDigit))
        {
            error = "Date part must be 8 digits (YYYYMMDD)";
            return false;
        }

        if (sequencePart.Length != 8 || !sequencePart.All(char.IsDigit))
        {
            error = "Sequence part must be 8 digits";
            return false;
        }

        awbNumber = new AwbNumber(awbString, carrierPrefix.ToUpperInvariant(), datePart, sequencePart);
        return true;
    }

    public override string ToString() => Value;

    public static implicit operator string(AwbNumber awb) => awb.Value;
}
