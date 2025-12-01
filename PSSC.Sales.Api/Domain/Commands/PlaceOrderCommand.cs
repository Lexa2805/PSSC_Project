namespace PSSC.Sales.Api.Domain.Commands;

public record PlaceOrderCommand(
    string CustomerId,
    IReadOnlyList<OrderLineDto> Lines
);

public record OrderLineDto(
    string ProductCode,
    int Quantity
);
