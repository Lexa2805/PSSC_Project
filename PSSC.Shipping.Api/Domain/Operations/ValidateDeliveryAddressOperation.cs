using PSSC.Shipping.Api.Domain.Entities;
using PSSC.Shipping.Api.Domain.ValueObjects;

namespace PSSC.Shipping.Api.Domain.Operations;

/// <summary>
/// Interface for ValidateDeliveryAddressOperation.
/// </summary>
public interface IValidateDeliveryAddressOperation
{
    /// <summary>
    /// Validates the delivery address from an unvalidated shipment.
    /// </summary>
    /// <param name="shipment">The unvalidated shipment to validate.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Either a ValidatedShipment or FailedShipment.</returns>
    Task<IShipment> ExecuteAsync(UnvalidatedShipment shipment, CancellationToken cancellationToken = default);
}

/// <summary>
/// Validates delivery address and creates a validated shipment.
/// Input: UnvalidatedShipment
/// Output: ValidatedShipment or FailedShipment
/// </summary>
public class ValidateDeliveryAddressOperation : IValidateDeliveryAddressOperation
{
    private readonly Func<DeliveryAddress, Task<bool>> _validateAddressExists;

    /// <summary>
    /// Creates a new instance of ValidateDeliveryAddressOperation.
    /// </summary>
    /// <param name="validateAddressExists">
    /// Function to validate if an address exists/is deliverable.
    /// This should be injected - can be mocked for testing.
    /// </param>
    public ValidateDeliveryAddressOperation(Func<DeliveryAddress, Task<bool>> validateAddressExists)
    {
        _validateAddressExists = validateAddressExists ?? throw new ArgumentNullException(nameof(validateAddressExists));
    }

    public async Task<IShipment> ExecuteAsync(UnvalidatedShipment shipment, CancellationToken cancellationToken = default)
    {
        var errors = new List<string>();

        // Step 1: Validate customer data
        if (string.IsNullOrWhiteSpace(shipment.CustomerId))
        {
            errors.Add("Customer ID is required");
        }

        if (string.IsNullOrWhiteSpace(shipment.CustomerName))
        {
            errors.Add("Customer name is required");
        }

        // Step 2: Validate order number
        if (string.IsNullOrWhiteSpace(shipment.OrderNumber))
        {
            errors.Add("Order number is required");
        }

        // Step 3: Validate order lines
        if (!shipment.OrderLines.Any())
        {
            errors.Add("Shipment must have at least one order line");
        }

        foreach (var line in shipment.OrderLines)
        {
            if (line.Quantity <= 0)
            {
                errors.Add($"Product {line.ProductCode}: Quantity must be positive");
            }
            if (line.Weight < 0)
            {
                errors.Add($"Product {line.ProductCode}: Weight cannot be negative");
            }
        }

        // Step 4: Parse and validate delivery address
        if (!DeliveryAddress.TryParse(
            shipment.DeliveryAddressRaw,
            shipment.ContactPhone,
            out var deliveryAddress,
            out var addressError))
        {
            errors.Add($"Invalid delivery address: {addressError}");
        }

        // If we have parsing errors, return FailedShipment immediately
        if (errors.Any())
        {
            return Shipment.Invalid(shipment.OrderId, shipment.OrderNumber, errors);
        }

        // Step 5: Check if the address is deliverable (external service)
        try
        {
            var isDeliverable = await _validateAddressExists(deliveryAddress);
            if (!isDeliverable)
            {
                return Shipment.Invalid(
                    shipment.OrderId,
                    shipment.OrderNumber,
                    "Delivery address is not in a serviceable area");
            }
        }
        catch (Exception ex)
        {
            // Log but continue - don't fail shipping due to address validation service issues
            // In production, you might want to handle this differently
            Console.WriteLine($"Address validation service error: {ex.Message}");
        }

        // Create validated shipment
        return new ValidatedShipment(
            shipment.OrderId,
            shipment.OrderNumber,
            shipment.CustomerId,
            shipment.CustomerName,
            deliveryAddress,
            shipment.OrderLines,
            shipment.ReceivedAt
        );
    }
}

/// <summary>
/// Mock address validator for development/testing.
/// </summary>
public static class AddressValidator
{
    /// <summary>
    /// Creates a mock validator that always returns the specified result.
    /// </summary>
    public static Func<DeliveryAddress, Task<bool>> CreateMockValidator(bool isValid = true)
    {
        return _ => Task.FromResult(isValid);
    }

    /// <summary>
    /// Creates a validator that checks if the city is in the serviceable list.
    /// </summary>
    public static Func<DeliveryAddress, Task<bool>> CreateCityValidator(IEnumerable<string> serviceableCities)
    {
        var cities = new HashSet<string>(serviceableCities.Select(c => c.ToLowerInvariant()));
        return address => Task.FromResult(cities.Contains(address.City.ToLowerInvariant()));
    }

    /// <summary>
    /// Default serviceable cities in Romania.
    /// </summary>
    public static IReadOnlyList<string> DefaultServiceableCities => new[]
    {
        "București", "Cluj-Napoca", "Timișoara", "Iași", "Constanța",
        "Craiova", "Brașov", "Galați", "Ploiești", "Oradea",
        "Brăila", "Arad", "Pitești", "Sibiu", "Bacău",
        "Târgu Mureș", "Baia Mare", "Buzău", "Botoșani", "Satu Mare"
    };
}
