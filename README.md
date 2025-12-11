# PSSC Bookstore - Domain-Driven Design Project

## Echipa
- [Anghel Alexandra]
- [Caluseri Abel]
- [Chiton Roberta]

## Domeniul Ales
**E-Commerce Bookstore System** - Un sistem complet de vânzare online de cărți cu procesare de comenzi, facturare și expediere.

## Descriere
Sistem de e-commerce pentru vânzarea de cărți online, implementat folosind principiile Domain-Driven Design (DDD) și arhitectura de microservicii. Proiectul include trei bounded contexts separate (Sales, Invoicing, Shipping) care comunică prin evenimente folosind Azure Service Bus, cu persistență în Azure SQL Database și notificări email prin Azure Communication Services.

## Bounded Contexts Identificate

### 1. **Sales Context** (Port 5122)
**Responsabilități:**
- Gestionarea cataloagelor de produse (cărți)
- Procesarea comenzilor clienților
- Validarea și calcularea prețurilor
- Verificarea stocului disponibil
- Publicarea evenimentelor `OrderPlaced`

**Agregați:**
- `Order` - Comandă cu linii de produse

**Value Objects:**
- `ProductCode` - Cod unic al produsului
- `Quantity` - Cantitate validată (> 0)
- `Price` - Preț cu valută (RON)

### 2. **Invoicing Context** (Port 5109)
**Responsabilități:**
- Generarea facturilor pentru comenzi
- Validarea datelor fiscale (CNP/CIF)
- Calcularea TVA-ului
- Trimiterea facturilor prin email
- Publicarea evenimentelor `InvoiceGenerated`

**Agregați:**
- `Invoice` - Factură cu linii de produse și calcule fiscale

**Value Objects:**
- `InvoiceNumber` - Număr unic de factură (format: INV-YYYY-NNNN)
- `FiscalCode` - CNP/CIF validat
- `MonetaryAmount` - Sumă monetară cu valută
- `BillingAddress` - Adresă de facturare validată

### 3. **Shipping Context** (Port 5096)
**Responsabilități:**
- Validarea adreselor de livrare
- Generarea AWB-urilor (numere de transport)
- Calcularea costurilor de transport
- Gestionarea curierilor (FAN Courier, DPD, GLS)
- Publicarea evenimentelor `ShipmentCreated`

**Agregați:**
- `Shipment` - Expediere cu AWB și detalii curier

**Value Objects:**
- `AwbNumber` - Număr AWB generat automat
- `DeliveryAddress` - Adresă validată cu țară, oraș, cod poștal
- `Carrier` - Informații curier cu tarife

## Arhitectură Tehnică

### Backend (.NET 9.0)
- **Framework**: ASP.NET Core Minimal APIs
- **ORM**: Entity Framework Core 9.0
- **Database**: Azure SQL Database
- **Messaging**: Azure Service Bus
- **Email**: Azure Communication Services
- **Authentication**: Azure AD (Microsoft Identity Platform)

