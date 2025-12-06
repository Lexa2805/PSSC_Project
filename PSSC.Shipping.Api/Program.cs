using Microsoft.EntityFrameworkCore;
using PSSC.Shipping.Api.Domain.Commands;
using PSSC.Shipping.Api.Domain.Entities;
using PSSC.Shipping.Api.Domain.Operations;
using PSSC.Shipping.Api.Domain.ValueObjects;
using PSSC.Shipping.Api.Domain.Workflows;
using PSSC.Shipping.Api.Infrastructure.Messaging;
using PSSC.Shipping.Api.Infrastructure.Persistence;
using PSSC.Common.Auth.Extensions;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "PSSC Shipping API", Version = "v1" });
});

// Azure AD Authentication
builder.Services.AddAzureAdAuthentication(builder.Configuration);

// Database Context
builder.Services.AddDbContext<ShippingDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Database")));

// Shipment Repository
builder.Services.AddScoped<IShipmentRepository, ShipmentRepository>();

// Register Address Validator (mock for development)
builder.Services.AddSingleton<Func<DeliveryAddress, Task<bool>>>(sp => AddressValidator.CreateMockValidator(true));

// Register Operations
builder.Services.AddScoped<IValidateDeliveryAddressOperation>(sp =>
{
    var addressValidator = sp.GetRequiredService<Func<DeliveryAddress, Task<bool>>>();
    return new ValidateDeliveryAddressOperation(addressValidator);
});

builder.Services.AddScoped<IGenerateAwbOperation>(sp =>
{
    var repository = sp.GetRequiredService<IShipmentRepository>();
    var awbGenerator = new DatabaseAwbNumberGenerator(repository);
    return new GenerateAwbOperation(awbGenerator);
});

// Event Publisher - use InMemory for development, ServiceBus for production
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddSingleton<IShippingEventPublisher, InMemoryShippingEventPublisher>();
}
else
{
    builder.Services.AddSingleton<IShippingEventPublisher, ServiceBusShippingEventPublisher>();
    // Add Service Bus listener for OrderPlacedEvent (production only)
    builder.Services.AddHostedService<OrderPlacedEventListener>();
}

// Register Workflow
builder.Services.AddScoped<IShipOrderWorkflow, ShipOrderWorkflow>();

// CORS for Next.js frontend
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3000", "https://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Apply migrations and ensure database is created
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ShippingDbContext>();
    try
    {
        db.Database.Migrate();
        Console.WriteLine("✅ Database migrations applied successfully");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️  Database migration warning: {ex.Message}");
        // Try to ensure created if migrations fail
        try
        {
            db.Database.EnsureCreated();
            Console.WriteLine("✅ Database tables created");
        }
        catch
        {
            Console.WriteLine("⚠️  Could not create database - shipments will not be persisted");
        }
    }
}

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors();

// Add authentication & authorization middleware
app.UseAzureAdAuthentication();

// Map authentication endpoints
app.MapAuthEndpoints();

// === API Endpoints ===

// Health check
app.MapGet("/health", () => Results.Ok(new { Status = "Healthy", Timestamp = DateTime.UtcNow }))
   .WithName("HealthCheck")
   .WithTags("Health");

// Get available carriers
app.MapGet("/api/carriers", () =>
{
    var carriers = Carrier.GetAll().Select(c => new CarrierResponse
    {
        Code = c.Code,
        Name = c.Name,
        BaseCost = c.BaseCost
    });
    return Results.Ok(carriers);
})
.WithName("GetCarriers")
.WithTags("Carriers")
.Produces<IEnumerable<CarrierResponse>>(StatusCodes.Status200OK);

// Ship Order
app.MapPost("/api/shipments", async (
    ShipOrderRequest request,
    IShipOrderWorkflow workflow,
    CancellationToken cancellationToken) =>
{
    // Validate required fields
    if (request.OrderId == Guid.Empty)
    {
        return Results.BadRequest(new ShipmentErrorResponse
        {
            Success = false,
            OrderId = request.OrderId,
            Errors = new List<string> { "OrderId is required" }
        });
    }

    var orderLines = request.OrderLines.Select(l => new ShipOrderLineDto(
        l.ProductCode,
        l.ProductName,
        l.Quantity,
        l.Weight
    ));

    var command = new ShipOrderCommand(
        request.OrderId,
        request.OrderNumber,
        request.CustomerId,
        request.CustomerName,
        request.DeliveryAddress,
        request.ContactPhone,
        orderLines,
        request.PreferredCarrierCode
    );

    var result = await workflow.ExecuteAsync(command, cancellationToken);

    return result switch
    {
        ShippedPackage shipped => Results.Created($"/api/shipments/{shipped.ShipmentId}", new ShipmentResponse
        {
            Success = true,
            ShipmentId = shipped.ShipmentId,
            OrderId = shipped.OrderId,
            OrderNumber = shipped.OrderNumber,
            AwbNumber = shipped.AwbNumber.Value,
            CarrierCode = shipped.Carrier.Code,
            CarrierName = shipped.Carrier.Name,
            CustomerName = shipped.CustomerName,
            DeliveryAddress = shipped.DeliveryAddress.ToFullString(),
            ShippingCost = shipped.ShippingCost,
            TotalWeight = shipped.TotalWeight,
            EstimatedDeliveryDate = shipped.EstimatedDeliveryDate,
            ShippedAt = shipped.ShippedAt
        }),
        FailedShipment failed => Results.BadRequest(new ShipmentErrorResponse
        {
            Success = false,
            OrderId = failed.OrderId,
            OrderNumber = failed.OrderNumber,
            Errors = failed.Reasons.ToList()
        }),
        _ => Results.Problem("Unexpected shipment state")
    };
})
.WithName("ShipOrder")
.WithTags("Shipments")
.Produces<ShipmentResponse>(StatusCodes.Status201Created)
.Produces<ShipmentErrorResponse>(StatusCodes.Status400BadRequest);

