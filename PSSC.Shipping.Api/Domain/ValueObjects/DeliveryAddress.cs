namespace PSSC.Shipping.Api.Domain.ValueObjects;

/// <summary>
/// The delivery address for shipping.
/// Properties: City, Street, ZipCode, Country, ContactPhone - All required except Country which defaults to "Romania"
/// </summary>
public readonly record struct DeliveryAddress
{
    public string City { get; }
    public string Street { get; }
    public string ZipCode { get; }
    public string Country { get; }
    public string ContactPhone { get; }

    private DeliveryAddress(string city, string street, string zipCode, string country, string contactPhone)
    {
        City = city;
        Street = street;
        ZipCode = zipCode;
        Country = country;
        ContactPhone = contactPhone;
    }

    public static DeliveryAddress Create(string city, string street, string zipCode, string contactPhone, string country = "Romania")
    {
        if (!TryCreate(city, street, zipCode, contactPhone, out var address, out var error, country))
        {
            throw new ArgumentException(error);
        }
        return address;
    }

    public static bool TryCreate(
        string city,
        string street,
        string zipCode,
        string contactPhone,
        out DeliveryAddress deliveryAddress,
        out string? error,
        string country = "Romania")
    {
        error = null;
        deliveryAddress = default;

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

        if (string.IsNullOrWhiteSpace(contactPhone))
        {
            error = "Contact phone is required";
            return false;
        }

        // Normalize: trim whitespace
        var normalizedCity = city.Trim();
        var normalizedStreet = street.Trim();
        var normalizedZipCode = zipCode.Trim();
        var normalizedCountry = string.IsNullOrWhiteSpace(country) ? "Romania" : country.Trim();
        var normalizedPhone = contactPhone.Trim();

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

        // Validate zip code format
        if (!IsValidZipCode(normalizedZipCode))
        {
            error = "ZipCode must be between 3 and 10 characters";
            return false;
        }

        // Validate phone format
        if (!IsValidPhone(normalizedPhone))
        {
            error = "Contact phone must be a valid phone number (10-15 digits)";
            return false;
        }

        deliveryAddress = new DeliveryAddress(normalizedCity, normalizedStreet, normalizedZipCode, normalizedCountry, normalizedPhone);
        return true;
    }

    /// <summary>
    /// Validates postal code format - accepts various formats.
    /// </summary>
    private static bool IsValidZipCode(string zipCode)
    {
        if (zipCode.Length < 3 || zipCode.Length > 10)
            return false;

        return zipCode.All(c => char.IsLetterOrDigit(c) || c == ' ' || c == '-');
    }

    /// <summary>
    /// Validates phone number - accepts digits and common separators.
    /// </summary>
    private static bool IsValidPhone(string phone)
    {
        var digitsOnly = new string(phone.Where(char.IsDigit).ToArray());
        return digitsOnly.Length >= 10 && digitsOnly.Length <= 15;
    }

    /// <summary>
    /// Parses a delivery address from a composite address string.
    /// Accepts formats like: "Street, City, ZipCode, Phone" or "Street, City, ZipCode"
    /// </summary>
    public static bool TryParse(string addressString, string phone, out DeliveryAddress address, out string? error)
    {
        error = null;
        address = default;

        if (string.IsNullOrWhiteSpace(addressString))
        {
            error = "Address is required";
            return false;
        }

        var parts = addressString.Split(',', StringSplitOptions.TrimEntries);

        if (parts.Length < 3)
        {
            error = "Address must contain at least Street, City, and ZipCode separated by commas";
            return false;
        }

        var street = parts[0];
        var city = parts[1];
        var zipCode = parts[2];
        var contactPhone = parts.Length > 3 && string.IsNullOrWhiteSpace(phone) ? parts[3] : phone;

        return TryCreate(city, street, zipCode, contactPhone, out address, out error);
    }

    public override string ToString() => $"{Street}, {City}, {ZipCode}, {Country}";

    public string ToFullString() => $"{Street}, {City}, {ZipCode}, {Country} - Tel: {ContactPhone}";
}
