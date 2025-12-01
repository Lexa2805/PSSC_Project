using Microsoft.EntityFrameworkCore;
using PSSC.Sales.Api.Domain.Commands;
using PSSC.Sales.Api.Domain.Entities;
using PSSC.Sales.Api.Domain.Operations;
using PSSC.Sales.Api.Domain.Workflows;
using PSSC.Sales.Api.Infrastructure.Messaging;
using PSSC.Sales.Api.Infrastructure.Persistence;
using PSSC.Sales.Api.Infrastructure.Persistence.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "PSSC Sales API", Version = "v1" });
});

// Database
builder.Services.AddDbContext<SalesDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Database")));

// Repositories
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<IStockRepository, StockRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();

// Operations
builder.Services.AddScoped<IValidateOrderOp, ValidateOrderOp>();
builder.Services.AddScoped<ICheckStockOp, CheckStockOp>();
builder.Services.AddScoped<ICalculatePriceOp, CalculatePriceOp>();

// Workflow
builder.Services.AddScoped<IPlaceOrderWorkflow, PlaceOrderWorkflow>();

// Event Publisher - use InMemory for development, ServiceBus for production
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddSingleton<IEventPublisher, InMemoryEventPublisher>();
}
else
{
    builder.Services.AddSingleton<IEventPublisher, ServiceBusEventPublisher>();
}

// CORS for Next.js frontend
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3000", "https://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors();

// === API Endpoints ===

// Health check
app.MapGet("/health", () => Results.Ok(new { Status = "Healthy", Timestamp = DateTime.UtcNow }))
   .WithName("HealthCheck")
   .WithTags("Health");

// Place Order
app.MapPost("/api/orders", async (
    PlaceOrderRequest request,
    IPlaceOrderWorkflow workflow,
    CancellationToken cancellationToken) =>
{
    var command = new PlaceOrderCommand(
        request.CustomerId,
        request.Lines.Select(l => new OrderLineDto(l.ProductCode, l.Quantity)).ToList());

    var result = await workflow.ExecuteAsync(command, cancellationToken);

    return result switch
    {
        PlacedOrder placed => Results.Created($"/api/orders/{placed.OrderId}", new PlaceOrderResponse
        {
            OrderId = placed.OrderId,
            OrderNumber = placed.OrderNumber,
            CustomerId = placed.CustomerId,
            TotalAmount = placed.TotalAmount.Value,
            Currency = placed.TotalAmount.Currency,
            PlacedAt = placed.PlacedAt,
            Lines = placed.Lines.Select(l => new OrderLineResponse
            {
                ProductCode = l.ProductCode.Value,
                Quantity = l.Quantity.Value,
                UnitPrice = l.UnitPrice.Value,
                LineTotal = l.LineTotal.Value
            }).ToList()
        }),
        FailedOrder failed => Results.BadRequest(new ErrorResponse
        {
            OrderId = failed.OrderId,
            Errors = failed.Errors.ToList()
        }),
        _ => Results.Problem("Unexpected order state")
    };
})
.WithName("PlaceOrder")
.WithTags("Orders")
.Produces<PlaceOrderResponse>(StatusCodes.Status201Created)
.Produces<ErrorResponse>(StatusCodes.Status400BadRequest);

// Get Order by ID
app.MapGet("/api/orders/{orderId:guid}", async (
    Guid orderId,
    IOrderRepository orderRepository,
    CancellationToken cancellationToken) =>
{
    var order = await orderRepository.GetOrderByIdAsync(orderId, cancellationToken);

    if (order == null)
        return Results.NotFound(new { Message = $"Order {orderId} not found" });

    return Results.Ok(new PlaceOrderResponse
    {
        OrderId = order.OrderId,
        OrderNumber = order.OrderNumber,
        CustomerId = order.CustomerId,
        TotalAmount = order.TotalAmount.Value,
        Currency = order.TotalAmount.Currency,
        PlacedAt = order.PlacedAt,
        Lines = order.Lines.Select(l => new OrderLineResponse
        {
            ProductCode = l.ProductCode.Value,
            Quantity = l.Quantity.Value,
            UnitPrice = l.UnitPrice.Value,
            LineTotal = l.LineTotal.Value
        }).ToList()
    });
})
.WithName("GetOrder")
.WithTags("Orders")
.Produces<PlaceOrderResponse>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status404NotFound);

