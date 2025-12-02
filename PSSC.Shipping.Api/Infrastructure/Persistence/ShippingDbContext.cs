using Microsoft.EntityFrameworkCore;

namespace PSSC.Shipping.Api.Infrastructure.Persistence;

/// <summary>
/// Database context for shipping data.
/// </summary>
public class ShippingDbContext : DbContext
{
    public ShippingDbContext(DbContextOptions<ShippingDbContext> options) : base(options)
    {
    }

    public DbSet<ShipmentEntity> Shipments => Set<ShipmentEntity>();
    public DbSet<ShipmentLineEntity> ShipmentLines => Set<ShipmentLineEntity>();
    public DbSet<AwbSequenceEntity> AwbSequences => Set<AwbSequenceEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ShipmentEntity>(entity =>
        {
            entity.ToTable("Shipments");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.AwbNumber)
                .HasMaxLength(50)
                .IsRequired();

            entity.HasIndex(e => e.AwbNumber)
                .IsUnique();

            entity.HasIndex(e => e.OrderId);

            entity.Property(e => e.OrderNumber)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(e => e.CustomerId)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(e => e.CustomerName)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(e => e.DeliveryCity)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(e => e.DeliveryStreet)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(e => e.DeliveryZipCode)
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(e => e.DeliveryCountry)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(e => e.ContactPhone)
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(e => e.CarrierCode)
                .HasMaxLength(10)
                .IsRequired();

            entity.Property(e => e.CarrierName)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(e => e.ShippingCost)
                .HasPrecision(18, 2);

            entity.Property(e => e.TotalWeight)
                .HasPrecision(18, 3);

            entity.Property(e => e.Currency)
                .HasMaxLength(10)
                .IsRequired();

            entity.Property(e => e.EstimatedDeliveryDate)
                .HasMaxLength(20);

            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .IsRequired();

            entity.HasMany(e => e.Lines)
                .WithOne(l => l.Shipment)
                .HasForeignKey(l => l.ShipmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ShipmentLineEntity>(entity =>
        {
            entity.ToTable("ShipmentLines");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.ProductCode)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(e => e.ProductName)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(e => e.Weight)
                .HasPrecision(18, 3);
        });

        modelBuilder.Entity<AwbSequenceEntity>(entity =>
        {
            entity.ToTable("AwbSequences");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.CarrierCode)
                .HasMaxLength(10)
                .IsRequired();

            entity.Property(e => e.DateKey)
                .HasMaxLength(8)
                .IsRequired();

            entity.HasIndex(e => new { e.CarrierCode, e.DateKey })
                .IsUnique();
        });
    }
}

/// <summary>
/// Shipment entity for database persistence.
/// </summary>
public class ShipmentEntity
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string AwbNumber { get; set; } = string.Empty;
    public string CustomerId { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string DeliveryCity { get; set; } = string.Empty;
    public string DeliveryStreet { get; set; } = string.Empty;
    public string DeliveryZipCode { get; set; } = string.Empty;
    public string DeliveryCountry { get; set; } = string.Empty;
    public string ContactPhone { get; set; } = string.Empty;
    public string CarrierCode { get; set; } = string.Empty;
    public string CarrierName { get; set; } = string.Empty;
    public decimal ShippingCost { get; set; }
    public decimal TotalWeight { get; set; }
    public string Currency { get; set; } = "RON";
    public string? EstimatedDeliveryDate { get; set; }
    public string Status { get; set; } = "Shipped";
    public DateTime ReceivedAt { get; set; }
    public DateTime ValidatedAt { get; set; }
    public DateTime AwbGeneratedAt { get; set; }
    public DateTime ShippedAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<ShipmentLineEntity> Lines { get; set; } = new List<ShipmentLineEntity>();
}

/// <summary>
/// Shipment line entity for database persistence.
/// </summary>
public class ShipmentLineEntity
{
    public Guid Id { get; set; }
    public Guid ShipmentId { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal Weight { get; set; }

    public ShipmentEntity Shipment { get; set; } = null!;
}

/// <summary>
/// AWB sequence tracking for unique AWB generation.
/// </summary>
public class AwbSequenceEntity
{
    public Guid Id { get; set; }
    public string CarrierCode { get; set; } = string.Empty;
    public string DateKey { get; set; } = string.Empty;
    public long LastSequence { get; set; }
    public DateTime UpdatedAt { get; set; }
}
