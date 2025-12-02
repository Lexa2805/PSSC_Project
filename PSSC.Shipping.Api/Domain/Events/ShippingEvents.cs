namespace PSSC.Shipping.Api.Domain.Events;

/// <summary>
/// Base interface for shipping events
/// </summary>
public interface IShippingEvent
{
    Guid OrderId { get; }
    DateTime Timestamp { get; }
}

/// <summary>
/// OrderPlacedEvent - The trigger event we are listening to.
/// This event is received from the Sales domain when an order is successfully placed.
/// </summary>
public record OrderPlacedEvent : IShippingEvent
{
    /// <summary>
    /// The unique identifier of the placed order.
    /// </summary>
    public Guid OrderId { get; init; }

    /// <summary>
    /// The order number assigned by the Sales domain.
    /// </summary>
    public string OrderNumber { get; init; }

    /// <summary>
    /// Client details for shipping.
    /// </summary>
    public ShippingClientDetails ClientDetails { get; init; }

    /// <summary>
    /// The total amount of the order.
    /// </summary>
    public decimal TotalAmount { get; init; }

    /// <summary>
    /// Currency of the order.
    /// </summary>
    public string Currency { get; init; }

    /// <summary>
    /// The order lines (products ordered).
    /// </summary>
    public IReadOnlyList<OrderLineDetails> OrderLines { get; init; }

    /// <summary>
    /// When the event was created.
    /// </summary>
    public DateTime Timestamp { get; init; }

    public OrderPlacedEvent()
    {
        OrderId = Guid.Empty;
        OrderNumber = string.Empty;
        ClientDetails = new ShippingClientDetails();
        TotalAmount = 0;
        Currency = "RON";
        OrderLines = Array.Empty<OrderLineDetails>();
        Timestamp = DateTime.UtcNow;
    }

    public OrderPlacedEvent(
        Guid orderId,
        string orderNumber,
        ShippingClientDetails clientDetails,
        decimal totalAmount,
        string currency,
        IEnumerable<OrderLineDetails> orderLines)
    {
        OrderId = orderId;
        OrderNumber = orderNumber;
        ClientDetails = clientDetails;
        TotalAmount = totalAmount;
        Currency = currency;
        OrderLines = orderLines.ToList().AsReadOnly();
        Timestamp = DateTime.UtcNow;
    }
}

/// <summary>
/// InvoiceGeneratedEvent - Alternative trigger event.
/// This event is received from the Invoicing domain when an invoice is successfully generated.
/// </summary>
public record InvoiceGeneratedEvent : IShippingEvent
{
    public Guid OrderId { get; init; }
    public string OrderNumber { get; init; }
    public string InvoiceNumber { get; init; }
    public string ClientName { get; init; }
    public string DeliveryAddress { get; init; }
    public string ContactPhone { get; init; }
    public decimal TotalAmount { get; init; }
    public string Currency { get; init; }
    public IReadOnlyList<OrderLineDetails> OrderLines { get; init; }
    public DateTime Timestamp { get; init; }

    public InvoiceGeneratedEvent()
    {
        OrderId = Guid.Empty;
        OrderNumber = string.Empty;
        InvoiceNumber = string.Empty;
        ClientName = string.Empty;
        DeliveryAddress = string.Empty;
        ContactPhone = string.Empty;
        TotalAmount = 0;
        Currency = "RON";
        OrderLines = Array.Empty<OrderLineDetails>();
        Timestamp = DateTime.UtcNow;
    }
}

/// <summary>
/// Client details from the order, used for shipping.
/// </summary>
public record ShippingClientDetails
{
    /// <summary>
    /// The customer ID (internal identifier).
    /// </summary>
    public string CustomerId { get; init; } = string.Empty;

    /// <summary>
    /// The customer/client name.
    /// </summary>
    public string CustomerName { get; init; } = string.Empty;

    /// <summary>
    /// The delivery address (formatted string).
    /// </summary>
    public string DeliveryAddress { get; init; } = string.Empty;

    /// <summary>
    /// Contact phone number for delivery.
    /// </summary>
    public string ContactPhone { get; init; } = string.Empty;

    /// <summary>
    /// Email for shipping notifications.
    /// </summary>
    public string Email { get; init; } = string.Empty;
}

/// <summary>
/// Order line details for shipping (weight calculation, etc.)
/// </summary>
public record OrderLineDetails
{
    /// <summary>
    /// Product code/SKU.
    /// </summary>
    public string ProductCode { get; init; } = string.Empty;

