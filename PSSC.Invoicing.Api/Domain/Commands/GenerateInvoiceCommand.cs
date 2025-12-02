using PSSC.Invoicing.Api.Domain.Entities;
using PSSC.Invoicing.Api.Domain.Events;

namespace PSSC.Invoicing.Api.Domain.Commands;

/// <summary>
/// Command to generate an invoice, constructed from OrderPlacedEvent.
/// </summary>
public record GenerateInvoiceCommand
{
    /// <summary>
    /// The order ID from the placed order.
    /// </summary>
    public Guid OrderId { get; init; }

    /// <summary>
    /// The order number from the Sales domain.
    /// </summary>
    public string OrderNumber { get; init; }

    /// <summary>
    /// The fiscal code (CUI/CIF) as raw string.
    /// </summary>
    public string FiscalCode { get; init; }

    /// <summary>
    /// The client/company name.
    /// </summary>
    public string ClientName { get; init; }

    /// <summary>
    /// The billing address as raw string.
    /// </summary>
    public string BillingAddress { get; init; }

    /// <summary>
    /// The order total as raw string.
    /// </summary>
    public string OrderTotal { get; init; }

    /// <summary>
    /// Currency of the order.
    /// </summary>
    public string Currency { get; init; }

    /// <summary>
    /// The order lines.
    /// </summary>
    public IReadOnlyList<InvoiceOrderLine> OrderLines { get; init; }

    /// <summary>
    /// Optional email for invoice delivery.
    /// </summary>
    public string? Email { get; init; }

    public GenerateInvoiceCommand(
        Guid orderId,
        string orderNumber,
        string fiscalCode,
        string clientName,
        string billingAddress,
        string orderTotal,
        string currency,
        IEnumerable<InvoiceOrderLine> orderLines,
        string? email = null)
    {
        OrderId = orderId;
        OrderNumber = orderNumber;
        FiscalCode = fiscalCode;
        ClientName = clientName;
        BillingAddress = billingAddress;
        OrderTotal = orderTotal;
        Currency = currency;
        OrderLines = orderLines.ToList().AsReadOnly();
        Email = email;
    }

    /// <summary>
    /// Creates a command from an OrderPlacedEvent.
    /// </summary>
    public static GenerateInvoiceCommand FromEvent(OrderPlacedEvent @event)
    {
        var orderLines = @event.OrderLines.Select(ol => new InvoiceOrderLine(
            ol.ProductCode,
            ol.ProductName,
            ol.Quantity,
            ol.UnitPrice,
            ol.LineTotal
        ));

        return new GenerateInvoiceCommand(
            @event.OrderId,
            @event.OrderNumber,
            @event.ClientDetails.FiscalCode,
            @event.ClientDetails.ClientName,
            @event.ClientDetails.BillingAddress,
            @event.TotalAmount.ToString(),
            @event.Currency,
            orderLines,
            @event.ClientDetails.Email
        );
    }

    /// <summary>
    /// Converts this command to an UnvalidatedInvoice.
    /// </summary>
    public UnvalidatedInvoice ToUnvalidatedInvoice()
    {
        return new UnvalidatedInvoice(
            OrderId,
            FiscalCode,
            ClientName,
            BillingAddress,
            OrderTotal,
            OrderLines
        );
    }
}
