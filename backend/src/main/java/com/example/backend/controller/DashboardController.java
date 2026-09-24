package com.example.backend.controller;

import com.example.backend.dto.dashboard.DashboardResponseDto;
import com.example.backend.dto.dashboard.PharmacistDashboardResponseDto;
import com.example.backend.dto.dashboard.ProcurementDashboardResponseDto;
import com.example.backend.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    // 1. GET PHARMACIST DASHBOARD METRICS & REAL-TIME DATA
    @GetMapping("/pharmacist")
    public ResponseEntity<PharmacistDashboardResponseDto> getPharmacistDashboard(
            @RequestParam(required = false) Long facilityId) {
        PharmacistDashboardResponseDto response = dashboardService.getPharmacistDashboard(facilityId);
        return ResponseEntity.ok(response);
    }

    // 2. GET PROCUREMENT OFFICER DASHBOARD METRICS & REAL-TIME DATA
    @GetMapping("/procurement")
    public ResponseEntity<ProcurementDashboardResponseDto> getProcurementDashboard(
            @RequestParam(required = false) Long facilityId) {
        ProcurementDashboardResponseDto response = dashboardService.getProcurementDashboard(facilityId);
        return ResponseEntity.ok(response);
    }

    // 3. GET FULL SYSTEM / COMBINED DASHBOARD SUMMARY
    @GetMapping("/summary")
    public ResponseEntity<DashboardResponseDto> getDashboardSummary(
            @RequestParam(required = false) Long facilityId) {
        DashboardResponseDto response = dashboardService.getDashboardSummary(facilityId);
        return ResponseEntity.ok(response);
    }
}
