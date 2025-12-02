using Microsoft.EntityFrameworkCore;
using PSSC.Invoicing.Api.Domain.Commands;
using PSSC.Invoicing.Api.Domain.Entities;
using PSSC.Invoicing.Api.Domain.Events;
using PSSC.Invoicing.Api.Domain.Operations;
using PSSC.Invoicing.Api.Domain.ValueObjects;
using PSSC.Invoicing.Api.Domain.Workflows;
using PSSC.Invoicing.Api.Infrastructure.Messaging;
using PSSC.Invoicing.Api.Infrastructure.Email;
using PSSC.Invoicing.Api.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "PSSC Invoicing API", Version = "v1" });
});

// Database Context
builder.Services.AddDbContext<InvoicingDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Database")));

// Invoice Repository
builder.Services.AddScoped<IInvoiceRepository, InvoiceRepository>();

// Register ANAF Checker (mock for development)
builder.Services.AddSingleton<Func<FiscalCode, Task<bool>>>(sp => AnafCompanyChecker.CreateMockChecker(true));

// Register Operations
builder.Services.AddScoped<IValidateFiscalDataOperation>(sp =>
{
    var anafChecker = sp.GetRequiredService<Func<FiscalCode, Task<bool>>>();
    return new ValidateFiscalDataOperation(anafChecker);
});

builder.Services.AddScoped<ICalculateTaxOperation, CalculateTaxOperation>();

// Use Database invoice number generator
builder.Services.AddScoped<IPublishInvoiceOperation>(sp =>
{
    var repository = sp.GetRequiredService<IInvoiceRepository>();
    var generator = new DatabaseInvoiceNumberGenerator(repository);
    return new PublishInvoiceOperation(generator.AsGenerator());
});

// Email Service - use Azure if properly configured, otherwise Development fallback
var acsConnectionString = builder.Configuration["AzureCommunicationServices:ConnectionString"];
var senderEmail = builder.Configuration["AzureCommunicationServices:SenderEmail"];
var isEmailConfigured = !string.IsNullOrEmpty(acsConnectionString) 
    && !string.IsNullOrEmpty(senderEmail) 
    && !senderEmail.Contains("UPDATE_WITH");

if (isEmailConfigured)
{
    builder.Services.AddSingleton<IEmailService, AzureEmailService>();
    Console.WriteLine("📧 Using Azure Communication Services for email");
}
else
{
    builder.Services.AddSingleton<IEmailService, DevelopmentEmailService>();
    Console.WriteLine("📧 Using Development email service (emails logged only)");
    Console.WriteLine("⚠️  To enable real emails, configure SenderEmail with an Azure-managed domain");
}

// Event Publisher - use InMemory for development, ServiceBus for production
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddSingleton<IInvoiceEventPublisher, InMemoryInvoiceEventPublisher>();
}
else
{
    builder.Services.AddSingleton<IInvoiceEventPublisher, ServiceBusInvoiceEventPublisher>();
    // Add Service Bus listener for OrderPlacedEvent (production only)
    builder.Services.AddHostedService<OrderPlacedEventListener>();
}

// Register Workflow
builder.Services.AddScoped<IGenerateInvoiceWorkflow, GenerateInvoiceWorkflow>();

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

// Apply migrations and ensure database is created
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<InvoicingDbContext>();
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
            Console.WriteLine("⚠️  Could not create database - invoices will not be persisted");
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

// === API Endpoints ===

// Health check
app.MapGet("/health", () => Results.Ok(new { Status = "Healthy", Timestamp = DateTime.UtcNow }))
   .WithName("HealthCheck")
   .WithTags("Health");

// Validate Fiscal Code
app.MapPost("/api/fiscal-code/validate", (ValidateFiscalCodeRequest request) =>
{
    if (FiscalCode.TryCreate(request.FiscalCode, out var fiscalCode, out var error))
    {
        return Results.Ok(new ValidateFiscalCodeResponse
        {
            IsValid = true,
            NormalizedValue = fiscalCode.Value,
            NumericValue = fiscalCode.NumericValue,
            IsVatPayer = fiscalCode.IsVatPayer,
            Error = null
        });
    }

    return Results.Ok(new ValidateFiscalCodeResponse
    {
        IsValid = false,
        Error = error
    });
})
.WithName("ValidateFiscalCode")
.WithTags("Validation")
.Produces<ValidateFiscalCodeResponse>(StatusCodes.Status200OK);

