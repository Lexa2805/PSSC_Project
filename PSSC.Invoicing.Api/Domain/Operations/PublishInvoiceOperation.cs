using PSSC.Invoicing.Api.Domain.Entities;
using PSSC.Invoicing.Api.Domain.ValueObjects;
using PSSC.Invoicing.Api.Infrastructure.Persistence;

namespace PSSC.Invoicing.Api.Domain.Operations;

/// <summary>
/// Interface for PublishInvoiceOperation.
/// </summary>
public interface IPublishInvoiceOperation
{
    /// <summary>
    /// Publishes a calculated invoice by assigning an invoice number and issue date.
    /// </summary>
    /// <param name="invoice">The calculated invoice.</param>
    /// <returns>PublishedInvoice ready to be sent.</returns>
    Task<PublishedInvoice> ExecuteAsync(CalculatedInvoice invoice);
}

/// <summary>
/// Publishes a calculated invoice.
/// Input: CalculatedInvoice
/// Output: PublishedInvoice
/// Dependencies: Func&lt;InvoiceNumber&gt; generateInvoiceNumber
/// 
/// Logic:
/// - Assign a new invoice number
/// - Set the current date (DateTime.Now)
/// </summary>
public class PublishInvoiceOperation : IPublishInvoiceOperation
{
    private readonly Func<Task<InvoiceNumber>> _generateInvoiceNumber;

    /// <summary>
    /// Creates a new PublishInvoiceOperation.
    /// </summary>
    /// <param name="generateInvoiceNumber">
    /// Function to generate the next invoice number.
    /// This should be injected - typically queries a database for the last number.
    /// </param>
    public PublishInvoiceOperation(Func<Task<InvoiceNumber>> generateInvoiceNumber)
    {
        _generateInvoiceNumber = generateInvoiceNumber ?? throw new ArgumentNullException(nameof(generateInvoiceNumber));
    }

    /// <summary>
    /// Publishes a calculated invoice by assigning an invoice number and issue date.
    /// </summary>
    public async Task<PublishedInvoice> ExecuteAsync(CalculatedInvoice invoice)
    {
        // Generate the next invoice number
        var invoiceNumber = await _generateInvoiceNumber();

        // Create the published invoice with the invoice number and current timestamp
        return new PublishedInvoice(invoice, invoiceNumber);
    }
}

/// <summary>
/// Simple in-memory invoice number generator for development/testing.
/// In production, this would use a database sequence or similar mechanism.
/// </summary>
public class InMemoryInvoiceNumberGenerator
{
    private int _currentSequence = 0;
    private readonly object _lock = new();

    /// <summary>
    /// Gets the next invoice number in sequence.
    /// Thread-safe implementation.
    /// </summary>
    public Task<InvoiceNumber> GenerateNextAsync()
    {
        lock (_lock)
        {
            _currentSequence++;
            var invoiceNumber = InvoiceNumber.Create(DateTime.UtcNow.Year, _currentSequence);
            return Task.FromResult(invoiceNumber);
        }
    }

    /// <summary>
    /// Creates a generator function that can be used as a dependency.
    /// </summary>
    public Func<Task<InvoiceNumber>> AsGenerator() => GenerateNextAsync;
}

/// <summary>
/// Database-backed invoice number generator for production use.
/// Uses the invoice repository to determine the next number.
/// </summary>
public class DatabaseInvoiceNumberGenerator
{
    private readonly IInvoiceRepository _repository;

    public DatabaseInvoiceNumberGenerator(IInvoiceRepository repository)
    {
        _repository = repository;
    }

    /// <summary>
    /// Gets the next invoice number from the database.
    /// </summary>
    public async Task<InvoiceNumber> GenerateNextAsync()
    {
        var nextNumber = await _repository.GetNextInvoiceNumberAsync();
        return InvoiceNumber.Parse(nextNumber);
    }

    /// <summary>
    /// Creates a generator function that can be used as a dependency.
    /// </summary>
    public Func<Task<InvoiceNumber>> AsGenerator() => GenerateNextAsync;
}
