namespace PSSC.Invoicing.Api.Infrastructure.Email;

/// <summary>
/// Interface for email service to send invoice emails.
/// </summary>
public interface IEmailService
{
    /// <summary>
    /// Sends an invoice email to the specified recipient.
    /// </summary>
    Task SendInvoiceEmailAsync(InvoiceEmailRequest request, CancellationToken cancellationToken = default);
}

/// <summary>
/// Request object for sending an invoice email.
/// </summary>
public record InvoiceEmailRequest
{
    public required string ToEmail { get; init; }
    public required string ClientName { get; init; }
    public required string InvoiceNumber { get; init; }
    public required string OrderNumber { get; init; }
    public string? FiscalCode { get; init; }
    public required string BillingAddress { get; init; }
    public required decimal NetAmount { get; init; }
    public required decimal VatAmount { get; init; }
    public required decimal VatRate { get; init; }
    public required decimal TotalAmount { get; init; }
    public required string Currency { get; init; }
    public required DateTime IssuedAt { get; init; }
    public required IReadOnlyList<InvoiceLineItem> Lines { get; init; }
}

public record InvoiceLineItem
{
    public required string ProductCode { get; init; }
    public required string ProductName { get; init; }
    public required int Quantity { get; init; }
    public required decimal UnitPrice { get; init; }
    public required decimal LineTotal { get; init; }
}