// Generate Invoice from Order
app.MapPost("/api/invoices/generate", async (
    GenerateInvoiceRequest request,
    IGenerateInvoiceWorkflow workflow,
    CancellationToken cancellationToken) =>
{
    // Validate email is required
    if (string.IsNullOrWhiteSpace(request.Email))
    {
        return Results.BadRequest(new GenerateInvoiceErrorResponse
        {
            Success = false,
            OrderId = request.OrderId,
            Errors = new List<string> { "Email is required for invoice delivery" }
        });
    }

    var orderLines = request.OrderLines.Select(l => new InvoiceOrderLine(
        l.ProductCode,
        l.ProductName,
        l.Quantity,
        l.UnitPrice,
        l.LineTotal
    ));

    var command = new GenerateInvoiceCommand(
        request.OrderId,
        request.OrderNumber,
        request.FiscalCode ?? string.Empty, // Optional - empty for individuals
        request.ClientName,
        request.BillingAddress,
        request.OrderTotal.ToString(),
        request.Currency,
        orderLines,
        request.Email
    );

    var result = await workflow.ExecuteAsync(command, cancellationToken);

    return result switch
    {
        PublishedInvoice published => Results.Created($"/api/invoices/{published.InvoiceNumber}", new GenerateInvoiceResponse
        {
            Success = true,
            InvoiceNumber = published.InvoiceNumber.Value,
            OrderId = published.OrderId,
            ClientName = published.ClientName,
            FiscalCode = published.FiscalCode?.Value,
            IsCompany = published.FiscalCode.HasValue,
            NetAmount = published.NetTotal.Amount,
            VatAmount = published.VatAmount.Amount,
            VatRate = published.VatRate,
            TotalAmount = published.TotalWithVat.Amount,
            Currency = published.NetTotal.Currency,
            IssuedAt = published.IssuedAt,
            BillingAddress = published.BillingAddress.ToString(),
            EmailSentTo = request.Email
        }),
        InvalidInvoice invalid => Results.BadRequest(new GenerateInvoiceErrorResponse
        {
            Success = false,
            OrderId = invalid.OrderId,
            Errors = invalid.Reasons.ToList()
        }),
        _ => Results.Problem("Unexpected invoice state")
    };
})
.WithName("GenerateInvoice")
.WithTags("Invoices")
.Produces<GenerateInvoiceResponse>(StatusCodes.Status201Created)
.Produces<GenerateInvoiceErrorResponse>(StatusCodes.Status400BadRequest);

// Simulate receiving OrderPlacedEvent and generating invoice
app.MapPost("/api/invoices/from-order-event", async (
    OrderPlacedEvent orderEvent,
    IGenerateInvoiceWorkflow workflow,
    CancellationToken cancellationToken) =>
{
    var command = GenerateInvoiceCommand.FromEvent(orderEvent);
    var result = await workflow.ExecuteAsync(command, cancellationToken);

    return result switch
    {
        PublishedInvoice published => Results.Created($"/api/invoices/{published.InvoiceNumber}", new GenerateInvoiceResponse
        {
            Success = true,
            InvoiceNumber = published.InvoiceNumber.Value,
            OrderId = published.OrderId,
            ClientName = published.ClientName,
            FiscalCode = published.FiscalCode?.Value,
            IsCompany = published.FiscalCode.HasValue,
            NetAmount = published.NetTotal.Amount,
            VatAmount = published.VatAmount.Amount,
            VatRate = published.VatRate,
            TotalAmount = published.TotalWithVat.Amount,
            Currency = published.NetTotal.Currency,
            IssuedAt = published.IssuedAt,
            BillingAddress = published.BillingAddress.ToString(),
            EmailSentTo = orderEvent.ClientDetails.Email
        }),
        InvalidInvoice invalid => Results.BadRequest(new GenerateInvoiceErrorResponse
        {
            Success = false,
            OrderId = invalid.OrderId,
            Errors = invalid.Reasons.ToList()
        }),
        _ => Results.Problem("Unexpected invoice state")
    };
})
.WithName("GenerateInvoiceFromOrderEvent")
.WithTags("Invoices")
.Produces<GenerateInvoiceResponse>(StatusCodes.Status201Created)
.Produces<GenerateInvoiceErrorResponse>(StatusCodes.Status400BadRequest);

