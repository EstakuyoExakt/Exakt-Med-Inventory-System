package com.example.backend.controller;

import com.example.backend.dto.batch.BatchRequestDto;
import com.example.backend.dto.batch.BatchResponseDto;
import com.example.backend.entity.Batch;
import com.example.backend.service.BatchService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/batches")
public class BatchController {

    private final BatchService batchService;

    public BatchController(BatchService batchService) {
        this.batchService = batchService;
    }

    // 1. RECEIVE SINGLE BATCH
    @PostMapping
    public ResponseEntity<BatchResponseDto> receiveBatch(@Valid @RequestBody BatchRequestDto request) {
        BatchResponseDto response = batchService.receiveBatch(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    // 2. RECEIVE MULTIPLE BATCHES BULK (From Multi-Item Purchase Order)
    @PostMapping("/bulk")
    public ResponseEntity<List<BatchResponseDto>> receiveBatchesBulk(@RequestBody List<BatchRequestDto> requests) {
        List<BatchResponseDto> response = batchService.receiveBatchesBulk(requests);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    // 3. GET ALL BATCHES BY FACILITY (with optional status filter)
    @GetMapping
    public ResponseEntity<List<BatchResponseDto>> getBatchesByFacility(
            @RequestParam Long facilityId,
            @RequestParam(required = false) Batch.Status status) {
        return ResponseEntity.ok(batchService.getBatchesByFacility(facilityId, status));
    }

    // 4. GET BATCH BY ID
    @GetMapping("/{id}")
    public ResponseEntity<BatchResponseDto> getBatchById(@PathVariable Long id) {
        return ResponseEntity.ok(batchService.getBatchById(id));
    }

    // 5. UPDATE BATCH STATUS (Quarantine / Release / Expiry)
    @PatchMapping("/{id}/status")
    public ResponseEntity<BatchResponseDto> updateBatchStatus(
            @PathVariable Long id,
            @RequestParam Batch.Status status,
            @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(batchService.updateBatchStatus(id, status, notes));
    }

    // 6. PROCESS EXPIRED BATCHES (Manual / On-Demand Trigger)
    @PostMapping("/process-expired")
    public ResponseEntity<String> processExpiredBatches() {
        int count = batchService.processExpiredBatches();
        return ResponseEntity.ok("Processed " + count + " expired batches.");
    }
}
