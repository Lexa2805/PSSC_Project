using System.Text.Json;
using Azure.Messaging.ServiceBus;
using PSSC.Shipping.Api.Domain.Commands;
using PSSC.Shipping.Api.Domain.Events;
using PSSC.Shipping.Api.Domain.Workflows;

namespace PSSC.Shipping.Api.Infrastructure.Messaging;

/// <summary>
/// Listens to OrderPlacedEvent from Azure Service Bus and triggers ShipOrderWorkflow.
/// </summary>
public class OrderPlacedEventListener : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<OrderPlacedEventListener> _logger;
    private readonly ServiceBusClient? _client;
    private readonly ServiceBusProcessor? _processor;

    public OrderPlacedEventListener(
        IConfiguration configuration,
        IServiceProvider serviceProvider,
        ILogger<OrderPlacedEventListener> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;

        var connectionString = configuration.GetConnectionString("ServiceBus");
        if (!string.IsNullOrEmpty(connectionString))
        {
            _client = new ServiceBusClient(connectionString);
            _processor = _client.CreateProcessor("orders", new ServiceBusProcessorOptions
            {
                AutoCompleteMessages = false,
                MaxConcurrentCalls = 5,
                PrefetchCount = 10
            });
        }
        else
        {
            _logger.LogWarning("ServiceBus connection string not configured. Event listener disabled.");
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (_processor == null)
        {
            _logger.LogWarning("Service Bus processor not available. Shipping will only work via API calls.");
            return;
        }

        _processor.ProcessMessageAsync += ProcessMessageAsync;
        _processor.ProcessErrorAsync += ProcessErrorAsync;

        _logger.LogInformation("Starting Order Placed Event Listener...");
        await _processor.StartProcessingAsync(stoppingToken);

        // Keep running until cancelled
        try
        {
            await Task.Delay(Timeout.Infinite, stoppingToken);
        }
        catch (TaskCanceledException)
        {
            _logger.LogInformation("Order Placed Event Listener stopping...");
        }
    }

    private async Task ProcessMessageAsync(ProcessMessageEventArgs args)
    {
        var messageBody = args.Message.Body.ToString();
        var eventType = args.Message.Subject ?? args.Message.ApplicationProperties.GetValueOrDefault("EventType")?.ToString();

        _logger.LogInformation("Received message: {EventType} - {CorrelationId}", 
            eventType, args.Message.CorrelationId);

        try
        {
            if (eventType == nameof(OrderPlacedEvent) || eventType == "OrderSucceededEvent")
            {
                await HandleOrderPlacedEventAsync(messageBody, args.CancellationToken);
            }
            else if (eventType == nameof(InvoiceGeneratedEvent))
            {
                await HandleInvoiceGeneratedEventAsync(messageBody, args.CancellationToken);
            }
            else
            {
                _logger.LogDebug("Ignoring message of type {EventType}", eventType);
            }

            // Complete the message
            await args.CompleteMessageAsync(args.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing message {MessageId}", args.Message.MessageId);
            
            // Abandon the message for retry
            await args.AbandonMessageAsync(args.Message);
        }
    }

    private async Task HandleOrderPlacedEventAsync(string messageBody, CancellationToken cancellationToken)
    {
        var orderEvent = JsonSerializer.Deserialize<OrderPlacedEvent>(messageBody, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (orderEvent == null)
        {
            _logger.LogWarning("Failed to deserialize OrderPlacedEvent");
            return;
        }

        _logger.LogInformation("Processing OrderPlacedEvent for Order {OrderId} ({OrderNumber})",
            orderEvent.OrderId, orderEvent.OrderNumber);

        // Create command from event
        var orderLines = orderEvent.OrderLines.Select(l => new ShipOrderLineDto(
            l.ProductCode,
            l.ProductName,
            l.Quantity,
            l.Weight > 0 ? l.Weight : 0.5m // Default weight for books
        ));

        var command = new ShipOrderCommand(
            orderEvent.OrderId,
            orderEvent.OrderNumber,
            orderEvent.ClientDetails.CustomerId,
            orderEvent.ClientDetails.CustomerName,
            orderEvent.ClientDetails.DeliveryAddress,
            orderEvent.ClientDetails.ContactPhone,
            orderLines
        );

        // Execute workflow
        using var scope = _serviceProvider.CreateScope();
        var workflow = scope.ServiceProvider.GetRequiredService<IShipOrderWorkflow>();
        
        var result = await workflow.ExecuteAsync(command, cancellationToken);

        _logger.LogInformation("Shipping workflow completed for Order {OrderId} with result: {ResultType}",
            orderEvent.OrderId, result.GetType().Name);
    }

    private async Task HandleInvoiceGeneratedEventAsync(string messageBody, CancellationToken cancellationToken)
    {
        var invoiceEvent = JsonSerializer.Deserialize<InvoiceGeneratedEvent>(messageBody, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (invoiceEvent == null)
        {
            _logger.LogWarning("Failed to deserialize InvoiceGeneratedEvent");
            return;
        }

        _logger.LogInformation("Processing InvoiceGeneratedEvent for Order {OrderId} (Invoice: {InvoiceNumber})",
            invoiceEvent.OrderId, invoiceEvent.InvoiceNumber);

        // Create command from event
        var orderLines = invoiceEvent.OrderLines.Select(l => new ShipOrderLineDto(
            l.ProductCode,
            l.ProductName,
            l.Quantity,
            l.Weight > 0 ? l.Weight : 0.5m
        ));

        var command = new ShipOrderCommand(
            invoiceEvent.OrderId,
            invoiceEvent.OrderNumber,
            "", // Customer ID not in invoice event
            invoiceEvent.ClientName,
            invoiceEvent.DeliveryAddress,
            invoiceEvent.ContactPhone,
            orderLines
        );

        // Execute workflow
        using var scope = _serviceProvider.CreateScope();
        var workflow = scope.ServiceProvider.GetRequiredService<IShipOrderWorkflow>();
        
        var result = await workflow.ExecuteAsync(command, cancellationToken);

        _logger.LogInformation("Shipping workflow completed for Invoice {InvoiceNumber} with result: {ResultType}",
            invoiceEvent.InvoiceNumber, result.GetType().Name);
    }

    private Task ProcessErrorAsync(ProcessErrorEventArgs args)
    {
        _logger.LogError(args.Exception, 
            "Error in Service Bus processor. Source: {Source}, Namespace: {Namespace}", 
            args.ErrorSource, args.FullyQualifiedNamespace);
        
        return Task.CompletedTask;
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_processor != null)
        {
            await _processor.StopProcessingAsync(cancellationToken);
            await _processor.DisposeAsync();
        }

        if (_client != null)
        {
            await _client.DisposeAsync();
        }

        await base.StopAsync(cancellationToken);
    }
}
