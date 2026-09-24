package com.example.backend.controller;

import com.example.backend.dto.batch.BatchRequestDto;
import com.example.backend.dto.batch.BatchResponseDto;
import com.example.backend.entity.Batch;
import com.example.backend.service.BatchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/batches")
@Tag(name = "Batches & Expiry", description = "Endpoints for receiving batches, batch tracking, quarantine/release actions, and expiry processing")
public class BatchController {

    private final BatchService batchService;

    public BatchController(BatchService batchService) {
        this.batchService = batchService;
    }

    // 1. RECEIVE SINGLE BATCH
    @PostMapping
    @Operation(summary = "Receive Single Batch", description = "Records a newly received batch into inventory and automatically increments the associated SKU stock.")
    public ResponseEntity<BatchResponseDto> receiveBatch(@Valid @RequestBody BatchRequestDto request) {
        BatchResponseDto response = batchService.receiveBatch(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    // 2. RECEIVE MULTIPLE BATCHES BULK
    @PostMapping("/bulk")
    @Operation(summary = "Receive Batches in Bulk", description = "Receives multiple batches in a single transaction (e.g. when receiving multi-item purchase orders).")
    public ResponseEntity<List<BatchResponseDto>> receiveBatchesBulk(@RequestBody List<BatchRequestDto> requests) {
        List<BatchResponseDto> response = batchService.receiveBatchesBulk(requests);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    // 3. GET ALL BATCHES BY FACILITY
    @GetMapping
    @Operation(summary = "Get Batches by Facility", description = "Retrieves all batches for a given facility with optional status filtering (AVAILABLE, QUARANTINED, EXPIRED, DEPLETED).")
    public ResponseEntity<List<BatchResponseDto>> getBatchesByFacility(
            @Parameter(description = "Facility ID", required = true)
            @RequestParam Long facilityId,
            @Parameter(description = "Optional batch status filter")
            @RequestParam(required = false) Batch.Status status) {
        return ResponseEntity.ok(batchService.getBatchesByFacility(facilityId, status));
    }

    // 4. GET BATCH BY ID
    @GetMapping("/{id}")
    @Operation(summary = "Get Batch by ID", description = "Retrieves details of a specific batch by its ID.")
    public ResponseEntity<BatchResponseDto> getBatchById(
            @Parameter(description = "Batch ID", required = true)
            @PathVariable Long id) {
        return ResponseEntity.ok(batchService.getBatchById(id));
    }

    // 5. UPDATE BATCH STATUS
    @PatchMapping("/{id}/status")
    @Operation(summary = "Update Batch Status", description = "Changes a batch's status (AVAILABLE, QUARANTINED, DEPLETED, EXPIRED) and appends notes.")
    public ResponseEntity<BatchResponseDto> updateBatchStatus(
            @Parameter(description = "Batch ID", required = true)
            @PathVariable Long id,
            @Parameter(description = "Target status", required = true)
            @RequestParam Batch.Status status,
            @Parameter(description = "Optional notes or reason for status change")
            @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(batchService.updateBatchStatus(id, status, notes));
    }

    // 6. PROCESS EXPIRED BATCHES
    @PostMapping("/process-expired")
    @Operation(summary = "Process Expired Batches", description = "Scans all batches past their expiry date, marks them EXPIRED, decrements active SKU stock, and logs audit events.")
    public ResponseEntity<String> processExpiredBatches() {
        int count = batchService.processExpiredBatches();
        return ResponseEntity.ok("Processed " + count + " expired batches.");
    }
}
