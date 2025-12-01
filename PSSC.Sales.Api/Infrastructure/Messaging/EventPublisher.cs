using System.Text.Json;
using Azure.Messaging.ServiceBus;
using PSSC.Sales.Api.Domain.Events;
using PSSC.Sales.Api.Domain.Workflows;

namespace PSSC.Sales.Api.Infrastructure.Messaging;

public class ServiceBusEventPublisher : IEventPublisher, IAsyncDisposable
{
    private readonly ServiceBusClient _client;
    private readonly ServiceBusSender _sender;
    private readonly ILogger<ServiceBusEventPublisher> _logger;

    public ServiceBusEventPublisher(
        IConfiguration configuration,
        ILogger<ServiceBusEventPublisher> logger)
    {
        _logger = logger;

        var connectionString = configuration.GetConnectionString("ServiceBus");
        if (string.IsNullOrEmpty(connectionString))
        {
            throw new InvalidOperationException("ServiceBus connection string is not configured");
        }

        _client = new ServiceBusClient(connectionString);
        _sender = _client.CreateSender("orders"); // Queue/Topic name
    }

    public async Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default)
        where TEvent : IOrderEvent
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

            // Don't throw - we don't want to fail the order because of messaging issues
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
public class InMemoryEventPublisher : IEventPublisher
{
    private readonly ILogger<InMemoryEventPublisher> _logger;
    private readonly List<IOrderEvent> _events = new();

    public InMemoryEventPublisher(ILogger<InMemoryEventPublisher> logger)
    {
        _logger = logger;
    }

    public IReadOnlyList<IOrderEvent> PublishedEvents => _events.AsReadOnly();

    public Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default)
        where TEvent : IOrderEvent
    {
        _events.Add(@event);

        _logger.LogInformation(
            "[InMemory] Published {EventType} for Order {OrderId}: {Event}",
            @event.GetType().Name,
            @event.OrderId,
            JsonSerializer.Serialize(@event, new JsonSerializerOptions { WriteIndented = true }));

        return Task.CompletedTask;
    }
}
