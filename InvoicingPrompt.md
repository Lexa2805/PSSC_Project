1. Value Objects

Generate the following Value Objects using the standard pattern (record, private constructor, TryParse, validation):

FiscalCode (CUI/CIF)

Description: The fiscal identification code for the client.

Rules:

Format: String, can optionally start with "RO" (case insensitive), followed by digits.

Validation: Must respect the control digit validation algorithm for Romanian CUI (test key 753217532).

Normalization: Remove spaces and convert "ro" to "RO".

InvoiceNumber

Description: Unique identifier for the invoice.

Rules:

Format: "INV-{Year}-{SequenceNumber}" (e.g., "INV-2024-0001").

Cannot be null or empty.

MonetaryAmount

Description: Represents a sum of money and its currency.

Properties: decimal Amount, string Currency.

Rules: Amount cannot be negative. Default currency is "RON".

Methods: Add, Multiply (useful for tax calculations).

BillingAddress

Description: The invoicing address.

Properties: City, Street, ZipCode.

Rules: All fields are mandatory.

2. Entity States

Generate the states for the Invoice entity using the "Discriminated Unions" / State Pattern.

Static Class: Invoice
Interface: IInvoice

Required States:

UnvalidatedInvoice:

Initial state, raw data received from the OrderPlaced event.

Properties (all string/raw): FiscalCode, ClientName, Address, OrderTotal, OrderLines.

ValidatedInvoice:

Data has been successfully parsed into Value Objects.

Properties: FiscalCode (VO), BillingAddress (VO), MonetaryAmount (Net Total), OrderLines.

CalculatedInvoice:

Taxes (VAT) have been applied.

Properties: Same as ValidatedInvoice + MonetaryAmount VatAmount, MonetaryAmount TotalWithVat.

PublishedInvoice:

Final invoice, ready to be sent.

Properties: Same as CalculatedInvoice + InvoiceNumber (generated now), DateTime IssuedAt.

InvalidInvoice:

Validation failed.

Properties: IEnumerable<string> Reasons.

3. Domain Operations

Implement the operation classes that transform the states.

ValidateFiscalDataOperation

Input: UnvalidatedInvoice

Output: ValidatedInvoice or InvalidInvoice

Dependencies: Func<FiscalCode, bool> checkCompanyActive (Checks if the company is active in ANAF - mock this).

Logic:

Parse FiscalCode and BillingAddress.

Check if the company is active using the dependency.

If valid -> ValidatedInvoice. Else -> InvalidInvoice.

CalculateTaxOperation

Input: ValidatedInvoice

Output: CalculatedInvoice

Dependencies: None (pure calculation).

Logic:

Standard VAT rate = 19%.

VatAmount = Amount * 0.19.

TotalWithVat = Amount + VatAmount.

PublishInvoiceOperation

Input: CalculatedInvoice

Output: PublishedInvoice

Dependencies: Func<InvoiceNumber> generateInvoiceNumber.

Logic:

Assign a new invoice number.

Set the current date (DateTime.Now).

4. Workflow

GenerateInvoiceWorkflow

Role: Coordinator.

Input: GenerateInvoiceCommand (constructed from OrderPlacedEvent).

Dependencies: All functions required by the operations above.

Pipeline:

UnvalidatedInvoice (from Command).

ValidateFiscalDataOperation.

CalculateTaxOperation.

PublishInvoiceOperation.

Output: InvoiceGeneratedEvent (see below).

Note: This workflow is triggered asynchronously by an external messaging system (Azure Service Bus). The GenerateInvoiceCommand will be created by an Event Listener that deserializes the incoming OrderPlacedEvent.

5. Events

InvoiceGeneratedEvent (Output Event)

Purpose: Notifies the system that the invoice is ready. Ideally, this will be published to a message bus topic.

Properties:

InvoiceNumber

ClientFiscalCode

TotalAmount

GeneratedDate

InvoiceDownloadUrl (optional)

OrderPlacedEvent (Trigger - Input)

Purpose: The event we are listening to via the message bus.

Properties: OrderId, ClientDetails, TotalAmount.