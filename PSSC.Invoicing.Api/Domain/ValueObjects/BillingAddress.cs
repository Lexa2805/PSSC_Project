namespace PSSC.Invoicing.Api.Domain.ValueObjects;

/// <summary>
/// The invoicing/billing address.
/// Properties: City, Street, ZipCode - All fields are mandatory.
/// </summary>
public readonly record struct BillingAddress
{
    public string City { get; }
    public string Street { get; }
    public string ZipCode { get; }

    private BillingAddress(string city, string street, string zipCode)
    {
        City = city;
        Street = street;
        ZipCode = zipCode;
    }

    public static BillingAddress Create(string city, string street, string zipCode)
    {
        if (!TryCreate(city, street, zipCode, out var address, out var error))
        {
            throw new ArgumentException(error);
        }
        return address;
    }

    public static bool TryCreate(string city, string street, string zipCode, out BillingAddress billingAddress, out string? error)
    {
        error = null;
        billingAddress = default;

        if (string.IsNullOrWhiteSpace(city))
        {
            error = "City is required";
            return false;
        }

        if (string.IsNullOrWhiteSpace(street))
        {
            error = "Street is required";
            return false;
        }

        if (string.IsNullOrWhiteSpace(zipCode))
        {
            error = "ZipCode is required";
            return false;
        }

        // Normalize: trim whitespace
        var normalizedCity = city.Trim();
        var normalizedStreet = street.Trim();
        var normalizedZipCode = zipCode.Trim();

        // Validate city length
        if (normalizedCity.Length < 2 || normalizedCity.Length > 100)
        {
            error = "City must be between 2 and 100 characters";
            return false;
        }

        // Validate street length
        if (normalizedStreet.Length < 2 || normalizedStreet.Length > 200)
        {
            error = "Street must be between 2 and 200 characters";
            return false;
        }

        // Validate zip code format (flexible)
        if (!IsValidZipCode(normalizedZipCode))
        {
            error = "ZipCode must be between 3 and 10 characters";
            return false;
        }

        billingAddress = new BillingAddress(normalizedCity, normalizedStreet, normalizedZipCode);
        return true;
    }

    /// <summary>
    /// Validates postal code format - accepts various formats.
    /// </summary>
    private static bool IsValidZipCode(string zipCode)
    {
        // Accept any alphanumeric postal code between 3-10 characters
        if (zipCode.Length < 3 || zipCode.Length > 10)
            return false;
        
        // Allow digits, letters, spaces, and hyphens (covers international formats)
        return zipCode.All(c => char.IsLetterOrDigit(c) || c == ' ' || c == '-');
    }

    /// <summary>
    /// Parses a billing address from an address string.
    /// Accepts flexible formats:
    /// - "Street, City, ZipCode"
    /// - "Street, City" (ZipCode defaults to "000000")
    /// - Full address as single string
    /// </summary>
    public static bool TryParse(string addressString, out BillingAddress billingAddress, out string? error)
    {
        error = null;
        billingAddress = default;

        if (string.IsNullOrWhiteSpace(addressString))
        {
            error = "Address cannot be empty";
            return false;
        }

        // Try to parse comma-separated format: "Street, City, ZipCode"
        var parts = addressString.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

        string street, city, zipCode;

        if (parts.Length >= 3)
        {
            // Full format: Street, City, ZipCode
            street = parts[0];
            city = parts[1];
            zipCode = parts[^1]; // Last element is zip code
        }
        else if (parts.Length == 2)
        {
            // Two parts: Street, City (use default zip)
            street = parts[0];
            city = parts[1];
            zipCode = "000000"; // Default placeholder
        }
        else
        {
            // Single part: use as street, set defaults
            street = addressString.Trim();
            city = "Necunoscut";
            zipCode = "000000";
        }

        return TryCreate(city, street, zipCode, out billingAddress, out error);
    }

    public override string ToString() => $"{Street}, {City}, {ZipCode}";

    public string ToMultiLineString() => $"{Street}\n{City}\n{ZipCode}";
}
