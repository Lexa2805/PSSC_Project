using Azure.Communication.Email;
using Azure;

namespace PSSC.Invoicing.Api.Infrastructure.Email;

/// <summary>
/// Email service implementation using Azure Communication Services.
/// </summary>
public class AzureEmailService : IEmailService
{
    private readonly EmailClient _emailClient;
    private readonly string _senderAddress;
    private readonly ILogger<AzureEmailService> _logger;

    public AzureEmailService(IConfiguration configuration, ILogger<AzureEmailService> logger)
    {
        var connectionString = configuration["AzureCommunicationServices:ConnectionString"]
            ?? throw new InvalidOperationException("Azure Communication Services connection string not configured");
        
        _senderAddress = configuration["AzureCommunicationServices:SenderEmail"]
            ?? "DoNotReply@pssc-echipa1.europe.communication.azure.com";
        
        _emailClient = new EmailClient(connectionString);
        _logger = logger;
    }

    public async Task SendInvoiceEmailAsync(InvoiceEmailRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var htmlContent = GenerateInvoiceHtml(request);
            var plainTextContent = GenerateInvoicePlainText(request);

            var emailMessage = new EmailMessage(
                senderAddress: _senderAddress,
                recipientAddress: request.ToEmail,
                content: new EmailContent($"Factură #{request.InvoiceNumber} - Comandă #{request.OrderNumber}")
                {
                    Html = htmlContent,
                    PlainText = plainTextContent
                }
            );

            var operation = await _emailClient.SendAsync(WaitUntil.Started, emailMessage, cancellationToken);
            _logger.LogInformation("Invoice email sent to {Email} for invoice {InvoiceNumber}", 
                request.ToEmail, request.InvoiceNumber);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send invoice email to {Email}", request.ToEmail);
            throw;
        }
    }

    private static string GenerateInvoiceHtml(InvoiceEmailRequest request)
    {
        var linesHtml = string.Join("", request.Lines.Select(l => $@"
            <tr>
                <td style='padding: 12px; border-bottom: 1px solid #eee;'>{l.ProductName}</td>
                <td style='padding: 12px; border-bottom: 1px solid #eee; text-align: center;'>{l.Quantity}</td>
                <td style='padding: 12px; border-bottom: 1px solid #eee; text-align: right;'>{l.UnitPrice:F2} {request.Currency}</td>
                <td style='padding: 12px; border-bottom: 1px solid #eee; text-align: right;'>{l.LineTotal:F2} {request.Currency}</td>
            </tr>"));

        var fiscalCodeSection = !string.IsNullOrEmpty(request.FiscalCode)
            ? $"<p style='margin: 5px 0;'><strong>CUI:</strong> {request.FiscalCode}</p>"
            : "";

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
</head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #f3c9d5 0%, #e8b4c4 100%); padding: 30px; border-radius: 10px 10px 0 0;'>
        <h1 style='margin: 0; color: #333; font-size: 28px;'>📚 PSSC Bookstore</h1>
        <p style='margin: 10px 0 0; color: #555;'>Factură Fiscală</p>
    </div>
    
    <div style='background: #fff; padding: 30px; border: 1px solid #eee; border-top: none;'>
        <div style='display: flex; justify-content: space-between; margin-bottom: 30px;'>
            <div>
                <h2 style='color: #d4849a; margin: 0 0 15px;'>Factură #{request.InvoiceNumber}</h2>
                <p style='margin: 5px 0; color: #666;'><strong>Comandă:</strong> #{request.OrderNumber}</p>
                <p style='margin: 5px 0; color: #666;'><strong>Data:</strong> {request.IssuedAt:dd.MM.yyyy HH:mm}</p>
            </div>
        </div>

        <div style='background: #fdf5f7; padding: 20px; border-radius: 8px; margin-bottom: 30px;'>
            <h3 style='margin: 0 0 15px; color: #333;'>Date Client</h3>
            <p style='margin: 5px 0;'><strong>Nume:</strong> {request.ClientName}</p>
            {fiscalCodeSection}
            <p style='margin: 5px 0;'><strong>Adresă:</strong> {request.BillingAddress}</p>
        </div>

        <h3 style='color: #333; margin-bottom: 15px;'>Produse Comandate</h3>
        <table style='width: 100%; border-collapse: collapse; margin-bottom: 30px;'>
            <thead>
                <tr style='background: #f8d7e0;'>
                    <th style='padding: 12px; text-align: left;'>Produs</th>
                    <th style='padding: 12px; text-align: center;'>Cantitate</th>
                    <th style='padding: 12px; text-align: right;'>Preț Unitar</th>
                    <th style='padding: 12px; text-align: right;'>Total</th>
                </tr>
            </thead>
            <tbody>
                {linesHtml}
            </tbody>
        </table>

        <div style='background: #f9f9f9; padding: 20px; border-radius: 8px;'>
            <div style='display: flex; justify-content: space-between; margin-bottom: 10px;'>
                <span>Subtotal (fără TVA):</span>
                <span>{request.NetAmount:F2} {request.Currency}</span>
            </div>
            <div style='display: flex; justify-content: space-between; margin-bottom: 10px;'>
                <span>TVA ({request.VatRate * 100:F0}%):</span>
                <span>{request.VatAmount:F2} {request.Currency}</span>
            </div>
            <div style='display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: #d4849a; border-top: 2px solid #d4849a; padding-top: 15px; margin-top: 15px;'>
                <span>TOTAL:</span>
                <span>{request.TotalAmount:F2} {request.Currency}</span>
            </div>
        </div>
    </div>

    <div style='background: #333; color: #fff; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;'>
        <p style='margin: 0;'>Mulțumim pentru achiziție! 📖</p>
        <p style='margin: 10px 0 0; font-size: 12px; color: #999;'>PSSC Bookstore - Proiect Universitar</p>
    </div>
</body>
</html>";
    }

    private static string GenerateInvoicePlainText(InvoiceEmailRequest request)
    {
        var lines = string.Join("\n", request.Lines.Select(l => 
            $"  - {l.ProductName} x {l.Quantity} = {l.LineTotal:F2} {request.Currency}"));

        var fiscalCodeLine = !string.IsNullOrEmpty(request.FiscalCode)
            ? $"\nCUI: {request.FiscalCode}"
            : "";

        return $@"
PSSC BOOKSTORE - FACTURĂ FISCALĂ
================================

Factură: #{request.InvoiceNumber}
Comandă: #{request.OrderNumber}
Data: {request.IssuedAt:dd.MM.yyyy HH:mm}

DATE CLIENT
-----------
Nume: {request.ClientName}{fiscalCodeLine}
Adresă: {request.BillingAddress}

PRODUSE COMANDATE
-----------------
{lines}

SUMAR
-----
Subtotal (fără TVA): {request.NetAmount:F2} {request.Currency}
TVA ({request.VatRate * 100:F0}%): {request.VatAmount:F2} {request.Currency}
TOTAL: {request.TotalAmount:F2} {request.Currency}

================================
Mulțumim pentru achiziție!
PSSC Bookstore - Proiect Universitar
";
    }
}

/// <summary>
/// Development email service that logs emails instead of sending them.
/// </summary>
public class DevelopmentEmailService : IEmailService
{
    private readonly ILogger<DevelopmentEmailService> _logger;

    public DevelopmentEmailService(ILogger<DevelopmentEmailService> logger)
    {
        _logger = logger;
    }

    public Task SendInvoiceEmailAsync(InvoiceEmailRequest request, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "📧 [DEV] Would send invoice email:\n" +
            "   To: {Email}\n" +
            "   Invoice: {InvoiceNumber}\n" +
            "   Order: {OrderNumber}\n" +
            "   Client: {ClientName}\n" +
            "   CUI: {FiscalCode}\n" +
            "   Total: {Total} {Currency}",
            request.ToEmail,
            request.InvoiceNumber,
            request.OrderNumber,
            request.ClientName,
            request.FiscalCode ?? "N/A (Persoană Fizică)",
            request.TotalAmount,
            request.Currency
        );

        return Task.CompletedTask;
    }
}