    /// <summary>
    /// Product name/description.
    /// </summary>
    public string ProductName { get; init; } = string.Empty;

    /// <summary>
    /// Quantity ordered.
    /// </summary>
    public int Quantity { get; init; }

    /// <summary>
    /// Unit price.
    /// </summary>
    public decimal UnitPrice { get; init; }

    /// <summary>
    /// Weight per unit in kg (for shipping calculation).
    /// </summary>
    public decimal Weight { get; init; } = 0.5m; // Default weight for books
}

/// <summary>
/// PackageShippedEvent - Published when a package is successfully shipped.
/// Output event from the ShipOrderWorkflow.
/// </summary>
public record PackageShippedEvent : IShippingEvent
{
    /// <summary>
    /// The unique identifier of the shipment.
    /// </summary>
    public Guid ShipmentId { get; init; }

    /// <summary>
    /// The order ID this shipment belongs to.
    /// </summary>
    public Guid OrderId { get; init; }

    /// <summary>
    /// The order number.
    /// </summary>
    public string OrderNumber { get; init; }

    /// <summary>
    /// The AWB (Air Waybill) number for tracking.
    /// </summary>
    public string AwbNumber { get; init; }

    /// <summary>
    /// The carrier/courier company.
    /// </summary>
    public string CarrierCode { get; init; }

    /// <summary>
    /// Carrier name.
    /// </summary>
    public string CarrierName { get; init; }

    /// <summary>
    /// Customer ID.
    /// </summary>
    public string CustomerId { get; init; }

    /// <summary>
    /// Customer name.
    /// </summary>
    public string CustomerName { get; init; }

    /// <summary>
    /// Delivery address (formatted).
    /// </summary>
    public string DeliveryAddress { get; init; }

    /// <summary>
    /// Shipping cost.
    /// </summary>
    public decimal ShippingCost { get; init; }

    /// <summary>
    /// Currency.
    /// </summary>
    public string Currency { get; init; }

    /// <summary>
    /// Estimated delivery date.
    /// </summary>
    public string EstimatedDeliveryDate { get; init; }

    /// <summary>
    /// When the package was shipped.
    /// </summary>
    public DateTime ShippedAt { get; init; }

    /// <summary>
    /// Event timestamp.
    /// </summary>
    public DateTime Timestamp { get; init; }

    public PackageShippedEvent()
    {
        ShipmentId = Guid.Empty;
        OrderId = Guid.Empty;
        OrderNumber = string.Empty;
        AwbNumber = string.Empty;
        CarrierCode = string.Empty;
        CarrierName = string.Empty;
        CustomerId = string.Empty;
        CustomerName = string.Empty;
        DeliveryAddress = string.Empty;
        ShippingCost = 0;
        Currency = "RON";
        EstimatedDeliveryDate = string.Empty;
        ShippedAt = DateTime.UtcNow;
        Timestamp = DateTime.UtcNow;
    }

    public PackageShippedEvent(
        Guid shipmentId,
        Guid orderId,
        string orderNumber,
        string awbNumber,
        string carrierCode,
        string carrierName,
        string customerId,
        string customerName,
        string deliveryAddress,
        decimal shippingCost,
        string currency,
        string estimatedDeliveryDate,
        DateTime shippedAt)
    {
        ShipmentId = shipmentId;
        OrderId = orderId;
        OrderNumber = orderNumber;
        AwbNumber = awbNumber;
        CarrierCode = carrierCode;
        CarrierName = carrierName;
        CustomerId = customerId;
        CustomerName = customerName;
        DeliveryAddress = deliveryAddress;
        ShippingCost = shippingCost;
        Currency = currency;
        EstimatedDeliveryDate = estimatedDeliveryDate;
        ShippedAt = shippedAt;
        Timestamp = DateTime.UtcNow;
    }
}

/// <summary>
/// ShipmentFailedEvent - Published when shipment processing fails.
/// </summary>
public record ShipmentFailedEvent : IShippingEvent
{
    public Guid OrderId { get; init; }
    public string OrderNumber { get; init; }
    public IReadOnlyList<string> Errors { get; init; }
    public DateTime Timestamp { get; init; }

    public ShipmentFailedEvent(Guid orderId, string orderNumber, IEnumerable<string> errors)
    {
        OrderId = orderId;
        OrderNumber = orderNumber;
        Errors = errors.ToList().AsReadOnly();
        Timestamp = DateTime.UtcNow;
    }
}
