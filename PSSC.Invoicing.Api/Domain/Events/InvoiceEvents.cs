namespace PSSC.Invoicing.Api.Domain.Events;

/// <summary>
/// Base interface for invoice events
/// </summary>
public interface IInvoiceEvent
{
    Guid OrderId { get; }
    DateTime Timestamp { get; }
}

/// <summary>
/// OrderPlacedEvent - The trigger event we are listening to.
/// This event is received from the Sales domain when an order is successfully placed.
/// </summary>
public record OrderPlacedEvent : IInvoiceEvent
{
    /// <summary>
    /// The unique identifier of the placed order.
    /// </summary>
    public Guid OrderId { get; init; }

    /// <summary>
    /// The order number assigned by the Sales domain.
    /// </summary>
    public string OrderNumber { get; init; }

    /// <summary>
    /// Client details for invoicing.
    /// </summary>
    public ClientDetails ClientDetails { get; init; }

    /// <summary>
    /// The total amount of the order (before any additional taxes).
    /// </summary>
    public decimal TotalAmount { get; init; }

    /// <summary>
    /// Currency of the order.
    /// </summary>
    public string Currency { get; init; }

    /// <summary>
    /// The order lines (products ordered).
    /// </summary>
    public IReadOnlyList<OrderLineDetails> OrderLines { get; init; }

    /// <summary>
    /// When the event was created.
    /// </summary>
    public DateTime Timestamp { get; init; }

    public OrderPlacedEvent()
    {
        OrderId = Guid.Empty;
        OrderNumber = string.Empty;
        ClientDetails = new ClientDetails();
        TotalAmount = 0;
        Currency = "RON";
        OrderLines = Array.Empty<OrderLineDetails>();
        Timestamp = DateTime.UtcNow;
    }

    public OrderPlacedEvent(
        Guid orderId,
        string orderNumber,
        ClientDetails clientDetails,
        decimal totalAmount,
        string currency,
        IEnumerable<OrderLineDetails> orderLines)
    {
        OrderId = orderId;
        OrderNumber = orderNumber;
        ClientDetails = clientDetails;
        TotalAmount = totalAmount;
        Currency = currency;
        OrderLines = orderLines.ToList().AsReadOnly();
        Timestamp = DateTime.UtcNow;
    }
}

/// <summary>
/// Client details from the order, used for invoice generation.
/// </summary>
public record ClientDetails
{
    /// <summary>
    /// The customer ID (internal identifier).
    /// </summary>
    public string CustomerId { get; init; } = string.Empty;

    /// <summary>
    /// The company/client name.
    /// </summary>
    public string ClientName { get; init; } = string.Empty;

    /// <summary>
    /// The fiscal code (CUI/CIF) for invoicing.
    /// </summary>
    public string FiscalCode { get; init; } = string.Empty;

    /// <summary>
    /// The billing address in format: "Street, City, ZipCode"
    /// </summary>
    public string BillingAddress { get; init; } = string.Empty;

    /// <summary>
    /// Optional email for invoice delivery.
    /// </summary>
    public string? Email { get; init; }
}

/// <summary>
/// Order line details for invoice line items.
/// </summary>
public record OrderLineDetails
{
    public string ProductCode { get; init; } = string.Empty;
    public string ProductName { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public decimal UnitPrice { get; init; }
    public decimal LineTotal { get; init; }
}

/// <summary>
/// InvoiceGeneratedEvent - Output event that notifies the system that the invoice is ready.
/// </summary>
public record InvoiceGeneratedEvent : IInvoiceEvent
{
    /// <summary>
    /// The order ID this invoice is for.
    /// </summary>
    public Guid OrderId { get; init; }

    /// <summary>
    /// The generated invoice number (e.g., "INV-2024-0001").
    /// </summary>
    public string InvoiceNumber { get; init; }

    /// <summary>
    /// The client's fiscal code (CUI/CIF).
    /// </summary>
    public string ClientFiscalCode { get; init; }

    /// <summary>
    /// The client/company name.
    /// </summary>
    public string ClientName { get; init; }

    /// <summary>
    /// The net amount (before VAT).
    /// </summary>
    public decimal NetAmount { get; init; }

    /// <summary>
    /// The VAT amount.
    /// </summary>
    public decimal VatAmount { get; init; }

    /// <summary>
    /// The total amount (including VAT).
    /// </summary>
    public decimal TotalAmount { get; init; }

    /// <summary>
    /// Currency code.
    /// </summary>
    public string Currency { get; init; }

    /// <summary>
    /// When the invoice was generated.
    /// </summary>
    public DateTime GeneratedDate { get; init; }

    /// <summary>
    /// Optional URL where the invoice PDF can be downloaded.
    /// </summary>
    public string? InvoiceDownloadUrl { get; init; }

    /// <summary>
    /// When the event was created.
    /// </summary>
    public DateTime Timestamp { get; init; }

    public InvoiceGeneratedEvent()
    {
        OrderId = Guid.Empty;
        InvoiceNumber = string.Empty;
        ClientFiscalCode = string.Empty;
        ClientName = string.Empty;
        NetAmount = 0;
        VatAmount = 0;
        TotalAmount = 0;
        Currency = "RON";
        GeneratedDate = DateTime.UtcNow;
        Timestamp = DateTime.UtcNow;
    }

    public InvoiceGeneratedEvent(
        Guid orderId,
        string invoiceNumber,
        string clientFiscalCode,
        string clientName,
        decimal netAmount,
        decimal vatAmount,
        decimal totalAmount,
        string currency,
        DateTime generatedDate,
        string? invoiceDownloadUrl = null)
    {
        OrderId = orderId;
        InvoiceNumber = invoiceNumber;
        ClientFiscalCode = clientFiscalCode;
        ClientName = clientName;
        NetAmount = netAmount;
        VatAmount = vatAmount;
        TotalAmount = totalAmount;
        Currency = currency;
        GeneratedDate = generatedDate;
        InvoiceDownloadUrl = invoiceDownloadUrl;
        Timestamp = DateTime.UtcNow;
    }
}

/// <summary>
/// Event published when invoice generation fails.
/// </summary>
public record InvoiceGenerationFailedEvent : IInvoiceEvent
{
    /// <summary>
    /// The order ID for which invoice generation failed.
    /// </summary>
    public Guid OrderId { get; init; }

    /// <summary>
    /// List of reasons why the invoice generation failed.
    /// </summary>
    public IReadOnlyList<string> Errors { get; init; }

    /// <summary>
    /// When the event was created.
    /// </summary>
    public DateTime Timestamp { get; init; }

    public InvoiceGenerationFailedEvent(Guid orderId, IEnumerable<string> errors)
    {
        OrderId = orderId;
        Errors = errors.ToList().AsReadOnly();
        Timestamp = DateTime.UtcNow;
    }
}