### Frontend (Next.js 15)
- **Framework**: Next.js 15 (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Lucide Icons, React Hot Toast
- **State Management**: Context API

### Infrastructure
- **Cloud Provider**: Microsoft Azure
- **Database**: Azure SQL Database (psscdb)
- **Service Bus**: Azure Service Bus (pssc-bus)
- **Email Service**: Azure Communication Services (pssc-email)
- **Authentication**: Azure AD B2C

## Event Storming Results

### Event Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            CUSTOMER JOURNEY                                   │
└──────────────────────────────────────────────────────────────────────────────┘

    [Customer]
        │
        │ Browse Products
        ▼
    ┌─────────────┐
    │   Browse    │ ──────► View Categories (Fiction, Science, etc.)
    │   Catalog   │ ──────► Search Books
    └─────────────┘ ──────► Add to Favorites
        │
        │ Add to Cart
        ▼
    ┌─────────────┐
    │  Shopping   │
    │    Cart     │ ──────► Update Quantities
    └─────────────┘ ──────► Apply Discounts (Free shipping >150 RON)
        │
        │ Checkout
        ▼
    ┌─────────────┐
    │   Fill      │
    │   Forms     │ ──────► Billing Info (Name, Fiscal Code)
    └─────────────┘ ──────► Shipping Address (Street, City, Zip)
        │
        │ Place Order
        ▼

═══════════════════════════════════════════════════════════════════════════════
                            SALES BOUNDED CONTEXT
═══════════════════════════════════════════════════════════════════════════════

    ┌─────────────────────────────────────────────────────┐
    │         PlaceOrderWorkflow (Sales API)              │
    ├─────────────────────────────────────────────────────┤
    │                                                       │
    │  1. 📥 Receive: UnvalidatedOrder                     │
    │     └─ customerId, orderLines[]                      │
    │                                                       │
    │  2. ✅ Validate Order                                │
    │     └─ ValidateOrderOperation                        │
    │     └─ Check product codes exist                     │
    │     └─ Validate quantities > 0                       │
    │                                                       │
    │  3. 📊 Check Stock                                   │
    │     └─ CheckStockOperation                           │
    │     └─ Verify availability for each product          │
    │                                                       │
    │  4. 💰 Calculate Prices                              │
    │     └─ CalculatePriceOperation                       │
    │     └─ Fetch product prices                          │
    │     └─ Calculate line totals                         │
    │     └─ Sum total amount                              │
    │                                                       │
    │  5. 💾 Save Order                                    │
    │     └─ Generate OrderId (GUID)                       │
    │     └─ Generate OrderNumber (ORD-YYYYMMDD-XXXX)      │
    │     └─ Persist to Orders table                       │
    │                                                       │
    │  6. 📤 Publish Event: OrderPlaced                    │
    │     └─ To Azure Service Bus                          │
    │                                                       │
    │  7. 📤 Return: PlacedOrder                           │
    │     └─ orderId, orderNumber, totalAmount             │
    └─────────────────────────────────────────────────────┘
                            │
                            │ OrderPlaced Event
                            │ {orderId, orderNumber, customerId,
                            │  orderLines[], totalAmount, currency}
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼

═══════════════════════════════     ═══════════════════════════════════════════
   INVOICING CONTEXT                         SHIPPING CONTEXT
═══════════════════════════════     ═══════════════════════════════════════════

┌─────────────────────────────┐     ┌─────────────────────────────────────────┐
│  GenerateInvoiceWorkflow    │     │      ShipOrderWorkflow                  │
│  (Invoicing API)            │     │      (Shipping API)                     │
├─────────────────────────────┤     ├─────────────────────────────────────────┤
│                             │     │                                         │
│ 1. 📥 Receive Event         │     │ 1. 📥 Receive Event                     │
│    └─ OrderPlaced           │     │    └─ OrderPlaced                       │
│                             │     │                                         │
│ 2. 🔍 Validate Fiscal Code  │     │ 2. 🔍 Validate Address                  │
│    └─ ValidateFiscalData    │     │    └─ ValidateDeliveryAddressOp         │
│    └─ Check CNP (13 digits) │     │    └─ Verify city, street, zip          │
│    └─ Or CIF format         │     │    └─ Check country code                │
│                             │     │                                         │
│ 3. 💳 Calculate Tax         │     │ 3. 🚚 Select Carrier                    │
│    └─ CalculateTaxOp        │     │    └─ Based on city/zone                │
│    └─ Apply 19% VAT         │     │    └─ Available: FAN, DPD, GLS          │
│    └─ NetAmount + VatAmount │     │    └─ Calculate shipping cost           │
│                             │     │                                         │
│ 4. 🔢 Generate Invoice #    │     │ 4. 📋 Generate AWB                      │
│    └─ Format: INV-YYYY-NNNN │     │    └─ GenerateAwbOp                     │
│    └─ Sequential per year   │     │    └─ Get sequence from DB              │
│                             │     │    └─ Format: CARRIER-YYYYMMDD-SEQ      │
│ 5. 💾 Save Invoice          │     │                                         │
│    └─ Invoices table        │     │ 5. 💾 Save Shipment                     │
│    └─ InvoiceLines table    │     │    └─ Shipments table                   │
│                             │     │    └─ ShipmentLines table               │
│ 6. 📧 Send Email            │     │    └─ AwbSequences update               │
│    └─ Azure Communication   │     │                                         │
│    └─ Invoice details       │     │ 6. 📤 Publish Event                     │
│    └─ PDF attachment (TODO) │     │    └─ ShipmentCreated                   │
│                             │     │                                         │
│ 7. 📤 Publish Event         │     │ 7. 📤 Return: CreatedShipment           │
│    └─ InvoiceGenerated      │     │    └─ awbNumber, carrier, eta           │
└─────────────────────────────┘     └─────────────────────────────────────────┘
        │                                   │
        │ InvoiceGenerated Event            │ ShipmentCreated Event
        │ {orderId, invoiceNumber,          │ {orderId, awbNumber,
        │  totalAmount, downloadUrl}        │  carrier, estimatedDelivery}
        │                                   │
        └───────────────┬───────────────────┘
                        │
                        ▼
                ┌───────────────┐
                │   Customer    │
                │  Notification │ ──► Email: Invoice details
                └───────────────┘ ──► Track: AWB number
                                  ──► View: Order status in dashboard


═══════════════════════════════════════════════════════════════════════════════
                               AGGREGATE ROOTS
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Order (Sales)  │         │Invoice (Invoic.)│         │Shipment (Ship.) │
├─────────────────┤         ├─────────────────┤         ├─────────────────┤
│ • OrderId       │         │ • InvoiceId     │         │ • ShipmentId    │
│ • OrderNumber   │         │ • InvoiceNumber │         │ • AwbNumber     │
│ • CustomerId    │         │ • OrderId (FK)  │         │ • OrderId (FK)  │
│ • TotalAmount   │         │ • FiscalCode    │         │ • CarrierCode   │
│ • Currency      │         │ • NetAmount     │         │ • DeliveryAddr  │
│ • PlacedAt      │         │ • VatAmount     │         │ • ShippingCost  │
│ • OrderLines[]  │         │ • TotalAmount   │         │ • Status        │
│   - ProductCode │         │ • IssuedAt      │         │ • EstimatedETA  │
│   - Quantity    │         │ • InvoiceLines[]│         │ • ShipmentLines│
│   - UnitPrice   │         │   - ProductName │         │   - ProductCode │
│   - LineTotal   │         │   - Quantity    │         │   - Quantity    │
└─────────────────┘         │   - UnitPrice   │         │   - Weight      │
                            └─────────────────┘         └─────────────────┘


═══════════════════════════════════════════════════════════════════════════════
                                 VALUE OBJECTS
═══════════════════════════════════════════════════════════════════════════════

┌──────────────┐  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐
│ ProductCode  │  │   Quantity   │  │     Price     │  │  InvoiceNumber  │
├──────────────┤  ├──────────────┤  ├───────────────┤  ├─────────────────┤
│ • Value      │  │ • Value      │  │ • Value       │  │ • Value         │
│              │  │              │  │ • Currency    │  │                 │
│ Validations: │  │ Validations: │  │               │  │ Validations:    │
│ - Not empty  │  │ - Must be >0 │  │ Validations:  │  │ - INV-YYYY-NNNN │
│ - Max 50 ch  │  │ - Integer    │  │ - Value >= 0  │  │ - Sequential    │
└──────────────┘  └──────────────┘  └───────────────┘  └─────────────────┘

┌──────────────┐  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐
│  FiscalCode  │  │  AwbNumber   │  │DeliveryAddress│  │      Carrier    │
├──────────────┤  ├──────────────┤  ├───────────────┤  ├─────────────────┤
│ • Value      │  │ • Value      │  │ • Street      │  │ • Code          │
│ • IsCompany  │  │              │  │ • City        │  │ • Name          │
│              │  │ Validations: │  │ • ZipCode     │  │ • BasePrice     │
│ Validations: │  │ - Unique     │  │ • Country     │  │ • PricePerKg    │
│ - CNP:13 dig │  │ - Format OK  │  │               │  │                 │
│ - CIF valid  │  │              │  │ Validations:  │  │ Operations:     │
└──────────────┘  └──────────────┘  │ - Required    │  │ - CalcCost()    │
                                    │ - Valid zip   │  └─────────────────┘
                                    └───────────────┘


═══════════════════════════════════════════════════════════════════════════════
                            COMMANDS & EVENTS SUMMARY
═══════════════════════════════════════════════════════════════════════════════

COMMANDS (Input)                    EVENTS (Output)
─────────────────                   ────────────────
PlaceOrderCommand                   OrderPlaced
  └─ customerId                       └─ orderId, orderNumber, customerId,
  └─ orderLines[]                        totalAmount, orderLines[], timestamp

GenerateInvoiceCommand              InvoiceGenerated
  └─ orderId                          └─ orderId, invoiceNumber, totalAmount,
  └─ fiscalCode                          downloadUrl, timestamp
  └─ billingAddress

ShipOrderCommand                    ShipmentCreated
  └─ orderId                          └─ orderId, awbNumber, carrierCode,
  └─ deliveryAddress                     estimatedDelivery, timestamp
  └─ preferredCarrier
```

### Domain Events Details

1. **OrderPlaced** (Sales → Invoicing, Shipping)
   ```json
   {
     "orderId": "guid",
     "orderNumber": "ORD-20251210-0001",
     "customerId": "customer-web-1234567890",
     "totalAmount": 232.01,
     "currency": "RON",
     "orderLines": [
       {
         "productCode": "BOOK-001",
         "productName": "Domain-Driven Design",
         "quantity": 2,
         "unitPrice": 97.49,
         "lineTotal": 194.98
       }
     ],
     "timestamp": "2025-12-10T16:30:00Z"
   }
   ```

2. **InvoiceGenerated** (Invoicing → Sales/Customer)
   ```json
   {
     "orderId": "guid",
     "invoiceNumber": "INV-2025-0001",
     "invoiceId": "guid",
     "clientName": "Ion Popescu",
     "fiscalCode": "1234567890123",
     "netAmount": 194.97,
     "vatAmount": 37.04,
     "totalAmount": 232.01,
     "currency": "RON",
     "invoiceDownloadUrl": null,
     "timestamp": "2025-12-10T16:30:05Z"
   }
   ```

3. **ShipmentCreated** (Shipping → Sales/Customer)
   ```json
   {
     "orderId": "guid",
     "shipmentId": "guid",
     "awbNumber": "FAN-20251210-00001",
     "carrierCode": "FAN",
     "carrierName": "FAN Courier",
     "shippingCost": 15.00,
     "estimatedDeliveryDate": "2025-12-12",
     "status": "Pending",
     "timestamp": "2025-12-10T16:30:10Z"
   }
   ```

## Implementare DDD

### Value Objects (Sales Context)
- `ProductCode`: Validare format, immutabil
- `Quantity`: Validare > 0, operații aritmetice
- `Price`: Validare non-negativă, operații monetare cu currency

### Entity States (Sales Context)
- `UnvalidatedOrder`: Date primite de la client
- `ValidatedOrder`: Validare business rules trecută
- `PricedOrder`: Prețuri calculate, total compute
- `PlacedOrder`: Persistat în bază, OrderId generat

### Operations (Sales Context)
1. **ValidateOrderOperation**: Validează produse, cantități, client
2. **CheckStockOperation**: Verifică disponibilitatea în stoc
3. **CalculatePriceOperation**: Calculează prețuri și total comandă

### Workflows

#### PlaceOrderWorkflow (Sales)
```csharp
UnvalidatedOrder 
  → ValidateOrder() 
  → CheckStock() 
  → CalculatePrice() 
  → SaveOrder() 
  → PublishEvent() 
  → PlacedOrder
```

#### GenerateInvoiceWorkflow (Invoicing)
```csharp
GenerateInvoiceCommand 
  → ValidateFiscalData() 
  → CalculateTax() 
  → GenerateInvoiceNumber() 
  → SaveInvoice() 
  → SendEmail() 
  → PublishEvent() 
  → InvoiceGenerated
```

#### ShipOrderWorkflow (Shipping)
```csharp
ShipOrderCommand 
  → ValidateAddress() 
  → SelectCarrier() 
  → GenerateAwb() 
  → SaveShipment() 
  → PublishEvent() 
  → ShipmentCreated
```

## Rulare

### Prerequisites
- .NET 9.0 SDK
- Node.js 18+
- Azure SQL Database credentials
- Azure Service Bus connection string
- Azure Communication Services connection string

### Backend Setup

```bash
# Actualizați connection strings în appsettings.json din fiecare proiect API

# Sales API
cd PSSC.Sales.Api
dotnet run
# Runs on http://localhost:5122

# Invoicing API
cd PSSC.Invoicing.Api
dotnet run
# Runs on http://localhost:5109

# Shipping API
cd PSSC.Shipping.Api
dotnet run
# Runs on http://localhost:5096
```

### Frontend Setup

```bash
cd pssc-bookstore-frontend

# Install dependencies
npm install --legacy-peer-deps

# Run development server
npm run dev
# Runs on http://localhost:3000
```

### Configuration Files

**key.md** (nu se commitează, doar local):
```
Azure database sql: Server=tcp:server-pssc.database.windows.net,1433;Initial Catalog=psscdb;...
Azure service bus: Endpoint=sb://pssc-bus.servicebus.windows.net/;...
Sender email: endpoint=https://pssc-email.unitedstates.communication.azure.com/;...
```

## Funcționalități Implementate

### Customer Features
- ✅ Browse catalog cu categorii (Fiction, Non-Fiction, Science, Business, Self-Help)
- ✅ Căutare și filtrare produse
- ✅ Favorite products (wishlist)
- ✅ Shopping cart cu calcul automat total
- ✅ Checkout process complet
- ✅ Order tracking cu invoice și shipment details
- ✅ Autentificare Azure AD
- ✅ Dark/Light theme

### Business Logic
- ✅ Validare comenzi cu business rules
- ✅ Calcul automat TVA (19%)
- ✅ Shipping gratuit peste 150 RON
- ✅ Validare CNP/CIF pentru facturi
- ✅ Generare automată AWB-uri
- ✅ Email notifications pentru facturi

### Technical Features
- ✅ Event-driven architecture
- ✅ Microservices communication via Service Bus
- ✅ Entity Framework migrations
- ✅ CORS configuration
- ✅ Swagger/OpenAPI documentation
- ✅ Structured logging
- ✅ Error handling și validation

## Database Schema

### Sales DB Tables
- `Products` - Catalog de produse
- `Orders` - Comenzi clienți
- `OrderLines` - Linii de comandă

### Invoicing DB Tables
- `Invoices` - Facturi generate
- `InvoiceLines` - Linii de factură

### Shipping DB Tables
- `Shipments` - Expedieri
- `ShipmentLines` - Linii de expediere
- `AwbSequences` - Secvențe AWB per curier

## Lecții Învățate

### Ce a funcționat bine cu AI
- Generarea rapidă a structurii de proiect DDD
- Implementarea value objects cu validări
- Setup Azure Services și connection strings
- Debugging erori de autentificare și configurare
- Generarea de workflow-uri complexe cu multiple step-uri
- Implementarea pattern-urilor DDD (Aggregates, Entities, Value Objects)

### Limitări ale AI identificate
- Necesitatea validării manuale a configurărilor Azure specifice
- Debugging probleme de runtime necesită interacțiune umană
- Context pierdut între sesiuni multiple de lucru
- Nu poate crea resurse Azure - necesită acces manual la portal
- Uneori generează cod care necesită ajustări pentru versiuni specifice de package-uri

### Prompturi Utile

**Pentru structură DDD:**
```
"Creează un bounded context pentru [domeniu] folosind DDD cu value objects, 
entities, operations și workflow. Include validări și error handling."
```

**Pentru debugging:**
```
"Am eroarea [error message]. Ce configurări Azure trebuie verificate și 
cum pot fixa connection string-ul?"
```

**Pentru migrări:**
```
"Ajută-mă să aplic Entity Framework migrations pentru [context] cu 
schema [descriere tabele]"
```

**Pentru event-driven:**
```
"Implementează un event publisher/subscriber pentru [event] folosind 
Azure Service Bus cu retry logic"
```

## Design Decisions

### 1. Microservices vs Monolith
**Decizie**: Microservices cu 3 bounded contexts separate
**Rațiune**: 
- Separarea responsabilităților (Sales, Invoicing, Shipping)
- Scalabilitate independentă
- Deploy independent
- Ownership clar per domeniu

### 2. Azure Service Bus vs RabbitMQ
**Decizie**: Azure Service Bus
**Rațiune**:
- Managed service (zero maintenance)
- Native integration cu Azure ecosystem
- Built-in retry și dead-letter queues
- Enterprise-grade reliability

### 3. Event Sourcing
**Decizie**: Event-driven dar fără full event sourcing
**Rațiune**:
- Comunicare asincronă între contexts
- Nu se păstrează history complet de events
- State stocat în SQL, nu reconstituit din events
- Balance între complexitate și beneficii

### 4. Frontend Framework
**Decizie**: Next.js 15 cu React 19
**Rațiune**:
- Server-side rendering pentru SEO
- TypeScript pentru type safety
- Ecosystem bogat de componente
- Performance optimization built-in

### 5. Authentication
**Decizie**: Azure AD B2C
**Rațiune**:
- Integration cu ecosistemul Microsoft
- Social logins support
- Managed service
- Security best practices built-in

## API Endpoints

### Sales API (Port 5122)
- `GET /api/products` - List all products
- `GET /api/products?category={category}` - Filter by category
- `GET /api/categories` - Get all categories
- `POST /api/orders` - Place order
- `GET /api/customers/{customerId}/orders` - Get customer orders

### Invoicing API (Port 5109)
- `POST /api/invoices/generate` - Generate invoice
- `POST /api/invoices/validate-fiscal-code` - Validate CNP/CIF
- `GET /api/invoices/order/{orderId}` - Get invoice by order

### Shipping API (Port 5096)
- `POST /api/shipments` - Create shipment
- `GET /api/shipments/order/{orderId}` - Get shipment by order
- `GET /api/carriers` - List available carriers
- `POST /api/shipping/validate-address` - Validate delivery address
- `POST /api/shipping/calculate` - Calculate shipping cost

## Troubleshooting

### APIs nu pornesc
- Verificați connection strings în `appsettings.json`
- Verificați dacă porturile 5122, 5109, 5096 sunt libere
- Rulați `dotnet restore` în fiecare proiect

### Email-urile nu se trimit
- Verificați Azure Communication Services connection string
- Verificați sender email în Azure Portal (Email → Domains)
- Verificați logs pentru detalii eroare

### Orders nu apar în Orders page
- Verificați dacă Sales API rulează pe port 5122
- Verificați localStorage pentru `lastCustomerId`
- Verificați console browser pentru erori API

### Database errors
- Rulați migrations: aplicația le rulează automat la startup
- Verificați credențiale SQL în connection string
- Verificați firewall rules în Azure SQL

## Contribuții
Pentru contribuții, respectați:
- DDD principles și bounded context boundaries
- Consistent coding style (C# conventions)
- Validări în value objects
- Error handling în workflows
- Unit tests pentru operații critice

