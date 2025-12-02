using Microsoft.EntityFrameworkCore;

namespace PSSC.Invoicing.Api.Infrastructure.Persistence;

/// <summary>
/// Database context for invoicing data.
/// </summary>
public class InvoicingDbContext : DbContext
{
    public InvoicingDbContext(DbContextOptions<InvoicingDbContext> options) : base(options)
    {
    }

    public DbSet<InvoiceEntity> Invoices => Set<InvoiceEntity>();
    public DbSet<InvoiceLineEntity> InvoiceLines => Set<InvoiceLineEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<InvoiceEntity>(entity =>
        {
            entity.ToTable("Invoices");
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.InvoiceNumber)
                .HasMaxLength(50)
                .IsRequired();
            
            entity.HasIndex(e => e.InvoiceNumber)
                .IsUnique();
            
            entity.HasIndex(e => e.OrderId);
            
            entity.Property(e => e.ClientName)
                .HasMaxLength(200)
                .IsRequired();
            
            entity.Property(e => e.FiscalCode)
                .HasMaxLength(20);
            
            entity.Property(e => e.BillingAddress)
                .HasMaxLength(500)
                .IsRequired();
            
            entity.Property(e => e.Email)
                .HasMaxLength(200);
            
            entity.Property(e => e.Currency)
                .HasMaxLength(10)
                .IsRequired();
            
            entity.Property(e => e.NetAmount)
                .HasPrecision(18, 2);
            
            entity.Property(e => e.VatAmount)
                .HasPrecision(18, 2);
            
            entity.Property(e => e.TotalAmount)
                .HasPrecision(18, 2);
            
            entity.Property(e => e.VatRate)
                .HasPrecision(5, 4);

            entity.HasMany(e => e.Lines)
                .WithOne(l => l.Invoice)
                .HasForeignKey(l => l.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<InvoiceLineEntity>(entity =>
        {
            entity.ToTable("InvoiceLines");
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.ProductCode)
                .HasMaxLength(50)
                .IsRequired();
            
            entity.Property(e => e.ProductName)
                .HasMaxLength(200)
                .IsRequired();
            
            entity.Property(e => e.UnitPrice)
                .HasPrecision(18, 2);
            
            entity.Property(e => e.LineTotal)
                .HasPrecision(18, 2);
        });
    }
}

/// <summary>
/// Invoice entity for database persistence.
/// </summary>
public class InvoiceEntity
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string InvoiceNumber { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public string? FiscalCode { get; set; }
    public bool IsCompany { get; set; }
    public string BillingAddress { get; set; } = string.Empty;
    public string? Email { get; set; }
    public decimal NetAmount { get; set; }
    public decimal VatAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal VatRate { get; set; }
    public string Currency { get; set; } = "RON";
    public DateTime IssuedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    
    public ICollection<InvoiceLineEntity> Lines { get; set; } = new List<InvoiceLineEntity>();
}

/// <summary>
/// Invoice line entity for database persistence.
/// </summary>
public class InvoiceLineEntity
{
    public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    
    public InvoiceEntity Invoice { get; set; } = null!;
}
