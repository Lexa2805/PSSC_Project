namespace PSSC.Sales.Api.Domain.Events;

/// <summary>
/// Base interface for order events
/// </summary>
public interface IOrderEvent
{
    Guid OrderId { get; }
    DateTime Timestamp { get; }
}

/// <summary>
/// Published when an order is successfully placed
/// </summary>
public record OrderSucceededEvent : IOrderEvent
{
    public Guid OrderId { get; init; }
    public string OrderNumber { get; init; }
    public string CustomerId { get; init; }
    public decimal TotalAmount { get; init; }
    public string Currency { get; init; }
    public IReadOnlyList<OrderLineEventDto> Lines { get; init; }
    public DateTime Timestamp { get; init; }

    public OrderSucceededEvent(
        Guid orderId,
        string orderNumber,
        string customerId,
        decimal totalAmount,
        string currency,
        IEnumerable<OrderLineEventDto> lines)
    {
        OrderId = orderId;
        OrderNumber = orderNumber;
        CustomerId = customerId;
        TotalAmount = totalAmount;
        Currency = currency;
        Lines = lines.ToList().AsReadOnly();
        Timestamp = DateTime.UtcNow;
    }
}

/// <summary>
/// Published when order placement fails
/// </summary>
public record OrderFailedEvent : IOrderEvent
{
    public Guid OrderId { get; init; }
    public string CustomerId { get; init; }
    public IReadOnlyList<string> Errors { get; init; }
    public DateTime Timestamp { get; init; }

    public OrderFailedEvent(Guid orderId, string customerId, IEnumerable<string> errors)
    {
        OrderId = orderId;
        CustomerId = customerId;
        Errors = errors.ToList().AsReadOnly();
        Timestamp = DateTime.UtcNow;
    }
}

public record OrderLineEventDto(
    string ProductCode,
    int Quantity,
    decimal UnitPrice,
    decimal LineTotal
);
