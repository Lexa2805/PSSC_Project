using PSSC.Shipping.Api.Domain.ValueObjects;

namespace PSSC.Shipping.Api.Domain.Entities;

/// <summary>
/// Base interface for all shipment states (for pattern matching)
/// Using "Discriminated Unions" / State Pattern
/// </summary>
public interface IShipment { }

/// <summary>
/// Represents an order line item for shipping processing
/// </summary>
public record ShipmentOrderLine(
    string ProductCode,
    string ProductName,
    int Quantity,
    decimal Weight
);

/// <summary>
/// Initial state: Raw data received from the OrderPlaced/InvoiceGenerated event, not yet validated.
/// </summary>
public record UnvalidatedShipment : IShipment
{
    public Guid OrderId { get; }
    public string OrderNumber { get; }
    public string CustomerId { get; }
    public string CustomerName { get; }
    public string DeliveryAddressRaw { get; }
    public string ContactPhone { get; }
    public IReadOnlyList<ShipmentOrderLine> OrderLines { get; }
    public DateTime ReceivedAt { get; }

    public UnvalidatedShipment(
        Guid orderId,
        string orderNumber,
        string customerId,
        string customerName,
        string deliveryAddressRaw,
        string contactPhone,
        IEnumerable<ShipmentOrderLine> orderLines)
    {
        OrderId = orderId;
        OrderNumber = orderNumber;
        CustomerId = customerId;
        CustomerName = customerName;
        DeliveryAddressRaw = deliveryAddressRaw;
        ContactPhone = contactPhone;
        OrderLines = orderLines.ToList().AsReadOnly();
        ReceivedAt = DateTime.UtcNow;
    }
}

/// <summary>
/// Shipment has been validated: delivery address is valid and complete.
/// </summary>
public record ValidatedShipment : IShipment
{
    public Guid OrderId { get; }
    public string OrderNumber { get; }
    public string CustomerId { get; }
    public string CustomerName { get; }
    public DeliveryAddress DeliveryAddress { get; }
    public IReadOnlyList<ShipmentOrderLine> OrderLines { get; }
    public decimal TotalWeight { get; }
    public DateTime ReceivedAt { get; }
    public DateTime ValidatedAt { get; }

    public ValidatedShipment(
        Guid orderId,
        string orderNumber,
        string customerId,
        string customerName,
        DeliveryAddress deliveryAddress,
        IEnumerable<ShipmentOrderLine> orderLines,
        DateTime receivedAt)
    {
        OrderId = orderId;
        OrderNumber = orderNumber;
        CustomerId = customerId;
        CustomerName = customerName;
        DeliveryAddress = deliveryAddress;
        OrderLines = orderLines.ToList().AsReadOnly();
        TotalWeight = OrderLines.Sum(l => l.Weight * l.Quantity);
        ReceivedAt = receivedAt;
        ValidatedAt = DateTime.UtcNow;
    }
}

/// <summary>
/// AWB has been generated and carrier has been assigned.
/// </summary>
public record AwbGeneratedShipment : IShipment
{
    public Guid OrderId { get; }
    public string OrderNumber { get; }
    public string CustomerId { get; }
    public string CustomerName { get; }
    public DeliveryAddress DeliveryAddress { get; }
    public IReadOnlyList<ShipmentOrderLine> OrderLines { get; }
    public decimal TotalWeight { get; }
    public AwbNumber AwbNumber { get; }
    public Carrier Carrier { get; }
    public decimal ShippingCost { get; }
    public DateTime ReceivedAt { get; }
    public DateTime ValidatedAt { get; }
    public DateTime AwbGeneratedAt { get; }

    public AwbGeneratedShipment(
        ValidatedShipment validatedShipment,
        AwbNumber awbNumber,
        Carrier carrier,
        decimal shippingCost)
    {
        OrderId = validatedShipment.OrderId;
        OrderNumber = validatedShipment.OrderNumber;
        CustomerId = validatedShipment.CustomerId;
        CustomerName = validatedShipment.CustomerName;
        DeliveryAddress = validatedShipment.DeliveryAddress;
        OrderLines = validatedShipment.OrderLines;
        TotalWeight = validatedShipment.TotalWeight;
        AwbNumber = awbNumber;
        Carrier = carrier;
        ShippingCost = shippingCost;
        ReceivedAt = validatedShipment.ReceivedAt;
        ValidatedAt = validatedShipment.ValidatedAt;
        AwbGeneratedAt = DateTime.UtcNow;
    }
}

/// <summary>
/// Final state: Package has been shipped (handed over to carrier).
/// </summary>
public record ShippedPackage : IShipment
{
    public Guid ShipmentId { get; }
    public Guid OrderId { get; }
    public string OrderNumber { get; }
    public string CustomerId { get; }
    public string CustomerName { get; }
    public DeliveryAddress DeliveryAddress { get; }
    public IReadOnlyList<ShipmentOrderLine> OrderLines { get; }
    public decimal TotalWeight { get; }
    public AwbNumber AwbNumber { get; }
    public Carrier Carrier { get; }
    public decimal ShippingCost { get; }
    public DateTime ReceivedAt { get; }
    public DateTime ValidatedAt { get; }
    public DateTime AwbGeneratedAt { get; }
    public DateTime ShippedAt { get; }
    public string? EstimatedDeliveryDate { get; }

    public ShippedPackage(AwbGeneratedShipment awbGeneratedShipment, string? estimatedDeliveryDate = null)
    {
        ShipmentId = Guid.NewGuid();
        OrderId = awbGeneratedShipment.OrderId;
        OrderNumber = awbGeneratedShipment.OrderNumber;
        CustomerId = awbGeneratedShipment.CustomerId;
        CustomerName = awbGeneratedShipment.CustomerName;
        DeliveryAddress = awbGeneratedShipment.DeliveryAddress;
        OrderLines = awbGeneratedShipment.OrderLines;
        TotalWeight = awbGeneratedShipment.TotalWeight;
        AwbNumber = awbGeneratedShipment.AwbNumber;
        Carrier = awbGeneratedShipment.Carrier;
        ShippingCost = awbGeneratedShipment.ShippingCost;
        ReceivedAt = awbGeneratedShipment.ReceivedAt;
        ValidatedAt = awbGeneratedShipment.ValidatedAt;
        AwbGeneratedAt = awbGeneratedShipment.AwbGeneratedAt;
        ShippedAt = DateTime.UtcNow;
        EstimatedDeliveryDate = estimatedDeliveryDate ?? DateTime.UtcNow.AddDays(2).ToString("yyyy-MM-dd");
    }
}

/// <summary>
/// Failure state: Shipment could not be processed.
/// </summary>
public record FailedShipment : IShipment
{
    public Guid OrderId { get; }
    public string OrderNumber { get; }
    public IReadOnlyList<string> Reasons { get; }
    public DateTime FailedAt { get; }

    public FailedShipment(Guid orderId, string orderNumber, IEnumerable<string> reasons)
    {
        OrderId = orderId;
        OrderNumber = orderNumber;
        Reasons = reasons.ToList().AsReadOnly();
        FailedAt = DateTime.UtcNow;
    }
}

/// <summary>
/// Static factory for creating shipment states.
/// </summary>
public static class Shipment
{
    public static FailedShipment Invalid(Guid orderId, string orderNumber, IEnumerable<string> reasons)
        => new(orderId, orderNumber, reasons);

    public static FailedShipment Invalid(Guid orderId, string orderNumber, string reason)
        => new(orderId, orderNumber, new[] { reason });
}
