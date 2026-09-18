package com.example.backend.dto.order;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemRequestDto {

    @NotNull(message = "SKU ID is required")
    private Long skuId;

    @NotNull(message = "Ordered units is required")
    @Positive(message = "Ordered units must be greater than 0")
    private Long orderedUnits;
}
