package com.example.backend.dto.bincard;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BinCardSkuSummaryDto {

    private Long id;
    private String skuCode;
    private String name;
    private String brandName;
    private String dosageForm;
    private String packagingUnit;
    private Long currentUnits;
    private Long minimumLevel;
    private Long reorderLevel;
    private Long maximumLevel;
    private String stockStatus;
}
