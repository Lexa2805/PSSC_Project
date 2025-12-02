using PSSC.Invoicing.Api.Domain.Commands;
using PSSC.Invoicing.Api.Domain.Entities;
using PSSC.Invoicing.Api.Domain.Events;
using PSSC.Invoicing.Api.Domain.Operations;
using PSSC.Invoicing.Api.Infrastructure.Email;
using PSSC.Invoicing.Api.Infrastructure.Persistence;

namespace PSSC.Invoicing.Api.Domain.Workflows;

/// <summary>
/// Interface for the GenerateInvoiceWorkflow.
/// </summary>
public interface IGenerateInvoiceWorkflow
{
    /// <summary>
    /// Executes the invoice generation workflow.
    /// </summary>
    /// <param name="command">The command containing invoice data.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The resulting invoice (either PublishedInvoice or InvalidInvoice).</returns>
    Task<IInvoice> ExecuteAsync(GenerateInvoiceCommand command, CancellationToken cancellationToken = default);
}

/// <summary>
/// Interface for publishing invoice events.
/// </summary>
public interface IInvoiceEventPublisher
{
    Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default) where TEvent : IInvoiceEvent;
}

/// <summary>
/// GenerateInvoiceWorkflow - Coordinator for invoice generation.
/// 
/// Pipeline:
/// 1. UnvalidatedInvoice (from Command)
/// 2. ValidateFiscalDataOperation -> ValidatedInvoice or InvalidInvoice
/// 3. CalculateTaxOperation -> CalculatedInvoice
/// 4. PublishInvoiceOperation -> PublishedInvoice
/// 5. Send email with invoice details
/// 
/// Output: InvoiceGeneratedEvent or InvoiceGenerationFailedEvent
/// </summary>
public class GenerateInvoiceWorkflow : IGenerateInvoiceWorkflow
{
    private readonly IValidateFiscalDataOperation _validateFiscalDataOp;
    private readonly ICalculateTaxOperation _calculateTaxOp;
    private readonly IPublishInvoiceOperation _publishInvoiceOp;
    private readonly IInvoiceEventPublisher _eventPublisher;
    private readonly IEmailService _emailService;
    private readonly IInvoiceRepository _invoiceRepository;
    private readonly ILogger<GenerateInvoiceWorkflow> _logger;

