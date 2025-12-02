using PSSC.Shipping.Api.Domain.Entities;
using PSSC.Shipping.Api.Domain.ValueObjects;

namespace PSSC.Shipping.Api.Domain.Operations;

/// <summary>
/// Interface for GenerateAwbOperation.
/// </summary>
public interface IGenerateAwbOperation
{
    /// <summary>
    /// Generates an AWB number and assigns a carrier for the validated shipment.
    /// </summary>
    /// <param name="shipment">The validated shipment.</param>
    /// <param name="preferredCarrierCode">Optional preferred carrier code.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>AwbGeneratedShipment with AWB number and carrier.</returns>
    Task<AwbGeneratedShipment> ExecuteAsync(
        ValidatedShipment shipment,
        string? preferredCarrierCode = null,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Generates AWB number and assigns carrier.
/// Input: ValidatedShipment
/// Output: AwbGeneratedShipment
/// </summary>
public class GenerateAwbOperation : IGenerateAwbOperation
{
    private readonly IAwbNumberGenerator _awbGenerator;
    private readonly Func<decimal, Carrier, decimal> _calculateShippingCost;

    public GenerateAwbOperation(
        IAwbNumberGenerator awbGenerator,
        Func<decimal, Carrier, decimal>? calculateShippingCost = null)
    {
        _awbGenerator = awbGenerator ?? throw new ArgumentNullException(nameof(awbGenerator));
        _calculateShippingCost = calculateShippingCost ?? DefaultShippingCostCalculator;
    }

    public async Task<AwbGeneratedShipment> ExecuteAsync(
        ValidatedShipment shipment,
        string? preferredCarrierCode = null,
        CancellationToken cancellationToken = default)
    {
        // Step 1: Select carrier
        var carrier = SelectCarrier(preferredCarrierCode);

        // Step 2: Generate AWB number
        var awbNumber = await _awbGenerator.GenerateAsync(carrier, cancellationToken);

        // Step 3: Calculate shipping cost
        var shippingCost = _calculateShippingCost(shipment.TotalWeight, carrier);

        return new AwbGeneratedShipment(shipment, awbNumber, carrier, shippingCost);
    }

    private static Carrier SelectCarrier(string? preferredCarrierCode)
    {
        if (!string.IsNullOrWhiteSpace(preferredCarrierCode))
        {
            var carrier = Carrier.GetByCode(preferredCarrierCode);
            if (carrier.HasValue)
            {
                return carrier.Value;
            }
        }

        // Return default carrier if preferred not found or not specified
        return Carrier.GetDefault();
    }

    private static decimal DefaultShippingCostCalculator(decimal weight, Carrier carrier)
    {
        // Base cost + weight-based cost
        // First 1kg: base cost
        // Each additional kg: +3 RON
        var baseCost = carrier.BaseCost;
        var weightCost = weight > 1 ? (weight - 1) * 3 : 0;
        return Math.Round(baseCost + weightCost, 2);
    }
}

/// <summary>
/// Interface for AWB number generation.
/// </summary>
public interface IAwbNumberGenerator
{
    Task<AwbNumber> GenerateAsync(Carrier carrier, CancellationToken cancellationToken = default);
}

/// <summary>
/// Simple in-memory AWB number generator.
/// </summary>
public class InMemoryAwbNumberGenerator : IAwbNumberGenerator
{
    private static long _counter = 0;
    private static readonly object _lock = new();

    public Task<AwbNumber> GenerateAsync(Carrier carrier, CancellationToken cancellationToken = default)
    {
        long sequenceNumber;
        lock (_lock)
        {
            sequenceNumber = ++_counter;
        }

        var awbNumber = AwbNumber.Create(carrier.Code, DateTime.UtcNow, sequenceNumber);
        return Task.FromResult(awbNumber);
    }
}

/// <summary>
/// Database-backed AWB number generator for production.
/// </summary>
public class DatabaseAwbNumberGenerator : IAwbNumberGenerator
{
    private readonly IShipmentRepository _repository;

    public DatabaseAwbNumberGenerator(IShipmentRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }

    public async Task<AwbNumber> GenerateAsync(Carrier carrier, CancellationToken cancellationToken = default)
    {
        var sequenceNumber = await _repository.GetNextAwbSequenceAsync(carrier.Code, cancellationToken);
        return AwbNumber.Create(carrier.Code, DateTime.UtcNow, sequenceNumber);
    }
}

/// <summary>
/// Repository interface for shipment data.
/// </summary>
public interface IShipmentRepository
{
    Task SaveAsync(ShippedPackage shipment, CancellationToken cancellationToken = default);
    Task<ShippedPackage?> GetByOrderIdAsync(Guid orderId, CancellationToken cancellationToken = default);
    Task<ShippedPackage?> GetByAwbAsync(string awbNumber, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ShippedPackage>> GetByCustomerIdAsync(string customerId, CancellationToken cancellationToken = default);
    Task<long> GetNextAwbSequenceAsync(string carrierCode, CancellationToken cancellationToken = default);
}