// Get Shipment by Order ID
app.MapGet("/api/shipments/order/{orderId:guid}", async (
    Guid orderId,
    IShipmentRepository shipmentRepository,
    CancellationToken cancellationToken) =>
{
    var shipment = await shipmentRepository.GetByOrderIdAsync(orderId, cancellationToken);

    if (shipment == null)
        return Results.NotFound(new { Message = $"Shipment for order {orderId} not found" });

    return Results.Ok(new ShipmentResponse
    {
        Success = true,
        ShipmentId = shipment.ShipmentId,
        OrderId = shipment.OrderId,
        OrderNumber = shipment.OrderNumber,
        AwbNumber = shipment.AwbNumber.Value,
        CarrierCode = shipment.Carrier.Code,
        CarrierName = shipment.Carrier.Name,
        CustomerName = shipment.CustomerName,
        DeliveryAddress = shipment.DeliveryAddress.ToFullString(),
        ShippingCost = shipment.ShippingCost,
        TotalWeight = shipment.TotalWeight,
        EstimatedDeliveryDate = shipment.EstimatedDeliveryDate,
        ShippedAt = shipment.ShippedAt
    });
})
.WithName("GetShipmentByOrder")
.WithTags("Shipments")
.Produces<ShipmentResponse>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status404NotFound);

// Track Shipment by AWB
app.MapGet("/api/shipments/track/{awbNumber}", async (
    string awbNumber,
    IShipmentRepository shipmentRepository,
    CancellationToken cancellationToken) =>
{
    var shipment = await shipmentRepository.GetByAwbAsync(awbNumber, cancellationToken);

    if (shipment == null)
        return Results.NotFound(new { Message = $"Shipment with AWB {awbNumber} not found" });

    return Results.Ok(new TrackingResponse
    {
        AwbNumber = shipment.AwbNumber.Value,
        OrderNumber = shipment.OrderNumber,
        CarrierName = shipment.Carrier.Name,
        Status = "Shipped",
        CustomerName = shipment.CustomerName,
        DeliveryAddress = shipment.DeliveryAddress.ToString(),
        ShippedAt = shipment.ShippedAt,
        EstimatedDeliveryDate = shipment.EstimatedDeliveryDate,
        TrackingHistory = new List<TrackingEvent>
        {
            new() { Status = "Order Received", Timestamp = shipment.ReceivedAt, Location = "Warehouse" },
            new() { Status = "Address Validated", Timestamp = shipment.ValidatedAt, Location = "Warehouse" },
            new() { Status = "AWB Generated", Timestamp = shipment.AwbGeneratedAt, Location = "Warehouse" },
            new() { Status = "Shipped", Timestamp = shipment.ShippedAt, Location = "Warehouse" }
        }
    });
})
.WithName("TrackShipment")
.WithTags("Tracking")
.Produces<TrackingResponse>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status404NotFound);

// Get Shipments by Customer
app.MapGet("/api/customers/{customerId}/shipments", async (
    string customerId,
    IShipmentRepository shipmentRepository,
    CancellationToken cancellationToken) =>
{
    var shipments = await shipmentRepository.GetByCustomerIdAsync(customerId, cancellationToken);

    return Results.Ok(shipments.Select(s => new ShipmentResponse
    {
        Success = true,
        ShipmentId = s.ShipmentId,
        OrderId = s.OrderId,
        OrderNumber = s.OrderNumber,
        AwbNumber = s.AwbNumber.Value,
        CarrierCode = s.Carrier.Code,
        CarrierName = s.Carrier.Name,
        CustomerName = s.CustomerName,
        DeliveryAddress = s.DeliveryAddress.ToFullString(),
        ShippingCost = s.ShippingCost,
        TotalWeight = s.TotalWeight,
        EstimatedDeliveryDate = s.EstimatedDeliveryDate,
        ShippedAt = s.ShippedAt
    }));
})
.WithName("GetCustomerShipments")
.WithTags("Shipments")
.Produces<IEnumerable<ShipmentResponse>>(StatusCodes.Status200OK);

