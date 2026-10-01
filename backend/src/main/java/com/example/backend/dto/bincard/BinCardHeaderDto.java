package com.example.backend.dto.bincard;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BinCardHeaderDto {

    private Long skuId;
    private String skuCode;
    private String name;
    private String brandName;
    private String genericName;
    private String dosageForm;
    private String packagingUnit;
    private Long facilityId;
    private String facilityName;

    // Stock levels & thresholds
    private Long currentUnits;
    private Long minimumLevel;
    private Long reorderLevel;
    private Long maximumLevel;
    private String stockStatus; // NORMAL, LOW_STOCK, CRITICAL, OVERSTOCK, OUT_OF_STOCK

    // Summary metrics
    private Long totalReceived;
    private Long totalDeducted;
    private Long totalAdjusted;
    private Long totalExpired;
    private Integer totalTransactions;
}
