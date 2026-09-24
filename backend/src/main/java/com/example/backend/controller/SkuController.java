package com.example.backend.controller;

import com.example.backend.dto.sku.SkuRequestDto;
import com.example.backend.dto.sku.SkuResponseDto;
import com.example.backend.dto.sku.SkuStockAdjustmentDto;
import com.example.backend.dto.sku.StockAdjustmentLogResponseDto;
import com.example.backend.service.SkuService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/skus")
@Tag(name = "SKU & Inventory", description = "Endpoints for managing Stock Keeping Units (medicines/items), inventory levels, stock adjustments, and history logs")
public class SkuController {

    private final SkuService skuService;

    public SkuController(SkuService skuService) {
        this.skuService = skuService;
    }

    // 1. CREATE SKU
    @PostMapping
    @Operation(summary = "Create SKU", description = "Creates a new Stock Keeping Unit linked to a facility and optional library medicine template.")
    public ResponseEntity<SkuResponseDto> createSku(@Valid @RequestBody SkuRequestDto request) {
        SkuResponseDto response = skuService.createSku(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    // 2. SEARCH SKUS
    @GetMapping("/search")
    @Operation(summary = "Search SKUs", description = "Searches SKUs in a facility by medicine name, brand name, SKU code, barcode, or category.")
    public ResponseEntity<List<SkuResponseDto>> searchSkus(
            @Parameter(description = "Search keyword (medicine name, brand, SKU code, barcode)")
            @RequestParam(required = false) String search,
            @Parameter(description = "ID of the facility", required = true)
            @RequestParam Long facilityId) {
        return ResponseEntity.ok(skuService.searchSkus(search, facilityId));
    }

    // 2b. GET SKUS THAT NEED REORDERING
    @GetMapping("/reorder-needed")
    @Operation(summary = "Get SKUs Needing Reorder", description = "Returns SKUs whose current stock has dropped below minimum stock level and does not already have an active pending/approved purchase order.")
    public ResponseEntity<List<SkuResponseDto>> getReorderNeededSkus(
            @Parameter(description = "ID of the facility", required = true)
            @RequestParam Long facilityId,
            @Parameter(description = "Optional search query filter")
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(skuService.getReorderNeededSkus(facilityId, search));
    }

    // 3. GET ALL SKUS
    @GetMapping
    @Operation(summary = "Get All SKUs by Facility", description = "Retrieves all SKUs for a specific facility with optional keyword filtering.")
    public ResponseEntity<List<SkuResponseDto>> getAllSkus(
            @Parameter(description = "ID of the facility", required = true)
            @RequestParam Long facilityId,
            @Parameter(description = "Optional search keyword")
            @RequestParam(required = false) String search) {
        if (search != null && !search.trim().isEmpty()) {
            return ResponseEntity.ok(skuService.searchSkus(search, facilityId));
        }
        return ResponseEntity.ok(skuService.getAllSkus(facilityId));
    }

    // 4. GET SKU BY ID
    @GetMapping("/{id:[0-9]+}")
    @Operation(summary = "Get SKU by ID", description = "Retrieves complete details of a specific SKU by its ID.")
    public ResponseEntity<SkuResponseDto> getSkuById(
            @Parameter(description = "SKU ID", required = true)
            @PathVariable Long id) {
        return ResponseEntity.ok(skuService.getSkuById(id));
    }

    // 5. UPDATE SKU
    @PutMapping("/{id:[0-9]+}")
    @Operation(summary = "Update SKU", description = "Updates SKU details, dosage, form, min/max thresholds, unit price, and reorder points.")
    public ResponseEntity<SkuResponseDto> updateSku(
            @Parameter(description = "SKU ID", required = true)
            @PathVariable Long id,
            @Valid @RequestBody SkuRequestDto request) {
        return ResponseEntity.ok(skuService.updateSku(id, request));
    }

    // 6. DELETE SKU
    @DeleteMapping("/{id:[0-9]+}")
    @Operation(summary = "Delete SKU", description = "Deletes an SKU from the facility if no active dependent records prevent deletion.")
    public ResponseEntity<String> deleteSku(
            @Parameter(description = "SKU ID", required = true)
            @PathVariable Long id) {
        skuService.deleteSku(id);
        return ResponseEntity.ok("SKU deleted successfully");
    }

    // 7. ADJUST SKU STOCK
    @PatchMapping("/{id:[0-9]+}/adjust-stock")
    @Operation(summary = "Adjust SKU Stock Quantity", description = "Adjusts stock quantity up or down for a specific SKU (audit reasons: Physical Count, Damage, Discrepancy, etc.) and logs the audit event.")
    public ResponseEntity<SkuResponseDto> adjustStock(
            @Parameter(description = "SKU ID", required = true)
            @PathVariable Long id,
            @Valid @RequestBody SkuStockAdjustmentDto request) {
        return ResponseEntity.ok(skuService.adjustStock(id, request));
    }

    // 8. GET ADJUSTMENT LOGS FOR A SKU
    @GetMapping("/{id:[0-9]+}/adjustments")
    @Operation(summary = "Get Stock Adjustment Logs by SKU", description = "Retrieves all historical stock adjustment records for a single SKU.")
    public ResponseEntity<List<StockAdjustmentLogResponseDto>> getAdjustmentLogsBySku(
            @Parameter(description = "SKU ID", required = true)
            @PathVariable Long id) {
        return ResponseEntity.ok(skuService.getAdjustmentLogsBySku(id));
    }

    // 9. GET ADJUSTMENT LOGS FOR A FACILITY
    @GetMapping("/adjustments")
    @Operation(summary = "Get Stock Adjustment Logs by Facility", description = "Retrieves all historical stock adjustment records across an entire facility.")
    public ResponseEntity<List<StockAdjustmentLogResponseDto>> getAdjustmentLogsByFacility(
            @Parameter(description = "Facility ID", required = true)
            @RequestParam Long facilityId) {
        return ResponseEntity.ok(skuService.getAdjustmentLogsByFacility(facilityId));
    }
}