// Validate Delivery Address
app.MapPost("/api/address/validate", (ValidateAddressRequest request) =>
{
    if (DeliveryAddress.TryCreate(
        request.City,
        request.Street,
        request.ZipCode,
        request.ContactPhone,
        out var address,
        out var error,
        request.Country ?? "Romania"))
    {
        return Results.Ok(new ValidateAddressResponse
        {
            IsValid = true,
            NormalizedAddress = address.ToString(),
            FullAddress = address.ToFullString(),
            Error = null
        });
    }

    return Results.Ok(new ValidateAddressResponse
    {
        IsValid = false,
        Error = error
    });
})
.WithName("ValidateAddress")
.WithTags("Validation")
.Produces<ValidateAddressResponse>(StatusCodes.Status200OK);

// Calculate Shipping Cost
app.MapPost("/api/shipping/calculate", (CalculateShippingRequest request) =>
{
    var carrier = Carrier.GetByCode(request.CarrierCode) ?? Carrier.GetDefault();
    var weight = request.TotalWeight > 0 ? request.TotalWeight : 0.5m;

    // Calculate cost: base + weight-based
    var baseCost = carrier.BaseCost;
    var weightCost = weight > 1 ? (weight - 1) * 3 : 0;
    var totalCost = Math.Round(baseCost + weightCost, 2);

    return Results.Ok(new CalculateShippingResponse
    {
        CarrierCode = carrier.Code,
        CarrierName = carrier.Name,
        Weight = weight,
        BaseCost = baseCost,
        WeightCost = weightCost,
        TotalCost = totalCost,
        Currency = "RON",
        EstimatedDays = carrier.Code switch
        {
            "SMD" => 1,
            "FAN" => 2,
            "DPD" => 2,
            _ => 3
        }
    });
})
.WithName("CalculateShipping")
.WithTags("Shipping")
.Produces<CalculateShippingResponse>(StatusCodes.Status200OK);

app.Run();

// === Request/Response DTOs ===

public record ShipOrderRequest
{
    public Guid OrderId { get; init; }
    public string OrderNumber { get; init; } = string.Empty;
    public string CustomerId { get; init; } = string.Empty;
    public string CustomerName { get; init; } = string.Empty;
    public string DeliveryAddress { get; init; } = string.Empty;
    public string ContactPhone { get; init; } = string.Empty;
    public string? PreferredCarrierCode { get; init; }
    public List<OrderLineRequest> OrderLines { get; init; } = new();
}

public record OrderLineRequest
{
    public string ProductCode { get; init; } = string.Empty;
    public string ProductName { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public decimal Weight { get; init; } = 0.5m;
}

public record ShipmentResponse
{
    public bool Success { get; init; }
    public Guid ShipmentId { get; init; }
    public Guid OrderId { get; init; }
    public string OrderNumber { get; init; } = string.Empty;
    public string AwbNumber { get; init; } = string.Empty;
    public string CarrierCode { get; init; } = string.Empty;
    public string CarrierName { get; init; } = string.Empty;
    public string CustomerName { get; init; } = string.Empty;
    public string DeliveryAddress { get; init; } = string.Empty;
    public decimal ShippingCost { get; init; }
    public decimal TotalWeight { get; init; }
    public string? EstimatedDeliveryDate { get; init; }
    public DateTime ShippedAt { get; init; }
}

public record ShipmentErrorResponse
{
    public bool Success { get; init; }
    public Guid OrderId { get; init; }
    public string? OrderNumber { get; init; }
    public List<string> Errors { get; init; } = new();
}

public record CarrierResponse
{
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public decimal BaseCost { get; init; }
}

public record TrackingResponse
{
    public string AwbNumber { get; init; } = string.Empty;
    public string OrderNumber { get; init; } = string.Empty;
    public string CarrierName { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public string CustomerName { get; init; } = string.Empty;
    public string DeliveryAddress { get; init; } = string.Empty;
    public DateTime ShippedAt { get; init; }
    public string? EstimatedDeliveryDate { get; init; }
    public List<TrackingEvent> TrackingHistory { get; init; } = new();
}

public record TrackingEvent
{
    public string Status { get; init; } = string.Empty;
    public DateTime Timestamp { get; init; }
    public string Location { get; init; } = string.Empty;
}

public record ValidateAddressRequest
{
    public string City { get; init; } = string.Empty;
    public string Street { get; init; } = string.Empty;
    public string ZipCode { get; init; } = string.Empty;
    public string ContactPhone { get; init; } = string.Empty;
    public string? Country { get; init; }
}

public record ValidateAddressResponse
{
    public bool IsValid { get; init; }
    public string? NormalizedAddress { get; init; }
    public string? FullAddress { get; init; }
    public string? Error { get; init; }
}

public record CalculateShippingRequest
{
    public string CarrierCode { get; init; } = string.Empty;
    public decimal TotalWeight { get; init; }
}

public record CalculateShippingResponse
{
    public string CarrierCode { get; init; } = string.Empty;
    public string CarrierName { get; init; } = string.Empty;
    public decimal Weight { get; init; }
    public decimal BaseCost { get; init; }
    public decimal WeightCost { get; init; }
    public decimal TotalCost { get; init; }
    public string Currency { get; init; } = "RON";
    public int EstimatedDays { get; init; }
}

