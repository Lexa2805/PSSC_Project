using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PSSC.Sales.Api.Infrastructure.Persistence.Entities;

[Table("Orders")]
public class OrderEntity
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string OrderNumber { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string CustomerId { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalAmount { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "RON";

    public DateTime CreatedAt { get; set; }
    public DateTime ValidatedAt { get; set; }
    public DateTime CalculatedAt { get; set; }
    public DateTime PlacedAt { get; set; }

    public ICollection<OrderLineEntity> Lines { get; set; } = new List<OrderLineEntity>();
}

[Table("OrderLines")]
public class OrderLineEntity
{
    [Key]
    public Guid Id { get; set; }

    public Guid OrderId { get; set; }

    [Required]
    [MaxLength(50)]
    public string ProductCode { get; set; } = string.Empty;

    public int Quantity { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal UnitPrice { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal LineTotal { get; set; }

    [ForeignKey(nameof(OrderId))]
    public OrderEntity Order { get; set; } = null!;
}

[Table("Products")]
public class ProductEntity
{
    [Key]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    [Required]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Author { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }

    public int StockQuantity { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