// Get Orders by Customer
app.MapGet("/api/customers/{customerId}/orders", async (
    string customerId,
    IOrderRepository orderRepository,
    CancellationToken cancellationToken) =>
{
    var orders = await orderRepository.GetOrdersByCustomerAsync(customerId, cancellationToken);

    return Results.Ok(orders.Select(order => new PlaceOrderResponse
    {
        OrderId = order.OrderId,
        OrderNumber = order.OrderNumber,
        CustomerId = order.CustomerId,
        TotalAmount = order.TotalAmount.Value,
        Currency = order.TotalAmount.Currency,
        PlacedAt = order.PlacedAt,
        Lines = order.Lines.Select(l => new OrderLineResponse
        {
            ProductCode = l.ProductCode.Value,
            Quantity = l.Quantity.Value,
            UnitPrice = l.UnitPrice.Value,
            LineTotal = l.LineTotal.Value
        }).ToList()
    }));
})
.WithName("GetCustomerOrders")
.WithTags("Orders")
.Produces<IEnumerable<PlaceOrderResponse>>(StatusCodes.Status200OK);

// Get Products (for frontend to display available books)
app.MapGet("/api/products", async (SalesDbContext context, string? category, CancellationToken cancellationToken) =>
{
    var query = context.Products.Where(p => p.IsActive);

    if (!string.IsNullOrEmpty(category) && category != "all")
    {
        query = query.Where(p => p.Category == category);
    }

    var products = await query
        .Select(p => new ProductResponse
        {
            Code = p.Code,
            Name = p.Name,
            Description = p.Description,
            Category = p.Category,
            Author = p.Author,
            Price = p.Price,
            StockQuantity = p.StockQuantity
        })
        .ToListAsync(cancellationToken);

    return Results.Ok(products);
})
.WithName("GetProducts")
.WithTags("Products")
.Produces<IEnumerable<ProductResponse>>(StatusCodes.Status200OK);

// Get Product by Code
app.MapGet("/api/products/{code}", async (string code, SalesDbContext context, CancellationToken cancellationToken) =>
{
    var product = await context.Products
        .Where(p => p.Code == code && p.IsActive)
        .Select(p => new ProductResponse
        {
            Code = p.Code,
            Name = p.Name,
            Description = p.Description,
            Category = p.Category,
            Author = p.Author,
            Price = p.Price,
            StockQuantity = p.StockQuantity
        })
        .FirstOrDefaultAsync(cancellationToken);

    if (product == null)
        return Results.NotFound(new { Message = $"Product {code} not found" });

    return Results.Ok(product);
})
.WithName("GetProduct")
.WithTags("Products")
.Produces<ProductResponse>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status404NotFound);

// Get Categories
app.MapGet("/api/categories", async (SalesDbContext context, CancellationToken cancellationToken) =>
{
    var categories = await context.Products
        .Where(p => p.IsActive)
        .Select(p => p.Category)
        .Distinct()
        .OrderBy(c => c)
        .ToListAsync(cancellationToken);

    return Results.Ok(categories);
})
.WithName("GetCategories")
.WithTags("Products")
.Produces<IEnumerable<string>>(StatusCodes.Status200OK);

// Apply migrations on startup (for development)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SalesDbContext>();

    // In development, just ensure database is created
    // This will skip if database already exists with the right schema
    await db.Database.EnsureCreatedAsync();

    // Check if we need to add new products
    var productCount = await db.Products.CountAsync();
    if (productCount < 50) // We expect about 55 products now
    {
        // Delete all existing products and let HasData reseed
        await db.Database.ExecuteSqlRawAsync("DELETE FROM Products");
        await db.Database.ExecuteSqlRawAsync("DELETE FROM OrderLines");
        await db.Database.ExecuteSqlRawAsync("DELETE FROM Orders");

        // Recreate the database with seed data
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();
    }
}

app.Run();

// === Request/Response DTOs ===

public record PlaceOrderRequest
{
    public string CustomerId { get; init; } = string.Empty;
    public List<OrderLineRequest> Lines { get; init; } = new();
}

public record OrderLineRequest
{
    public string ProductCode { get; init; } = string.Empty;
    public int Quantity { get; init; }
}

public record PlaceOrderResponse
{
    public Guid OrderId { get; init; }
    public string OrderNumber { get; init; } = string.Empty;
    public string CustomerId { get; init; } = string.Empty;
    public decimal TotalAmount { get; init; }
    public string Currency { get; init; } = string.Empty;
    public DateTime PlacedAt { get; init; }
    public List<OrderLineResponse> Lines { get; init; } = new();
}

public record OrderLineResponse
{
    public string ProductCode { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public decimal UnitPrice { get; init; }
    public decimal LineTotal { get; init; }
}

public record ErrorResponse
{
    public Guid OrderId { get; init; }
    public List<string> Errors { get; init; } = new();
}

public record ProductResponse
{
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string Category { get; init; } = string.Empty;
    public string? Author { get; init; }
    public decimal Price { get; init; }
    public int StockQuantity { get; init; }
}