    public GenerateInvoiceWorkflow(
        IValidateFiscalDataOperation validateFiscalDataOp,
        ICalculateTaxOperation calculateTaxOp,
        IPublishInvoiceOperation publishInvoiceOp,
        IInvoiceEventPublisher eventPublisher,
        IEmailService emailService,
        IInvoiceRepository invoiceRepository,
        ILogger<GenerateInvoiceWorkflow> logger)
    {
        _validateFiscalDataOp = validateFiscalDataOp ?? throw new ArgumentNullException(nameof(validateFiscalDataOp));
        _calculateTaxOp = calculateTaxOp ?? throw new ArgumentNullException(nameof(calculateTaxOp));
        _publishInvoiceOp = publishInvoiceOp ?? throw new ArgumentNullException(nameof(publishInvoiceOp));
        _eventPublisher = eventPublisher ?? throw new ArgumentNullException(nameof(eventPublisher));
        _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
        _invoiceRepository = invoiceRepository ?? throw new ArgumentNullException(nameof(invoiceRepository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<IInvoice> ExecuteAsync(GenerateInvoiceCommand command, CancellationToken cancellationToken = default)
    {
        // Step 1: Create UnvalidatedInvoice from command
        var unvalidatedInvoice = command.ToUnvalidatedInvoice();

        // Step 2: Validate fiscal data
        var validationResult = await _validateFiscalDataOp.ExecuteAsync(unvalidatedInvoice, cancellationToken);

        // Check if validation failed
        if (validationResult is InvalidInvoice invalidInvoice)
        {
            await PublishFailureEventAsync(invalidInvoice, cancellationToken);
            return invalidInvoice;
        }

        // validationResult must be ValidatedInvoice at this point
        var validatedInvoice = (ValidatedInvoice)validationResult;

        // Step 3: Calculate taxes
        var calculatedInvoice = _calculateTaxOp.Execute(validatedInvoice);

        // Step 4: Publish the invoice (generate number and set issue date)
        var publishedInvoice = await _publishInvoiceOp.ExecuteAsync(calculatedInvoice);

        // Step 5: Save invoice to database
        try
        {
            await _invoiceRepository.SaveAsync(publishedInvoice, command.OrderNumber, command.Email, cancellationToken);
            _logger.LogInformation("Invoice {InvoiceNumber} saved to database", publishedInvoice.InvoiceNumber.Value);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save invoice {InvoiceNumber} to database", publishedInvoice.InvoiceNumber.Value);
            // Continue - invoice was generated, just not persisted
        }

        // Step 6: Publish success event
        await PublishSuccessEventAsync(publishedInvoice, cancellationToken);

        // Step 7: Send email with invoice details (if email provided)
        if (!string.IsNullOrWhiteSpace(command.Email))
        {
            await SendInvoiceEmailAsync(publishedInvoice, command, cancellationToken);
        }

        return publishedInvoice;
    }

    private async Task SendInvoiceEmailAsync(PublishedInvoice invoice, GenerateInvoiceCommand command, CancellationToken cancellationToken)
    {
        try
        {
            var emailRequest = new InvoiceEmailRequest
            {
                ToEmail = command.Email!,
                ClientName = invoice.ClientName,
                InvoiceNumber = invoice.InvoiceNumber.Value,
                OrderNumber = command.OrderNumber,
                FiscalCode = invoice.FiscalCode?.Value,
                BillingAddress = invoice.BillingAddress.ToString(),
                NetAmount = invoice.NetTotal.Amount,
                VatAmount = invoice.VatAmount.Amount,
                VatRate = invoice.VatRate,
                TotalAmount = invoice.TotalWithVat.Amount,
                Currency = invoice.NetTotal.Currency,
                IssuedAt = invoice.IssuedAt,
                Lines = invoice.OrderLines.Select(l => new InvoiceLineItem
                {
                    ProductCode = l.ProductCode,
                    ProductName = l.ProductName,
                    Quantity = l.Quantity,
                    UnitPrice = l.UnitPrice,
                    LineTotal = l.LineTotal
                }).ToList()
            };

            await _emailService.SendInvoiceEmailAsync(emailRequest, cancellationToken);
            _logger.LogInformation("Invoice email sent successfully to {Email} for invoice {InvoiceNumber}", 
                command.Email, invoice.InvoiceNumber.Value);
        }
        catch (Exception ex)
        {
            // Log the error but don't fail the invoice generation
            _logger.LogError(ex, "Failed to send invoice email to {Email} for invoice {InvoiceNumber}", 
                command.Email, invoice.InvoiceNumber.Value);
        }
    }

    private async Task PublishSuccessEventAsync(PublishedInvoice invoice, CancellationToken cancellationToken)
    {
        var successEvent = new InvoiceGeneratedEvent(
            invoice.OrderId,
            invoice.InvoiceNumber.Value,
            invoice.FiscalCode?.Value ?? "N/A",
            invoice.ClientName,
            invoice.NetTotal.Amount,
            invoice.VatAmount.Amount,
            invoice.TotalWithVat.Amount,
            invoice.NetTotal.Currency,
            invoice.IssuedAt,
            invoiceDownloadUrl: null // Could be generated here if we had a storage service
        );

        await _eventPublisher.PublishAsync(successEvent, cancellationToken);
    }

    private async Task PublishFailureEventAsync(InvalidInvoice invoice, CancellationToken cancellationToken)
    {
        var failedEvent = new InvoiceGenerationFailedEvent(invoice.OrderId, invoice.Reasons);
        await _eventPublisher.PublishAsync(failedEvent, cancellationToken);
    }
}
