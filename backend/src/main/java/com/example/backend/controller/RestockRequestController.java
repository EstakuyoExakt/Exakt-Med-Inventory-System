package com.example.backend.controller;

import com.example.backend.dto.restockRequest.RestockRequestDto;
import com.example.backend.dto.restockRequest.RestockResponseDto;
import com.example.backend.service.RestockRequestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/restock-requests")
public class RestockRequestController {

    private final RestockRequestService restockRequestService;

    public RestockRequestController(RestockRequestService restockRequestService) {
        this.restockRequestService = restockRequestService;
    }

    // 1. CREATE RESTOCK REQUEST (Pharmacist / Admin)
    @PostMapping
    public ResponseEntity<RestockResponseDto> createRestockRequest(@Valid @RequestBody RestockRequestDto request) {
        RestockResponseDto response = restockRequestService.createRestockRequest(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    // 2. GET ALL RESTOCK REQUESTS (optional facilityId, pendingOnly filter)
    @GetMapping
    public ResponseEntity<List<RestockResponseDto>> getAllRestockRequests(
            @RequestParam(required = false) Long facilityId,
            @RequestParam(required = false, defaultValue = "false") Boolean pendingOnly) {
        return ResponseEntity.ok(restockRequestService.getAllRestockRequests(facilityId, pendingOnly));
    }

    // 3. GET RESTOCK REQUEST BY ID
    @GetMapping("/{id}")
    public ResponseEntity<RestockResponseDto> getRestockRequestById(@PathVariable Long id) {
        return ResponseEntity.ok(restockRequestService.getRestockRequestById(id));
    }
}
