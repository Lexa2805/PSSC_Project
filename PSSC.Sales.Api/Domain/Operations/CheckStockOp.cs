using PSSC.Sales.Api.Domain.Entities;

namespace PSSC.Sales.Api.Domain.Operations;

public interface ICheckStockOp
{
    Task<(bool IsAvailable, IReadOnlyList<string> Errors)> ExecuteAsync(
        ValidatedOrder order,
        CancellationToken cancellationToken = default);
}

public class CheckStockOp : ICheckStockOp
{
    private readonly IStockRepository _stockRepository;

    public CheckStockOp(IStockRepository stockRepository)
    {
        _stockRepository = stockRepository;
    }

    public async Task<(bool IsAvailable, IReadOnlyList<string> Errors)> ExecuteAsync(
        ValidatedOrder order,
        CancellationToken cancellationToken = default)
    {
        var errors = new List<string>();

        // Get stock levels for all products
        var productCodes = order.Lines.Select(l => l.ProductCode.Value).ToList();
        var stockLevels = await _stockRepository.GetStockLevelsAsync(productCodes, cancellationToken);

        foreach (var line in order.Lines)
        {
            if (!stockLevels.TryGetValue(line.ProductCode.Value, out var availableStock))
            {
                errors.Add($"Stock information not available for product '{line.ProductCode}'");
                continue;
            }

            if (availableStock < line.Quantity.Value)
            {
                errors.Add($"Insufficient stock for product '{line.ProductCode}': requested {line.Quantity.Value}, available {availableStock}");
            }
        }

        return (!errors.Any(), errors);
    }
}

public interface IStockRepository
{
    Task<Dictionary<string, int>> GetStockLevelsAsync(
        IEnumerable<string> productCodes,
        CancellationToken cancellationToken = default);

    Task<bool> ReserveStockAsync(
        IEnumerable<(string ProductCode, int Quantity)> items,
        CancellationToken cancellationToken = default);
}
