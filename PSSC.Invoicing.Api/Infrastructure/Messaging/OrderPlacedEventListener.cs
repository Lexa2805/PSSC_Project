using System.Text.Json;
using Azure.Messaging.ServiceBus;
using PSSC.Invoicing.Api.Domain.Commands;
using PSSC.Invoicing.Api.Domain.Entities;
using PSSC.Invoicing.Api.Domain.Events;
using PSSC.Invoicing.Api.Domain.Workflows;

namespace PSSC.Invoicing.Api.Infrastructure.Messaging;

/// <summary>
/// Background service that listens for OrderPlacedEvent messages from Azure Service Bus
/// and triggers the invoice generation workflow.
/// </summary>
public class OrderPlacedEventListener : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<OrderPlacedEventListener> _logger;
    private readonly ServiceBusClient _client;
    private readonly ServiceBusProcessor _processor;

    public OrderPlacedEventListener(
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        ILogger<OrderPlacedEventListener> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;

        var connectionString = configuration.GetConnectionString("ServiceBus");
        if (string.IsNullOrEmpty(connectionString))
        {
            throw new InvalidOperationException("ServiceBus connection string is not configured");
        }

        _client = new ServiceBusClient(connectionString);
        
        // Listen to the "orders" queue/topic for OrderSucceededEvent messages
        _processor = _client.CreateProcessor("orders", new ServiceBusProcessorOptions
        {
            AutoCompleteMessages = false,
            MaxConcurrentCalls = 1,
            PrefetchCount = 10
        });
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _processor.ProcessMessageAsync += ProcessMessageAsync;
        _processor.ProcessErrorAsync += ProcessErrorAsync;

        _logger.LogInformation("Starting OrderPlacedEvent listener...");
        
        await _processor.StartProcessingAsync(stoppingToken);

        // Wait until cancellation is requested
        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    private async Task ProcessMessageAsync(ProcessMessageEventArgs args)
    {
        var eventType = args.Message.ApplicationProperties.TryGetValue("EventType", out var type) 
            ? type?.ToString() 
            : args.Message.Subject;

        _logger.LogInformation(
            "Received message: {EventType}, MessageId: {MessageId}",
            eventType,
            args.Message.MessageId);

        // Only process OrderSucceededEvent messages
        if (eventType != "OrderSucceededEvent")
        {
            _logger.LogDebug("Skipping message of type {EventType}", eventType);
            await args.CompleteMessageAsync(args.Message);
            return;
        }

        try
        {
            var body = args.Message.Body.ToString();
            var orderEvent = JsonSerializer.Deserialize<OrderPlacedEventDto>(body, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (orderEvent == null)
            {
                _logger.LogWarning("Failed to deserialize OrderPlacedEvent");
                await args.DeadLetterMessageAsync(args.Message, "DeserializationFailed", "Could not deserialize the message body");
                return;
            }

            // Create a scope to resolve scoped services
            using var scope = _serviceProvider.CreateScope();
            var workflow = scope.ServiceProvider.GetRequiredService<IGenerateInvoiceWorkflow>();

            // Convert DTO to domain event
            var domainEvent = MapToDomainEvent(orderEvent);
            
            // Create command from event
            var command = GenerateInvoiceCommand.FromEvent(domainEvent);

            // Execute the workflow
            var result = await workflow.ExecuteAsync(command, args.CancellationToken);

            if (result is PublishedInvoice published)
            {
                _logger.LogInformation(
                    "Invoice {InvoiceNumber} generated for Order {OrderId}",
                    published.InvoiceNumber,
                    published.OrderId);
            }
            else if (result is InvalidInvoice invalid)
            {
                _logger.LogWarning(
                    "Invoice generation failed for Order {OrderId}: {Errors}",
                    invalid.OrderId,
                    string.Join(", ", invalid.Reasons));
            }

            // Complete the message
            await args.CompleteMessageAsync(args.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing OrderPlacedEvent message");
            
            // Dead letter the message after failure
            await args.DeadLetterMessageAsync(
                args.Message, 
                "ProcessingFailed", 
                ex.Message);
        }
    }

    private Task ProcessErrorAsync(ProcessErrorEventArgs args)
    {
        _logger.LogError(args.Exception,
            "Service Bus error: {ErrorSource}, Entity: {EntityPath}",
            args.ErrorSource,
            args.EntityPath);

        return Task.CompletedTask;
    }

    private static OrderPlacedEvent MapToDomainEvent(OrderPlacedEventDto dto)
    {
        return new OrderPlacedEvent(
            dto.OrderId,
            dto.OrderNumber,
            new ClientDetails
            {
                CustomerId = dto.CustomerId,
                ClientName = dto.CustomerId, // Use CustomerId as name if not provided
                FiscalCode = dto.FiscalCode ?? "18547290", // Default valid CUI for testing
                BillingAddress = dto.BillingAddress ?? "Strada Test 1, Bucuresti, 010101"
            },
            dto.TotalAmount,
            dto.Currency,
            dto.Lines.Select(l => new OrderLineDetails
            {
                ProductCode = l.ProductCode,
                ProductName = l.ProductCode, // Product name could be fetched separately
                Quantity = l.Quantity,
                UnitPrice = l.UnitPrice,
                LineTotal = l.LineTotal
            })
        );
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Stopping OrderPlacedEvent listener...");
        
        await _processor.StopProcessingAsync(cancellationToken);
        await _processor.DisposeAsync();
        await _client.DisposeAsync();
        
        await base.StopAsync(cancellationToken);
    }
}

/// <summary>
/// DTO for deserializing OrderSucceededEvent from Sales API
/// </summary>
public class OrderPlacedEventDto
{
    public Guid OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerId { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = "RON";
    public string? FiscalCode { get; set; }
    public string? BillingAddress { get; set; }
    public List<OrderLineDto> Lines { get; set; } = new();
    public DateTime Timestamp { get; set; }
}

public class OrderLineDto
{
    public string ProductCode { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}
