package com.example.backend.dto.sku;

import com.example.backend.dto.sku.SkuStockAdjustmentDto.Type;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StockAdjustmentLogResponseDto {

    private Long id;
    private Long skuId;
    private String skuName;
    private String brandName;
    private Long facilityId;
    private String facilityName;
    private Long userId;
    private String userName;
    private Type adjustmentType;
    private Long previousUnits;
    private Long adjustedAmount;
    private Long deltaUnits;
    private Long newUnits;
    private String reason;
    private String notes;
    private LocalDateTime createdAt;
}
