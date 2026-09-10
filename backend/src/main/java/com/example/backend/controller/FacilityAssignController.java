package com.example.backend.controller;

import com.example.backend.dto.assign.FacilityAssignRequestDto;
import com.example.backend.dto.assign.FacilityAssignResponseDto;
import com.example.backend.service.FacilityAssignService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/assign/facilities")
public class FacilityAssignController {

    private final FacilityAssignService facilityAssignService;

    public FacilityAssignController(FacilityAssignService facilityAssignService) {
        this.facilityAssignService = facilityAssignService;
    }

    // 1. ASSIGN 1 OR MORE USERS (PHARMACIST / PROCUREMENT) TO A FACILITY
    @PostMapping("/{facilityId}")
    public ResponseEntity<String> assignUsersToFacility(
            @PathVariable Long facilityId,
            @Valid @RequestBody FacilityAssignRequestDto request) {
        String result = facilityAssignService.assignUsersToFacility(facilityId, request);
        return ResponseEntity.ok(result);
    }

    // 2. UNASSIGN 1 OR MORE USERS FROM A FACILITY
    @DeleteMapping("/{facilityId}")
    public ResponseEntity<String> unassignUsersFromFacility(
            @PathVariable Long facilityId,
            @Valid @RequestBody FacilityAssignRequestDto request) {
        String result = facilityAssignService.unassignUsersFromFacility(facilityId, request);
        return ResponseEntity.ok(result);
    }

    // 3. GET ALL FACILITY ASSIGNMENTS
    @GetMapping
    public ResponseEntity<List<FacilityAssignResponseDto>> getAllAssignments() {
        return ResponseEntity.ok(facilityAssignService.getAllAssignments());
    }

    // 4. GET ONE FACILITY ASSIGNMENT BY ID
    @GetMapping("/{id}")
    public ResponseEntity<FacilityAssignResponseDto> getAssignmentById(@PathVariable Long id) {
        return ResponseEntity.ok(facilityAssignService.getAssignmentById(id));
    }
}
