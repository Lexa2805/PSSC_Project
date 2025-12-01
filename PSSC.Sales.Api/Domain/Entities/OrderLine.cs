using PSSC.Sales.Api.Domain.ValueObjects;

namespace PSSC.Sales.Api.Domain.Entities;

public record UnvalidatedOrderLine(
    string ProductCode,
    int Quantity
);

public record ValidatedOrderLine(
    ProductCode ProductCode,
    Quantity Quantity
);

public record CalculatedOrderLine(
    ProductCode ProductCode,
    Quantity Quantity,
    Price UnitPrice,
    Price LineTotal
);
