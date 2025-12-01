using PSSC.Sales.Api.Domain.Commands;
using PSSC.Sales.Api.Domain.Entities;
using PSSC.Sales.Api.Domain.Events;
using PSSC.Sales.Api.Domain.Operations;

namespace PSSC.Sales.Api.Domain.Workflows;

public interface IPlaceOrderWorkflow
{
    Task<IOrder> ExecuteAsync(PlaceOrderCommand command, CancellationToken cancellationToken = default);
}

public class PlaceOrderWorkflow : IPlaceOrderWorkflow
{
    private readonly IValidateOrderOp _validateOrderOp;
    private readonly ICheckStockOp _checkStockOp;
    private readonly ICalculatePriceOp _calculatePriceOp;
    private readonly IOrderRepository _orderRepository;
    private readonly IEventPublisher _eventPublisher;

    public PlaceOrderWorkflow(
        IValidateOrderOp validateOrderOp,
        ICheckStockOp checkStockOp,
        ICalculatePriceOp calculatePriceOp,
        IOrderRepository orderRepository,
        IEventPublisher eventPublisher)
    {
        _validateOrderOp = validateOrderOp;
        _checkStockOp = checkStockOp;
        _calculatePriceOp = calculatePriceOp;
        _orderRepository = orderRepository;
        _eventPublisher = eventPublisher;
    }

    public async Task<IOrder> ExecuteAsync(PlaceOrderCommand command, CancellationToken cancellationToken = default)
    {
        // Step 1: Create unvalidated order from command
        var unvalidatedLines = command.Lines
            .Select(l => new UnvalidatedOrderLine(l.ProductCode, l.Quantity))
            .ToList();

        var unvalidatedOrder = new UnvalidatedOrder(command.CustomerId, unvalidatedLines);

        // Step 2: Validate order (check product codes, quantities)
        var (validatedOrder, validationErrors) = await _validateOrderOp.ExecuteAsync(unvalidatedOrder, cancellationToken);

        if (validatedOrder is null)
        {
            return await HandleFailureAsync(unvalidatedOrder.OrderId, command.CustomerId, validationErrors, cancellationToken);
        }

        // Step 3: Check stock availability
        var (stockAvailable, stockErrors) = await _checkStockOp.ExecuteAsync(validatedOrder, cancellationToken);

        if (!stockAvailable)
        {
            return await HandleFailureAsync(validatedOrder.OrderId, command.CustomerId, stockErrors, cancellationToken);
        }

        // Step 4: Calculate prices and totals
        var (calculatedOrder, priceErrors) = await _calculatePriceOp.ExecuteAsync(validatedOrder, cancellationToken);

        if (calculatedOrder is null)
        {
            return await HandleFailureAsync(validatedOrder.OrderId, command.CustomerId, priceErrors, cancellationToken);
        }

        // Step 5: Save order and create placed order
        var orderNumber = await _orderRepository.SaveOrderAsync(calculatedOrder, cancellationToken);
        var placedOrder = new PlacedOrder(calculatedOrder, orderNumber);

        // Step 6: Publish success event
        var successEvent = new OrderSucceededEvent(
            placedOrder.OrderId,
            placedOrder.OrderNumber,
            placedOrder.CustomerId,
            placedOrder.TotalAmount.Value,
            placedOrder.TotalAmount.Currency,
            placedOrder.Lines.Select(l => new OrderLineEventDto(
                l.ProductCode.Value,
                l.Quantity.Value,
                l.UnitPrice.Value,
                l.LineTotal.Value)));

        await _eventPublisher.PublishAsync(successEvent, cancellationToken);

        return placedOrder;
    }

    private async Task<FailedOrder> HandleFailureAsync(
        Guid orderId,
        string customerId,
        IReadOnlyList<string> errors,
        CancellationToken cancellationToken)
    {
        var failedOrder = new FailedOrder(orderId, customerId, errors);

        var failedEvent = new OrderFailedEvent(orderId, customerId, errors);
        await _eventPublisher.PublishAsync(failedEvent, cancellationToken);

        return failedOrder;
    }
}

public interface IOrderRepository
{
    Task<string> SaveOrderAsync(CalculatedOrder order, CancellationToken cancellationToken = default);
    Task<PlacedOrder?> GetOrderByIdAsync(Guid orderId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PlacedOrder>> GetOrdersByCustomerAsync(string customerId, CancellationToken cancellationToken = default);
}

public interface IEventPublisher
{
    Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default) where TEvent : IOrderEvent;
}
