using System.Text.Json;
using Azure.Messaging.ServiceBus;
using PSSC.Shipping.Api.Domain.Events;
using PSSC.Shipping.Api.Domain.Workflows;

namespace PSSC.Shipping.Api.Infrastructure.Messaging;

/// <summary>
/// Publishes shipping events to Azure Service Bus.
/// </summary>
public class ServiceBusShippingEventPublisher : IShippingEventPublisher, IAsyncDisposable
{
    private readonly ServiceBusClient _client;
    private readonly ServiceBusSender _sender;
    private readonly ILogger<ServiceBusShippingEventPublisher> _logger;

    public ServiceBusShippingEventPublisher(
        IConfiguration configuration,
        ILogger<ServiceBusShippingEventPublisher> logger)
    {
        _logger = logger;

        var connectionString = configuration.GetConnectionString("ServiceBus");
        if (string.IsNullOrEmpty(connectionString))
        {
            throw new InvalidOperationException("ServiceBus connection string is not configured");
        }

        _client = new ServiceBusClient(connectionString);
        _sender = _client.CreateSender("shipments"); // Queue/Topic name for shipping events
    }

    public async Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default)
        where TEvent : IShippingEvent
    {
        try
        {
            var eventType = @event.GetType().Name;
            var messageBody = JsonSerializer.Serialize(@event, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
            });

            var message = new ServiceBusMessage(messageBody)
            {
                ContentType = "application/json",
                Subject = eventType,
                MessageId = Guid.NewGuid().ToString(),
                CorrelationId = @event.OrderId.ToString()
            };

            message.ApplicationProperties["EventType"] = eventType;
            message.ApplicationProperties["Timestamp"] = @event.Timestamp.ToString("O");

            await _sender.SendMessageAsync(message, cancellationToken);

            _logger.LogInformation(
                "Published {EventType} for Order {OrderId}",
                eventType,
                @event.OrderId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to publish {EventType} for Order {OrderId}",
                @event.GetType().Name,
                @event.OrderId);

            // Don't throw - we don't want to fail the shipment because of messaging issues
            // In production, you might want to implement retry or dead-letter queue
        }
    }

    public async ValueTask DisposeAsync()
    {
        await _sender.DisposeAsync();
        await _client.DisposeAsync();
    }
}

/// <summary>
/// In-memory event publisher for development/testing when Service Bus is not available
/// </summary>
public class InMemoryShippingEventPublisher : IShippingEventPublisher
{
    private readonly ILogger<InMemoryShippingEventPublisher> _logger;
    private readonly List<IShippingEvent> _events = new();

    public InMemoryShippingEventPublisher(ILogger<InMemoryShippingEventPublisher> logger)
    {
        _logger = logger;
    }

    public IReadOnlyList<IShippingEvent> PublishedEvents => _events.AsReadOnly();

    public Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default)
        where TEvent : IShippingEvent
    {
        _events.Add(@event);

        _logger.LogInformation(
            "[InMemory] Published {EventType} for Order {OrderId}: {Event}",
            @event.GetType().Name,
            @event.OrderId,
            JsonSerializer.Serialize(@event, new JsonSerializerOptions { WriteIndented = true }));

        return Task.CompletedTask;
    }

    public void Clear() => _events.Clear();
}
