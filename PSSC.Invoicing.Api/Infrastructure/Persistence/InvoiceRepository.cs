using Microsoft.EntityFrameworkCore;
using PSSC.Invoicing.Api.Domain.Entities;

namespace PSSC.Invoicing.Api.Infrastructure.Persistence;

/// <summary>
/// Interface for invoice repository operations.
/// </summary>
public interface IInvoiceRepository
{
    Task<InvoiceEntity?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<InvoiceEntity?> GetByInvoiceNumberAsync(string invoiceNumber, CancellationToken ct = default);
    Task<InvoiceEntity?> GetByOrderIdAsync(Guid orderId, CancellationToken ct = default);
    Task<IReadOnlyList<InvoiceEntity>> GetAllAsync(int skip = 0, int take = 50, CancellationToken ct = default);
    Task<IReadOnlyList<InvoiceEntity>> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<int> GetTotalCountAsync(CancellationToken ct = default);
    Task<InvoiceEntity> SaveAsync(PublishedInvoice invoice, string orderNumber, string? email, CancellationToken ct = default);
    Task<string> GetNextInvoiceNumberAsync(CancellationToken ct = default);
}

/// <summary>
/// Repository for invoice persistence operations.
/// </summary>
public class InvoiceRepository : IInvoiceRepository
{
    private readonly InvoicingDbContext _context;
    private readonly ILogger<InvoiceRepository> _logger;

    public InvoiceRepository(InvoicingDbContext context, ILogger<InvoiceRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<InvoiceEntity?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _context.Invoices
            .Include(i => i.Lines)
            .FirstOrDefaultAsync(i => i.Id == id, ct);
    }

    public async Task<InvoiceEntity?> GetByInvoiceNumberAsync(string invoiceNumber, CancellationToken ct = default)
    {
        return await _context.Invoices
            .Include(i => i.Lines)
            .FirstOrDefaultAsync(i => i.InvoiceNumber == invoiceNumber, ct);
    }

    public async Task<InvoiceEntity?> GetByOrderIdAsync(Guid orderId, CancellationToken ct = default)
    {
        return await _context.Invoices
            .Include(i => i.Lines)
            .FirstOrDefaultAsync(i => i.OrderId == orderId, ct);
    }

    public async Task<IReadOnlyList<InvoiceEntity>> GetAllAsync(int skip = 0, int take = 50, CancellationToken ct = default)
    {
        return await _context.Invoices
            .Include(i => i.Lines)
            .OrderByDescending(i => i.IssuedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<InvoiceEntity>> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        return await _context.Invoices
            .Include(i => i.Lines)
            .Where(i => i.Email == email)
            .OrderByDescending(i => i.IssuedAt)
            .ToListAsync(ct);
    }

    public async Task<int> GetTotalCountAsync(CancellationToken ct = default)
    {
        return await _context.Invoices.CountAsync(ct);
    }

    public async Task<InvoiceEntity> SaveAsync(PublishedInvoice invoice, string orderNumber, string? email, CancellationToken ct = default)
    {
        var entity = new InvoiceEntity
        {
            Id = Guid.NewGuid(),
            OrderId = invoice.OrderId,
            OrderNumber = orderNumber,
            InvoiceNumber = invoice.InvoiceNumber.Value,
            ClientName = invoice.ClientName,
            FiscalCode = invoice.FiscalCode?.Value,
            IsCompany = invoice.FiscalCode.HasValue,
            BillingAddress = invoice.BillingAddress.ToString(),
            Email = email,
            NetAmount = invoice.NetTotal.Amount,
            VatAmount = invoice.VatAmount.Amount,
            TotalAmount = invoice.TotalWithVat.Amount,
            VatRate = invoice.VatRate,
            Currency = invoice.NetTotal.Currency,
            IssuedAt = invoice.IssuedAt,
            CreatedAt = DateTime.UtcNow,
            Lines = invoice.OrderLines.Select(l => new InvoiceLineEntity
            {
                Id = Guid.NewGuid(),
                ProductCode = l.ProductCode,
                ProductName = l.ProductName,
                Quantity = l.Quantity,
                UnitPrice = l.UnitPrice,
                LineTotal = l.LineTotal
            }).ToList()
        };

        _context.Invoices.Add(entity);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("Saved invoice {InvoiceNumber} for order {OrderId}", 
            entity.InvoiceNumber, entity.OrderId);

        return entity;
    }

    public async Task<string> GetNextInvoiceNumberAsync(CancellationToken ct = default)
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"INV-{year}-";

        var lastInvoice = await _context.Invoices
            .Where(i => i.InvoiceNumber.StartsWith(prefix))
            .OrderByDescending(i => i.InvoiceNumber)
            .FirstOrDefaultAsync(ct);

        int nextNumber = 1;
        if (lastInvoice != null)
        {
            var lastNumberStr = lastInvoice.InvoiceNumber.Replace(prefix, "");
            if (int.TryParse(lastNumberStr, out var lastNumber))
            {
                nextNumber = lastNumber + 1;
            }
        }

        return $"{prefix}{nextNumber:D4}";
    }
}