// Get published events (for debugging/development)
app.MapGet("/api/events", (IInvoiceEventPublisher publisher) =>
{
    if (publisher is InMemoryInvoiceEventPublisher inMemoryPublisher)
    {
        return Results.Ok(inMemoryPublisher.PublishedEvents.Select(e => new
        {
            EventType = e.GetType().Name,
            e.OrderId,
            e.Timestamp
        }));
    }
    return Results.Ok(new { Message = "Events are published to Azure Service Bus in production mode" });
})
.WithName("GetEvents")
.WithTags("Debug");

// Test Fiscal Code validation with sample values
app.MapGet("/api/test/fiscal-codes", () =>
{
    // Test Romanian CUI validation with known values
    var testCases = new[]
    {
        "18547290",      // Valid CUI
        "RO18547290",    // Valid CUI with RO prefix
        "ro18547290",    // Should normalize to RO18547290
        "12345678",      // Invalid control digit
        "RO12345678",    // Invalid with RO prefix
        "",              // Empty
        "ABC123",        // Invalid format
    };

    var results = testCases.Select(cui =>
    {
        var success = FiscalCode.TryCreate(cui, out var fiscalCode, out var error);
        return new
        {
            Input = cui,
            IsValid = success,
            NormalizedValue = success ? fiscalCode.Value : null,
            Error = error
        };
    });

    return Results.Ok(results);
})
.WithName("TestFiscalCodes")
.WithTags("Debug");

// === Invoice Retrieval Endpoints ===

// Get all invoices (paginated)
app.MapGet("/api/invoices", async (
    IInvoiceRepository repository,
    int skip = 0,
    int take = 50,
    CancellationToken ct = default) =>
{
    var invoices = await repository.GetAllAsync(skip, take, ct);
    var total = await repository.GetTotalCountAsync(ct);
    
    return Results.Ok(new
    {
        Total = total,
        Skip = skip,
        Take = take,
        Items = invoices.Select(MapToInvoiceDto)
    });
})
.WithName("GetInvoices")
.WithTags("Invoices")
.WithSummary("Get all invoices with pagination");

// Get invoice by number
app.MapGet("/api/invoices/{invoiceNumber}", async (
    string invoiceNumber,
    IInvoiceRepository repository,
    CancellationToken ct) =>
{
    var invoice = await repository.GetByInvoiceNumberAsync(invoiceNumber, ct);
    
    if (invoice == null)
        return Results.NotFound(new { Error = $"Invoice {invoiceNumber} not found" });
    
    return Results.Ok(MapToInvoiceDto(invoice));
})
.WithName("GetInvoiceByNumber")
.WithTags("Invoices")
.WithSummary("Get invoice by invoice number");

// Get invoice by order ID
app.MapGet("/api/invoices/by-order/{orderId:guid}", async (
    Guid orderId,
    IInvoiceRepository repository,
    CancellationToken ct) =>
{
    var invoice = await repository.GetByOrderIdAsync(orderId, ct);
    
    if (invoice == null)
        return Results.NotFound(new { Error = $"Invoice for order {orderId} not found" });
    
    return Results.Ok(MapToInvoiceDto(invoice));
})
.WithName("GetInvoiceByOrderId")
.WithTags("Invoices")
.WithSummary("Get invoice by order ID");

// Get invoices by email
app.MapGet("/api/invoices/by-email/{email}", async (
    string email,
    IInvoiceRepository repository,
    CancellationToken ct) =>
{
    var invoices = await repository.GetByEmailAsync(email, ct);
    return Results.Ok(invoices.Select(MapToInvoiceDto));
})
.WithName("GetInvoicesByEmail")
.WithTags("Invoices")
.WithSummary("Get all invoices for an email address");

