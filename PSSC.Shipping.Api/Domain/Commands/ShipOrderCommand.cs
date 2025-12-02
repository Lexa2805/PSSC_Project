using PSSC.Shipping.Api.Domain.Entities;

namespace PSSC.Shipping.Api.Domain.Commands;

/// <summary>
/// Command to ship an order.
/// </summary>
public record ShipOrderCommand
{
    public Guid OrderId { get; }
    public string OrderNumber { get; }
    public string CustomerId { get; }
    public string CustomerName { get; }
    public string DeliveryAddress { get; }
    public string ContactPhone { get; }
    public string? PreferredCarrierCode { get; }
    public IReadOnlyList<ShipOrderLineDto> OrderLines { get; }

    public ShipOrderCommand(
        Guid orderId,
        string orderNumber,
        string customerId,
        string customerName,
        string deliveryAddress,
        string contactPhone,
        IEnumerable<ShipOrderLineDto> orderLines,
        string? preferredCarrierCode = null)
    {
        OrderId = orderId;
        OrderNumber = orderNumber;
        CustomerId = customerId;
        CustomerName = customerName;
        DeliveryAddress = deliveryAddress;
        ContactPhone = contactPhone;
        OrderLines = orderLines.ToList().AsReadOnly();
        PreferredCarrierCode = preferredCarrierCode;
    }

    /// <summary>
    /// Converts the command to an unvalidated shipment.
    /// </summary>
    public UnvalidatedShipment ToUnvalidatedShipment()
    {
        var shipmentLines = OrderLines.Select(l => new ShipmentOrderLine(
            l.ProductCode,
            l.ProductName,
            l.Quantity,
            l.Weight
        ));

        return new UnvalidatedShipment(
            OrderId,
            OrderNumber,
            CustomerId,
            CustomerName,
            DeliveryAddress,
            ContactPhone,
            shipmentLines
        );
    }
}

/// <summary>
/// DTO for order line in ship order command.
/// </summary>
public record ShipOrderLineDto(
    string ProductCode,
    string ProductName,
    int Quantity,
    decimal Weight = 0.5m // Default weight for books in kg
);
