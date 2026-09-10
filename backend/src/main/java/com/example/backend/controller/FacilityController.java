package com.example.backend.controller;

import com.example.backend.dto.facility.FacilityRequestDto;
import com.example.backend.dto.facility.FacilityResponseDto;
import com.example.backend.service.FacilityService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/facilities")
public class FacilityController {

    private final FacilityService facilityService;

    public FacilityController(FacilityService facilityService) {
        this.facilityService = facilityService;
    }

    // 1. CREATE FACILITY
    @PostMapping
    public ResponseEntity<FacilityResponseDto> createFacility(@Valid @RequestBody FacilityRequestDto request) {
        FacilityResponseDto response = facilityService.createFacility(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    // 2. GET ALL FACILITIES
    @GetMapping
    public ResponseEntity<List<FacilityResponseDto>> getAllFacilities() {
        return ResponseEntity.ok(facilityService.getAllFacilities());
    }

    // 3. GET FACILITY BY ID
    @GetMapping("/{id}")
    public ResponseEntity<FacilityResponseDto> getFacilityById(@PathVariable Long id) {
        return ResponseEntity.ok(facilityService.getFacilityById(id));
    }

    // 4. UPDATE FACILITY
    @PutMapping("/{id}")
    public ResponseEntity<FacilityResponseDto> updateFacility(
            @PathVariable Long id,
            @Valid @RequestBody FacilityRequestDto request) {
        return ResponseEntity.ok(facilityService.updateFacility(id, request));
    }

    // 5. DELETE FACILITY
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteFacility(@PathVariable Long id) {
        facilityService.deleteFacility(id);
        return ResponseEntity.ok("Facility deleted successfully");
    }
}