// Invoice statistics
app.MapGet("/api/invoices/stats", async (
    IInvoiceRepository repository,
    CancellationToken ct) =>
{
    var invoices = await repository.GetAllAsync(0, 10000, ct);
    var total = invoices.Count;
    var totalAmount = invoices.Sum(i => i.TotalAmount);
    var totalVat = invoices.Sum(i => i.VatAmount);
    var companiesCount = invoices.Count(i => i.IsCompany);
    var individualsCount = invoices.Count(i => !i.IsCompany);
    
    return Results.Ok(new
    {
        TotalInvoices = total,
        TotalAmount = totalAmount,
        TotalVat = totalVat,
        Currency = "RON",
        CompanyInvoices = companiesCount,
        IndividualInvoices = individualsCount,
        ThisMonth = invoices.Count(i => i.IssuedAt.Month == DateTime.UtcNow.Month && i.IssuedAt.Year == DateTime.UtcNow.Year)
    });
})
.WithName("GetInvoiceStats")
.WithTags("Invoices")
.WithSummary("Get invoice statistics");

app.Run();

// Helper function to map entity to DTO
static object MapToInvoiceDto(InvoiceEntity invoice) => new
{
    invoice.Id,
    invoice.InvoiceNumber,
    invoice.OrderId,
    invoice.OrderNumber,
    invoice.ClientName,
    invoice.FiscalCode,
    invoice.IsCompany,
    invoice.BillingAddress,
    invoice.Email,
    invoice.NetAmount,
    invoice.VatAmount,
    invoice.VatRate,
    invoice.TotalAmount,
    invoice.Currency,
    invoice.IssuedAt,
    invoice.CreatedAt,
    Lines = invoice.Lines.Select(l => new
    {
        l.ProductCode,
        l.ProductName,
        l.Quantity,
        l.UnitPrice,
        l.LineTotal
    })
};

// === Request/Response DTOs ===

public record ValidateFiscalCodeRequest
{
    public string FiscalCode { get; init; } = string.Empty;
}

public record ValidateFiscalCodeResponse
{
    public bool IsValid { get; init; }
    public string? NormalizedValue { get; init; }
    public string? NumericValue { get; init; }
    public bool IsVatPayer { get; init; }
    public string? Error { get; init; }
}

public record GenerateInvoiceRequest
{
    public Guid OrderId { get; init; }
    public string OrderNumber { get; init; } = string.Empty;
    public string? FiscalCode { get; init; } // Optional - null for individuals
    public string ClientName { get; init; } = string.Empty;
    public string BillingAddress { get; init; } = string.Empty;
    public decimal OrderTotal { get; init; }
    public string Currency { get; init; } = "RON";
    public List<OrderLineRequest> OrderLines { get; init; } = new();
    public string Email { get; init; } = string.Empty; // Required for invoice delivery
}

public record OrderLineRequest
{
    public string ProductCode { get; init; } = string.Empty;
    public string ProductName { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public decimal UnitPrice { get; init; }
    public decimal LineTotal { get; init; }
}

public record GenerateInvoiceResponse
{
    public bool Success { get; init; }
    public string InvoiceNumber { get; init; } = string.Empty;
    public Guid OrderId { get; init; }
    public string ClientName { get; init; } = string.Empty;
    public string? FiscalCode { get; init; } // Null for individuals
    public bool IsCompany { get; init; } // True if FiscalCode was provided
    public decimal NetAmount { get; init; }
    public decimal VatAmount { get; init; }
    public decimal VatRate { get; init; }
    public decimal TotalAmount { get; init; }
    public string Currency { get; init; } = string.Empty;
    public DateTime IssuedAt { get; init; }
    public string BillingAddress { get; init; } = string.Empty;
    public string? EmailSentTo { get; init; } // Email where invoice was sent
}

public record GenerateInvoiceErrorResponse
{
    public bool Success { get; init; }
    public Guid OrderId { get; init; }
    public List<string> Errors { get; init; } = new();
}
