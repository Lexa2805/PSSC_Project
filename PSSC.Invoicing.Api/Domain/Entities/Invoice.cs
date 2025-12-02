using PSSC.Invoicing.Api.Domain.ValueObjects;

namespace PSSC.Invoicing.Api.Domain.Entities;

/// <summary>
/// Base interface for all invoice states (for pattern matching)
/// Using "Discriminated Unions" / State Pattern
/// </summary>
public interface IInvoice { }

/// <summary>
/// Represents an order line item for invoice processing
/// </summary>
public record InvoiceOrderLine(
    string ProductCode,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    decimal LineTotal
);

/// <summary>
/// Initial state: Raw data received from the OrderPlaced event, not yet validated.
/// All properties are strings/raw data.
/// </summary>
public record UnvalidatedInvoice : IInvoice
{
    public Guid OrderId { get; }
    public string FiscalCode { get; }
    public string ClientName { get; }
    public string Address { get; }
    public string OrderTotal { get; }
    public IReadOnlyList<InvoiceOrderLine> OrderLines { get; }
    public DateTime ReceivedAt { get; }

    public UnvalidatedInvoice(
        Guid orderId,
        string fiscalCode,
        string clientName,
        string address,
        string orderTotal,
        IEnumerable<InvoiceOrderLine> orderLines)
    {
        OrderId = orderId;
        FiscalCode = fiscalCode;
        ClientName = clientName;
        Address = address;
        OrderTotal = orderTotal;
        OrderLines = orderLines.ToList().AsReadOnly();
        ReceivedAt = DateTime.UtcNow;
    }
}

/// <summary>
/// Data has been successfully parsed into Value Objects.
/// </summary>
public record ValidatedInvoice : IInvoice
{
    public Guid OrderId { get; }
    public FiscalCode? FiscalCode { get; }
    public string ClientName { get; }
    public BillingAddress BillingAddress { get; }
    public MonetaryAmount NetTotal { get; }
    public IReadOnlyList<InvoiceOrderLine> OrderLines { get; }
    public DateTime ReceivedAt { get; }
    public DateTime ValidatedAt { get; }

    public ValidatedInvoice(
        Guid orderId,
        FiscalCode? fiscalCode,
        string clientName,
        BillingAddress billingAddress,
        MonetaryAmount netTotal,
        IEnumerable<InvoiceOrderLine> orderLines,
        DateTime receivedAt)
    {
        OrderId = orderId;
        FiscalCode = fiscalCode;
        ClientName = clientName;
        BillingAddress = billingAddress;
        NetTotal = netTotal;
        OrderLines = orderLines.ToList().AsReadOnly();
        ReceivedAt = receivedAt;
        ValidatedAt = DateTime.UtcNow;
    }
}

/// <summary>
/// Taxes (VAT) have been applied.
/// </summary>
public record CalculatedInvoice : IInvoice
{
    public Guid OrderId { get; }
    public FiscalCode? FiscalCode { get; }
    public string ClientName { get; }
    public BillingAddress BillingAddress { get; }
    public MonetaryAmount NetTotal { get; }
    public MonetaryAmount VatAmount { get; }
    public MonetaryAmount TotalWithVat { get; }
    public decimal VatRate { get; }
    public IReadOnlyList<InvoiceOrderLine> OrderLines { get; }
    public DateTime ReceivedAt { get; }
    public DateTime ValidatedAt { get; }
    public DateTime CalculatedAt { get; }

    public CalculatedInvoice(
        ValidatedInvoice validatedInvoice,
        MonetaryAmount vatAmount,
        MonetaryAmount totalWithVat,
        decimal vatRate = 0.19m)
    {
        OrderId = validatedInvoice.OrderId;
        FiscalCode = validatedInvoice.FiscalCode;
        ClientName = validatedInvoice.ClientName;
        BillingAddress = validatedInvoice.BillingAddress;
        NetTotal = validatedInvoice.NetTotal;
        VatAmount = vatAmount;
        TotalWithVat = totalWithVat;
        VatRate = vatRate;
        OrderLines = validatedInvoice.OrderLines;
        ReceivedAt = validatedInvoice.ReceivedAt;
        ValidatedAt = validatedInvoice.ValidatedAt;
        CalculatedAt = DateTime.UtcNow;
    }
}

/// <summary>
/// Final invoice, ready to be sent.
/// Includes the generated invoice number and issue date.
/// </summary>
public record PublishedInvoice : IInvoice
{
    public Guid OrderId { get; }
    public InvoiceNumber InvoiceNumber { get; }
    public FiscalCode? FiscalCode { get; }
    public string ClientName { get; }
    public BillingAddress BillingAddress { get; }
    public MonetaryAmount NetTotal { get; }
    public MonetaryAmount VatAmount { get; }
    public MonetaryAmount TotalWithVat { get; }
    public decimal VatRate { get; }
    public IReadOnlyList<InvoiceOrderLine> OrderLines { get; }
    public DateTime ReceivedAt { get; }
    public DateTime ValidatedAt { get; }
    public DateTime CalculatedAt { get; }
    public DateTime IssuedAt { get; }

    public PublishedInvoice(CalculatedInvoice calculatedInvoice, InvoiceNumber invoiceNumber)
    {
        OrderId = calculatedInvoice.OrderId;
        InvoiceNumber = invoiceNumber;
        FiscalCode = calculatedInvoice.FiscalCode;
        ClientName = calculatedInvoice.ClientName;
        BillingAddress = calculatedInvoice.BillingAddress;
        NetTotal = calculatedInvoice.NetTotal;
        VatAmount = calculatedInvoice.VatAmount;
        TotalWithVat = calculatedInvoice.TotalWithVat;
        VatRate = calculatedInvoice.VatRate;
        OrderLines = calculatedInvoice.OrderLines;
        ReceivedAt = calculatedInvoice.ReceivedAt;
        ValidatedAt = calculatedInvoice.ValidatedAt;
        CalculatedAt = calculatedInvoice.CalculatedAt;
        IssuedAt = DateTime.UtcNow;
    }
}

/// <summary>
/// Validation failed. Contains the list of validation errors.
/// </summary>
public record InvalidInvoice : IInvoice
{
    public Guid OrderId { get; }
    public IReadOnlyList<string> Reasons { get; }
    public DateTime FailedAt { get; }

    public InvalidInvoice(Guid orderId, IEnumerable<string> reasons)
    {
        OrderId = orderId;
        Reasons = reasons.ToList().AsReadOnly();
        FailedAt = DateTime.UtcNow;
    }
}

/// <summary>
/// Static class to provide factory methods for Invoice states
/// </summary>
public static class Invoice
{
    public static UnvalidatedInvoice Unvalidated(
        Guid orderId,
        string fiscalCode,
        string clientName,
        string address,
        string orderTotal,
        IEnumerable<InvoiceOrderLine> orderLines)
        => new(orderId, fiscalCode, clientName, address, orderTotal, orderLines);

    public static InvalidInvoice Invalid(Guid orderId, params string[] reasons)
        => new(orderId, reasons);

    public static InvalidInvoice Invalid(Guid orderId, IEnumerable<string> reasons)
        => new(orderId, reasons);
}
