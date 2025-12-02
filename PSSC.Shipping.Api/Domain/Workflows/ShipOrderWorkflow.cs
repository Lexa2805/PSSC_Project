using PSSC.Shipping.Api.Domain.Commands;
using PSSC.Shipping.Api.Domain.Entities;
using PSSC.Shipping.Api.Domain.Events;
using PSSC.Shipping.Api.Domain.Operations;

namespace PSSC.Shipping.Api.Domain.Workflows;

/// <summary>
/// Interface for the ShipOrderWorkflow.
/// </summary>
public interface IShipOrderWorkflow
{
    /// <summary>
    /// Executes the ship order workflow.
    /// </summary>
    /// <param name="command">The command containing shipment data.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The resulting shipment (either ShippedPackage or FailedShipment).</returns>
    Task<IShipment> ExecuteAsync(ShipOrderCommand command, CancellationToken cancellationToken = default);
}

/// <summary>
/// Interface for publishing shipping events.
/// </summary>
public interface IShippingEventPublisher
{
    Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default) where TEvent : IShippingEvent;
}

/// <summary>
/// ShipOrderWorkflow - Coordinator for shipping an order.
/// 
/// Trigger: Listens to OrderPlacedEvent (or InvoiceGeneratedEvent)
/// 
/// Pipeline:
/// 1. UnvalidatedShipment (from Command/Event)
/// 2. ValidateDeliveryAddressOperation -> ValidatedShipment or FailedShipment
/// 3. GenerateAwbOperation -> AwbGeneratedShipment
/// 4. Save shipment and mark as shipped -> ShippedPackage
/// 
/// Output: PackageShippedEvent or ShipmentFailedEvent
/// </summary>
public class ShipOrderWorkflow : IShipOrderWorkflow
{
    private readonly IValidateDeliveryAddressOperation _validateAddressOp;
    private readonly IGenerateAwbOperation _generateAwbOp;
    private readonly IShipmentRepository _shipmentRepository;
    private readonly IShippingEventPublisher _eventPublisher;
    private readonly ILogger<ShipOrderWorkflow> _logger;

    public ShipOrderWorkflow(
        IValidateDeliveryAddressOperation validateAddressOp,
        IGenerateAwbOperation generateAwbOp,
        IShipmentRepository shipmentRepository,
        IShippingEventPublisher eventPublisher,
        ILogger<ShipOrderWorkflow> logger)
    {
        _validateAddressOp = validateAddressOp ?? throw new ArgumentNullException(nameof(validateAddressOp));
        _generateAwbOp = generateAwbOp ?? throw new ArgumentNullException(nameof(generateAwbOp));
        _shipmentRepository = shipmentRepository ?? throw new ArgumentNullException(nameof(shipmentRepository));
        _eventPublisher = eventPublisher ?? throw new ArgumentNullException(nameof(eventPublisher));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<IShipment> ExecuteAsync(ShipOrderCommand command, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting ship order workflow for Order {OrderId}", command.OrderId);

        // Step 1: Create UnvalidatedShipment from command
        var unvalidatedShipment = command.ToUnvalidatedShipment();

        // Step 2: Validate delivery address
        var validationResult = await _validateAddressOp.ExecuteAsync(unvalidatedShipment, cancellationToken);

        // Check if validation failed
        if (validationResult is FailedShipment failedValidation)
        {
            _logger.LogWarning("Shipment validation failed for Order {OrderId}: {Errors}",
                command.OrderId, string.Join(", ", failedValidation.Reasons));
            
            await PublishFailureEventAsync(failedValidation, cancellationToken);
            return failedValidation;
        }

        var validatedShipment = (ValidatedShipment)validationResult;
        _logger.LogInformation("Shipment validated for Order {OrderId}", command.OrderId);

        // Step 3: Generate AWB and assign carrier
        var awbGeneratedShipment = await _generateAwbOp.ExecuteAsync(
            validatedShipment,
            command.PreferredCarrierCode,
            cancellationToken);

        _logger.LogInformation("AWB {AwbNumber} generated for Order {OrderId} with carrier {Carrier}",
            awbGeneratedShipment.AwbNumber.Value,
            command.OrderId,
            awbGeneratedShipment.Carrier.Name);

        // Step 4: Create shipped package
        var estimatedDelivery = CalculateEstimatedDelivery(awbGeneratedShipment.Carrier);
        var shippedPackage = new ShippedPackage(awbGeneratedShipment, estimatedDelivery);

        // Step 5: Save shipment to database
        try
        {
            await _shipmentRepository.SaveAsync(shippedPackage, cancellationToken);
            _logger.LogInformation("Shipment {ShipmentId} saved to database", shippedPackage.ShipmentId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save shipment {ShipmentId} to database", shippedPackage.ShipmentId);
            // Continue - shipment was processed, just not persisted
        }

        // Step 6: Publish success event
        await PublishSuccessEventAsync(shippedPackage, cancellationToken);

        _logger.LogInformation("Order {OrderId} shipped successfully with AWB {AwbNumber}",
            command.OrderId, shippedPackage.AwbNumber.Value);

        return shippedPackage;
    }

    private async Task PublishSuccessEventAsync(ShippedPackage shipment, CancellationToken cancellationToken)
    {
        var successEvent = new PackageShippedEvent(
            shipment.ShipmentId,
            shipment.OrderId,
            shipment.OrderNumber,
            shipment.AwbNumber.Value,
            shipment.Carrier.Code,
            shipment.Carrier.Name,
            shipment.CustomerId,
            shipment.CustomerName,
            shipment.DeliveryAddress.ToFullString(),
            shipment.ShippingCost,
            "RON",
            shipment.EstimatedDeliveryDate ?? "",
            shipment.ShippedAt
        );

        await _eventPublisher.PublishAsync(successEvent, cancellationToken);
        _logger.LogInformation("Published PackageShippedEvent for Order {OrderId}", shipment.OrderId);
    }

    private async Task PublishFailureEventAsync(FailedShipment shipment, CancellationToken cancellationToken)
    {
        var failedEvent = new ShipmentFailedEvent(shipment.OrderId, shipment.OrderNumber, shipment.Reasons);
        await _eventPublisher.PublishAsync(failedEvent, cancellationToken);
        _logger.LogInformation("Published ShipmentFailedEvent for Order {OrderId}", shipment.OrderId);
    }

    private static string CalculateEstimatedDelivery(ValueObjects.Carrier carrier)
    {
        // Different carriers have different delivery times
        var daysToAdd = carrier.Code switch
        {
            "SMD" => 1, // Sameday - next day
            "FAN" => 2, // Fan Courier - 2 days
            "DPD" => 2, // DPD - 2 days
            "CGS" => 3, // Cargus - 3 days
            "GLS" => 3, // GLS - 3 days
            _ => 3      // Default - 3 days
        };

        return DateTime.UtcNow.AddDays(daysToAdd).ToString("yyyy-MM-dd");
    }
}
