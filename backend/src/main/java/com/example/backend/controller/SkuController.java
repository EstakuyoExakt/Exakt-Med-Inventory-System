package com.example.backend.controller;

import com.example.backend.dto.sku.SkuRequestDto;
import com.example.backend.dto.sku.SkuResponseDto;
import com.example.backend.dto.sku.SkuStockAdjustmentDto;
import com.example.backend.dto.sku.StockAdjustmentLogResponseDto;
import com.example.backend.service.SkuService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/skus")
public class SkuController {

    private final SkuService skuService;

    public SkuController(SkuService skuService) {
        this.skuService = skuService;
    }

    // 1. CREATE SKU
    @PostMapping
    public ResponseEntity<SkuResponseDto> createSku(@Valid @RequestBody SkuRequestDto request) {
        SkuResponseDto response = skuService.createSku(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    // 2. SEARCH SKUS (Explicit endpoint: /api/skus/search?search=...&facilityId=...)
    @GetMapping("/search")
    public ResponseEntity<List<SkuResponseDto>> searchSkus(
            @RequestParam(required = false) String search,
            @RequestParam Long facilityId) {
        return ResponseEntity.ok(skuService.searchSkus(search, facilityId));
    }

    // 2b. GET SKUS THAT NEED REORDERING (Excluding active Pending/Approved orders)
    @GetMapping("/reorder-needed")
    public ResponseEntity<List<SkuResponseDto>> getReorderNeededSkus(
            @RequestParam Long facilityId,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(skuService.getReorderNeededSkus(facilityId, search));
    }

    // 3. GET ALL SKUS (Strictly required facilityId, optionally filtered by search term)
    @GetMapping
    public ResponseEntity<List<SkuResponseDto>> getAllSkus(
            @RequestParam Long facilityId,
            @RequestParam(required = false) String search) {
        if (search != null && !search.trim().isEmpty()) {
            return ResponseEntity.ok(skuService.searchSkus(search, facilityId));
        }
        return ResponseEntity.ok(skuService.getAllSkus(facilityId));
    }

    // 4. GET SKU BY ID (Constrained to digits only to prevent collision with /search)
    @GetMapping("/{id:[0-9]+}")
    public ResponseEntity<SkuResponseDto> getSkuById(@PathVariable Long id) {
        return ResponseEntity.ok(skuService.getSkuById(id));
    }

    // 5. UPDATE SKU
    @PutMapping("/{id:[0-9]+}")
    public ResponseEntity<SkuResponseDto> updateSku(
            @PathVariable Long id,
            @Valid @RequestBody SkuRequestDto request) {
        return ResponseEntity.ok(skuService.updateSku(id, request));
    }

    // 6. DELETE SKU
    @DeleteMapping("/{id:[0-9]+}")
    public ResponseEntity<String> deleteSku(@PathVariable Long id) {
        skuService.deleteSku(id);
        return ResponseEntity.ok("SKU deleted successfully");
    }

    // 7. ADJUST SKU STOCK
    @PatchMapping("/{id:[0-9]+}/adjust-stock")
    public ResponseEntity<SkuResponseDto> adjustStock(
            @PathVariable Long id,
            @Valid @RequestBody SkuStockAdjustmentDto request) {
        return ResponseEntity.ok(skuService.adjustStock(id, request));
    }

    // 8. GET ADJUSTMENT LOGS FOR A SKU
    @GetMapping("/{id:[0-9]+}/adjustments")
    public ResponseEntity<List<StockAdjustmentLogResponseDto>> getAdjustmentLogsBySku(@PathVariable Long id) {
        return ResponseEntity.ok(skuService.getAdjustmentLogsBySku(id));
    }

    // 9. GET ADJUSTMENT LOGS FOR A FACILITY
    @GetMapping("/adjustments")
    public ResponseEntity<List<StockAdjustmentLogResponseDto>> getAdjustmentLogsByFacility(@RequestParam Long facilityId) {
        return ResponseEntity.ok(skuService.getAdjustmentLogsByFacility(facilityId));
    }
}
