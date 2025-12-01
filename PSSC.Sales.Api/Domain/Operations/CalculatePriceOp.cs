using PSSC.Sales.Api.Domain.Entities;
using PSSC.Sales.Api.Domain.ValueObjects;

namespace PSSC.Sales.Api.Domain.Operations;

public interface ICalculatePriceOp
{
    Task<(CalculatedOrder? CalculatedOrder, IReadOnlyList<string> Errors)> ExecuteAsync(
        ValidatedOrder order,
        CancellationToken cancellationToken = default);
}

public class CalculatePriceOp : ICalculatePriceOp
{
    private readonly IProductRepository _productRepository;

    public CalculatePriceOp(IProductRepository productRepository)
    {
        _productRepository = productRepository;
    }

    public async Task<(CalculatedOrder? CalculatedOrder, IReadOnlyList<string> Errors)> ExecuteAsync(
        ValidatedOrder order,
        CancellationToken cancellationToken = default)
    {
        var errors = new List<string>();
        var calculatedLines = new List<CalculatedOrderLine>();

        // Get all prices in one call
        var productCodes = order.Lines.Select(l => l.ProductCode.Value).ToList();
        var prices = await _productRepository.GetProductPricesAsync(productCodes, cancellationToken);

        foreach (var line in order.Lines)
        {
            if (!prices.TryGetValue(line.ProductCode.Value, out var priceValue))
            {
                errors.Add($"Could not retrieve price for product '{line.ProductCode}'");
                continue;
            }

            var unitPrice = Price.Create(priceValue);
            var lineTotal = unitPrice * line.Quantity;

            calculatedLines.Add(new CalculatedOrderLine(
                line.ProductCode,
                line.Quantity,
                unitPrice,
                lineTotal));
        }

        if (errors.Any())
        {
            return (null, errors);
        }

        var calculatedOrder = new CalculatedOrder(
            order.OrderId,
            order.CustomerId,
            calculatedLines,
            order.CreatedAt,
            order.ValidatedAt);

        return (calculatedOrder, errors);
    }
}
