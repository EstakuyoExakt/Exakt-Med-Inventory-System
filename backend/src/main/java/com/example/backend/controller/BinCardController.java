package com.example.backend.controller;

import com.example.backend.dto.bincard.BinCardResponseDto;
import com.example.backend.dto.bincard.BinCardSkuSummaryDto;
import com.example.backend.service.BinCardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/bincard")
@PreAuthorize("hasAnyRole('SuperAdmin', 'Admin')")
@Tag(name = "Bin Card & Stock Ledger", description = "Endpoints for Admin and SuperAdmin users to inspect and audit physical-style SKU Bin Cards and transaction ledgers")
public class BinCardController {

    private final BinCardService binCardService;

    public BinCardController(BinCardService binCardService) {
        this.binCardService = binCardService;
    }

    // 1. GET BIN CARD FOR SPECIFIC SKU
    @GetMapping("/sku/{skuId}")
    @Operation(summary = "Get SKU Bin Card", description = "Retrieves the complete Bin Card (metadata, thresholds, and chronological running-balance transaction ledger) for a specific SKU in a facility. Restricted to Admin and SuperAdmin.")
    public ResponseEntity<BinCardResponseDto> getSkuBinCard(
            @Parameter(description = "SKU ID", required = true)
            @PathVariable Long skuId,
            @Parameter(description = "Facility ID", required = true)
            @RequestParam Long facilityId,
            @Parameter(description = "Optional filter start date (YYYY-MM-DD)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "Optional filter end date (YYYY-MM-DD)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(binCardService.getBinCard(facilityId, skuId, startDate, endDate));
    }

    // 2. GET FACILITY SKUS FOR BIN CARD SELECTOR
    @GetMapping("/facility/{facilityId}/skus")
    @Operation(summary = "Get Facility SKUs for Bin Card", description = "Lists all SKUs for a facility with current stock and threshold statuses for quick Bin Card lookup and autocomplete.")
    public ResponseEntity<List<BinCardSkuSummaryDto>> getFacilitySkusForBinCard(
            @Parameter(description = "Facility ID", required = true)
            @PathVariable Long facilityId) {
        return ResponseEntity.ok(binCardService.getSkusForBinCard(facilityId));
    }
}
