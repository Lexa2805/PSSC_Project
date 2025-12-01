using Microsoft.EntityFrameworkCore;
using PSSC.Sales.Api.Domain.Entities;
using PSSC.Sales.Api.Domain.Operations;
using PSSC.Sales.Api.Domain.ValueObjects;
using PSSC.Sales.Api.Domain.Workflows;
using PSSC.Sales.Api.Infrastructure.Persistence.Entities;

namespace PSSC.Sales.Api.Infrastructure.Persistence.Repositories;

public class ProductRepository : IProductRepository
{
    private readonly SalesDbContext _context;

    public ProductRepository(SalesDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlySet<string>> GetExistingProductCodesAsync(
        IEnumerable<string> productCodes,
        CancellationToken cancellationToken = default)
    {
        var codes = productCodes.Select(c => c.ToUpperInvariant()).ToList();

        var existingCodes = await _context.Products
            .Where(p => codes.Contains(p.Code) && p.IsActive)
            .Select(p => p.Code)
            .ToListAsync(cancellationToken);

        return existingCodes.ToHashSet();
    }

    public async Task<decimal?> GetProductPriceAsync(
        string productCode,
        CancellationToken cancellationToken = default)
    {
        var product = await _context.Products
            .Where(p => p.Code == productCode.ToUpperInvariant() && p.IsActive)
            .Select(p => new { p.Price })
            .FirstOrDefaultAsync(cancellationToken);

        return product?.Price;
    }

    public async Task<Dictionary<string, decimal>> GetProductPricesAsync(
        IEnumerable<string> productCodes,
        CancellationToken cancellationToken = default)
    {
        var codes = productCodes.Select(c => c.ToUpperInvariant()).ToList();

        return await _context.Products
            .Where(p => codes.Contains(p.Code) && p.IsActive)
            .ToDictionaryAsync(
                p => p.Code,
                p => p.Price,
                cancellationToken);
    }
}

public class StockRepository : IStockRepository
{
    private readonly SalesDbContext _context;

    public StockRepository(SalesDbContext context)
    {
        _context = context;
    }

    public async Task<Dictionary<string, int>> GetStockLevelsAsync(
        IEnumerable<string> productCodes,
        CancellationToken cancellationToken = default)
    {
        var codes = productCodes.Select(c => c.ToUpperInvariant()).ToList();

        return await _context.Products
            .Where(p => codes.Contains(p.Code) && p.IsActive)
            .ToDictionaryAsync(
                p => p.Code,
                p => p.StockQuantity,
                cancellationToken);
    }

    public async Task<bool> ReserveStockAsync(
        IEnumerable<(string ProductCode, int Quantity)> items,
        CancellationToken cancellationToken = default)
    {
        foreach (var (productCode, quantity) in items)
        {
            var product = await _context.Products
                .Where(p => p.Code == productCode.ToUpperInvariant())
                .FirstOrDefaultAsync(cancellationToken);

            if (product == null || product.StockQuantity < quantity)
                return false;

            product.StockQuantity -= quantity;
            product.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}

public class OrderRepository : IOrderRepository
{
    private readonly SalesDbContext _context;
    private readonly IStockRepository _stockRepository;

    public OrderRepository(SalesDbContext context, IStockRepository stockRepository)
    {
        _context = context;
        _stockRepository = stockRepository;
    }

    public async Task<string> SaveOrderAsync(CalculatedOrder order, CancellationToken cancellationToken = default)
    {
        var orderNumber = GenerateOrderNumber();

        var orderEntity = new OrderEntity
        {
            Id = order.OrderId,
            OrderNumber = orderNumber,
            CustomerId = order.CustomerId,
            TotalAmount = order.TotalAmount.Value,
            Currency = order.TotalAmount.Currency,
            CreatedAt = order.CreatedAt,
            ValidatedAt = order.ValidatedAt,
            CalculatedAt = order.CalculatedAt,
            PlacedAt = DateTime.UtcNow,
            Lines = order.Lines.Select(l => new OrderLineEntity
            {
                Id = Guid.NewGuid(),
                OrderId = order.OrderId,
                ProductCode = l.ProductCode.Value,
                Quantity = l.Quantity.Value,
                UnitPrice = l.UnitPrice.Value,
                LineTotal = l.LineTotal.Value
            }).ToList()
        };

        _context.Orders.Add(orderEntity);

        // Reserve stock
        var stockItems = order.Lines.Select(l => (l.ProductCode.Value, l.Quantity.Value));
        await _stockRepository.ReserveStockAsync(stockItems, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return orderNumber;
    }

    public async Task<PlacedOrder?> GetOrderByIdAsync(Guid orderId, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Orders
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);

        if (entity == null)
            return null;

        return MapToPlacedOrder(entity);
    }

    public async Task<IReadOnlyList<PlacedOrder>> GetOrdersByCustomerAsync(
        string customerId,
        CancellationToken cancellationToken = default)
    {
        var entities = await _context.Orders
            .Include(o => o.Lines)
            .Where(o => o.CustomerId == customerId)
            .OrderByDescending(o => o.PlacedAt)
            .ToListAsync(cancellationToken);

        return entities.Select(MapToPlacedOrder).ToList();
    }

    private static PlacedOrder MapToPlacedOrder(OrderEntity entity)
    {
        var calculatedLines = entity.Lines.Select(l => new CalculatedOrderLine(
            ProductCode.Create(l.ProductCode),
            Quantity.Create(l.Quantity),
            Price.Create(l.UnitPrice, entity.Currency),
            Price.Create(l.LineTotal, entity.Currency)
        )).ToList();

        var calculatedOrder = new CalculatedOrder(
            entity.Id,
            entity.CustomerId,
            calculatedLines,
            entity.CreatedAt,
            entity.ValidatedAt);

        return new PlacedOrder(calculatedOrder, entity.OrderNumber);
    }

    private static string GenerateOrderNumber()
    {
        var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
        var random = Random.Shared.Next(1000, 9999);
        return $"ORD-{timestamp}-{random}";
    }
}
