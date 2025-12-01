using PSSC.Sales.Api.Domain.Entities;
using PSSC.Sales.Api.Domain.ValueObjects;

namespace PSSC.Sales.Api.Domain.Operations;

public interface IValidateOrderOp
{
    Task<(ValidatedOrder? ValidatedOrder, IReadOnlyList<string> Errors)> ExecuteAsync(
        UnvalidatedOrder order,
        CancellationToken cancellationToken = default);
}

public class ValidateOrderOp : IValidateOrderOp
{
    private readonly IProductRepository _productRepository;

    public ValidateOrderOp(IProductRepository productRepository)
    {
        _productRepository = productRepository;
    }

    public async Task<(ValidatedOrder? ValidatedOrder, IReadOnlyList<string> Errors)> ExecuteAsync(
        UnvalidatedOrder order,
        CancellationToken cancellationToken = default)
    {
        var errors = new List<string>();
        var validatedLines = new List<ValidatedOrderLine>();

        // Validate customer ID
        if (string.IsNullOrWhiteSpace(order.CustomerId))
        {
            errors.Add("Customer ID is required");
        }

        // Validate at least one order line
        if (!order.Lines.Any())
        {
            errors.Add("Order must contain at least one line item");
        }

        // Get all existing product codes
        var productCodes = order.Lines.Select(l => l.ProductCode).Distinct().ToList();
        var existingProducts = await _productRepository.GetExistingProductCodesAsync(productCodes, cancellationToken);

        // Validate each line
        foreach (var line in order.Lines)
        {
            // Validate product code format
            if (!ProductCode.TryCreate(line.ProductCode, out var productCode, out var productCodeError))
            {
                errors.Add($"Line with product '{line.ProductCode}': {productCodeError}");
                continue;
            }

            // Check if product exists
            if (!existingProducts.Contains(productCode.Value))
            {
                errors.Add($"Product '{line.ProductCode}' does not exist");
                continue;
            }

            // Validate quantity
            if (!Quantity.TryCreate(line.Quantity, out var quantity, out var quantityError))
            {
                errors.Add($"Line with product '{line.ProductCode}': {quantityError}");
                continue;
            }

            validatedLines.Add(new ValidatedOrderLine(productCode, quantity));
        }

        if (errors.Any())
        {
            return (null, errors);
        }

        var validatedOrder = new ValidatedOrder(
            order.OrderId,
            order.CustomerId,
            validatedLines,
            order.CreatedAt);

        return (validatedOrder, errors);
    }
}

public interface IProductRepository
{
    Task<IReadOnlySet<string>> GetExistingProductCodesAsync(
        IEnumerable<string> productCodes,
        CancellationToken cancellationToken = default);

    Task<decimal?> GetProductPriceAsync(
        string productCode,
        CancellationToken cancellationToken = default);

    Task<Dictionary<string, decimal>> GetProductPricesAsync(
        IEnumerable<string> productCodes,
        CancellationToken cancellationToken = default);
}
