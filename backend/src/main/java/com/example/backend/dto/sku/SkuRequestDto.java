package com.example.backend.dto.sku;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SkuRequestDto {

    @NotNull(message = "Facility ID is required")
    private Long facilityId;

    @NotNull(message = "Medicine ID is required")
    private Long medicineId;

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Brand name is required")
    private String brandName;

    @NotBlank(message = "Dosage form is required")
    private String dosageForm;

    @NotBlank(message = "Packaging unit is required")
    private String packagingUnit;

    private Long units;

    @NotNull(message = "Minimum level is required")
    private Long minimumLevel;

    @NotNull(message = "Reorder level is required")
    private Long reorderLevel;

    @NotNull(message = "Maximum level is required")
    private Long maximumLevel;
}
