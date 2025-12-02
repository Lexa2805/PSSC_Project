using Microsoft.EntityFrameworkCore;
using PSSC.Shipping.Api.Domain.Entities;
using PSSC.Shipping.Api.Domain.Operations;
using PSSC.Shipping.Api.Domain.ValueObjects;

namespace PSSC.Shipping.Api.Infrastructure.Persistence;

/// <summary>
/// Repository implementation for shipment data.
/// </summary>
public class ShipmentRepository : IShipmentRepository
{
    private readonly ShippingDbContext _context;
    private readonly ILogger<ShipmentRepository> _logger;

    public ShipmentRepository(ShippingDbContext context, ILogger<ShipmentRepository> logger)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task SaveAsync(ShippedPackage shipment, CancellationToken cancellationToken = default)
    {
        var entity = new ShipmentEntity
        {
            Id = shipment.ShipmentId,
            OrderId = shipment.OrderId,
            OrderNumber = shipment.OrderNumber,
            AwbNumber = shipment.AwbNumber.Value,
            CustomerId = shipment.CustomerId,
            CustomerName = shipment.CustomerName,
            DeliveryCity = shipment.DeliveryAddress.City,
            DeliveryStreet = shipment.DeliveryAddress.Street,
            DeliveryZipCode = shipment.DeliveryAddress.ZipCode,
            DeliveryCountry = shipment.DeliveryAddress.Country,
            ContactPhone = shipment.DeliveryAddress.ContactPhone,
            CarrierCode = shipment.Carrier.Code,
            CarrierName = shipment.Carrier.Name,
            ShippingCost = shipment.ShippingCost,
            TotalWeight = shipment.TotalWeight,
            Currency = "RON",
            EstimatedDeliveryDate = shipment.EstimatedDeliveryDate,
            Status = "Shipped",
            ReceivedAt = shipment.ReceivedAt,
            ValidatedAt = shipment.ValidatedAt,
            AwbGeneratedAt = shipment.AwbGeneratedAt,
            ShippedAt = shipment.ShippedAt,
            CreatedAt = DateTime.UtcNow,
            Lines = shipment.OrderLines.Select(l => new ShipmentLineEntity
            {
                Id = Guid.NewGuid(),
                ProductCode = l.ProductCode,
                ProductName = l.ProductName,
                Quantity = l.Quantity,
                Weight = l.Weight
            }).ToList()
        };

        _context.Shipments.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Saved shipment {ShipmentId} with AWB {AwbNumber}", 
            shipment.ShipmentId, shipment.AwbNumber.Value);
    }

    public async Task<ShippedPackage?> GetByOrderIdAsync(Guid orderId, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Shipments
            .Include(s => s.Lines)
            .FirstOrDefaultAsync(s => s.OrderId == orderId, cancellationToken);

        return entity != null ? MapToShippedPackage(entity) : null;
    }

    public async Task<ShippedPackage?> GetByAwbAsync(string awbNumber, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Shipments
            .Include(s => s.Lines)
            .FirstOrDefaultAsync(s => s.AwbNumber == awbNumber, cancellationToken);

        return entity != null ? MapToShippedPackage(entity) : null;
    }

    public async Task<IReadOnlyList<ShippedPackage>> GetByCustomerIdAsync(string customerId, CancellationToken cancellationToken = default)
    {
        var entities = await _context.Shipments
            .Include(s => s.Lines)
            .Where(s => s.CustomerId == customerId)
            .OrderByDescending(s => s.ShippedAt)
            .ToListAsync(cancellationToken);

        return entities.Select(MapToShippedPackage).ToList();
    }

    public async Task<long> GetNextAwbSequenceAsync(string carrierCode, CancellationToken cancellationToken = default)
    {
        var dateKey = DateTime.UtcNow.ToString("yyyyMMdd");

        var sequence = await _context.AwbSequences
            .FirstOrDefaultAsync(s => s.CarrierCode == carrierCode && s.DateKey == dateKey, cancellationToken);

        if (sequence == null)
        {
            sequence = new AwbSequenceEntity
            {
                Id = Guid.NewGuid(),
                CarrierCode = carrierCode,
                DateKey = dateKey,
                LastSequence = 0,
                UpdatedAt = DateTime.UtcNow
            };
            _context.AwbSequences.Add(sequence);
        }

        sequence.LastSequence++;
        sequence.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return sequence.LastSequence;
    }

    private static ShippedPackage MapToShippedPackage(ShipmentEntity entity)
    {
        // Recreate the shipment from entity
        // This is a simplified reconstruction - in production you might want to store more state
        
        var deliveryAddress = DeliveryAddress.Create(
            entity.DeliveryCity,
            entity.DeliveryStreet,
            entity.DeliveryZipCode,
            entity.ContactPhone,
            entity.DeliveryCountry);

        var orderLines = entity.Lines.Select(l => new ShipmentOrderLine(
            l.ProductCode,
            l.ProductName,
            l.Quantity,
            l.Weight
        )).ToList();

        var carrier = Carrier.GetByCode(entity.CarrierCode) ?? Carrier.GetDefault();

        // Create validated shipment
        var validatedShipment = new ValidatedShipment(
            entity.OrderId,
            entity.OrderNumber,
            entity.CustomerId,
            entity.CustomerName,
            deliveryAddress,
            orderLines,
            entity.ReceivedAt);

        // Parse AWB number
        AwbNumber.TryParse(entity.AwbNumber, out var awbNumber, out _);

        // Create AWB generated shipment
        var awbGeneratedShipment = new AwbGeneratedShipment(
            validatedShipment,
            awbNumber,
            carrier,
            entity.ShippingCost);

        // Create shipped package - we'll use reflection or a factory in real scenario
        // For now, create through constructor
        return new ShippedPackage(awbGeneratedShipment, entity.EstimatedDeliveryDate);
    }
}
