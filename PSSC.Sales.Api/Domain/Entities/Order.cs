using PSSC.Sales.Api.Domain.ValueObjects;

namespace PSSC.Sales.Api.Domain.Entities;

/// <summary>
/// Base interface for all order states (for pattern matching)
/// </summary>
public interface IOrder { }

/// <summary>
/// Initial state: Order received from client, not yet validated
/// </summary>
public record UnvalidatedOrder : IOrder
{
    public Guid OrderId { get; }
    public string CustomerId { get; }
    public IReadOnlyList<UnvalidatedOrderLine> Lines { get; }
    public DateTime CreatedAt { get; }

    public UnvalidatedOrder(string customerId, IEnumerable<UnvalidatedOrderLine> lines)
    {
        OrderId = Guid.NewGuid();
        CustomerId = customerId;
        Lines = lines.ToList().AsReadOnly();
        CreatedAt = DateTime.UtcNow;
    }
}

/// <summary>
/// Order has been validated: all product codes exist, quantities are valid
/// </summary>
public record ValidatedOrder : IOrder
{
    public Guid OrderId { get; }
    public string CustomerId { get; }
    public IReadOnlyList<ValidatedOrderLine> Lines { get; }
    public DateTime CreatedAt { get; }
    public DateTime ValidatedAt { get; }

    public ValidatedOrder(
        Guid orderId,
        string customerId,
        IEnumerable<ValidatedOrderLine> lines,
        DateTime createdAt)
    {
        OrderId = orderId;
        CustomerId = customerId;
        Lines = lines.ToList().AsReadOnly();
        CreatedAt = createdAt;
        ValidatedAt = DateTime.UtcNow;
    }
}

/// <summary>
/// Order has been calculated: prices retrieved, totals computed
/// </summary>
public record CalculatedOrder : IOrder
{
    public Guid OrderId { get; }
    public string CustomerId { get; }
    public IReadOnlyList<CalculatedOrderLine> Lines { get; }
    public Price TotalAmount { get; }
    public DateTime CreatedAt { get; }
    public DateTime ValidatedAt { get; }
    public DateTime CalculatedAt { get; }

    public CalculatedOrder(
        Guid orderId,
        string customerId,
        IEnumerable<CalculatedOrderLine> lines,
        DateTime createdAt,
        DateTime validatedAt)
    {
        OrderId = orderId;
        CustomerId = customerId;
        Lines = lines.ToList().AsReadOnly();
        TotalAmount = Lines.Aggregate(
            Price.Zero(),
            (total, line) => total + line.LineTotal);
        CreatedAt = createdAt;
        ValidatedAt = validatedAt;
        CalculatedAt = DateTime.UtcNow;
    }
}

/// <summary>
/// Final state: Order has been placed and saved (ready for payment/processing)
/// </summary>
public record PlacedOrder : IOrder
{
    public Guid OrderId { get; }
    public string CustomerId { get; }
    public IReadOnlyList<CalculatedOrderLine> Lines { get; }
    public Price TotalAmount { get; }
    public DateTime CreatedAt { get; }
    public DateTime ValidatedAt { get; }
    public DateTime CalculatedAt { get; }
    public DateTime PlacedAt { get; }
    public string OrderNumber { get; }

    public PlacedOrder(CalculatedOrder calculatedOrder, string orderNumber)
    {
        OrderId = calculatedOrder.OrderId;
        CustomerId = calculatedOrder.CustomerId;
        Lines = calculatedOrder.Lines;
        TotalAmount = calculatedOrder.TotalAmount;
        CreatedAt = calculatedOrder.CreatedAt;
        ValidatedAt = calculatedOrder.ValidatedAt;
        CalculatedAt = calculatedOrder.CalculatedAt;
        PlacedAt = DateTime.UtcNow;
        OrderNumber = orderNumber;
    }
}

/// <summary>
/// Failed state: Order processing failed at some stage
/// </summary>
public record FailedOrder : IOrder
{
    public Guid OrderId { get; }
    public string CustomerId { get; }
    public IReadOnlyList<string> Errors { get; }
    public DateTime FailedAt { get; }

    public FailedOrder(Guid orderId, string customerId, IEnumerable<string> errors)
    {
        OrderId = orderId;
        CustomerId = customerId;
        Errors = errors.ToList().AsReadOnly();
        FailedAt = DateTime.UtcNow;
    }
}
