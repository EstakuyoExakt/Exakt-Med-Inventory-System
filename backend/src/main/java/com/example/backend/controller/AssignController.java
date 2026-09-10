package com.example.backend.controller;

import com.example.backend.dto.assign.AssignAdminsRequestDto;
import com.example.backend.service.AssignService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/assign")
public class AssignController {

    private final AssignService assignService;

    public AssignController(AssignService assignService) {
        this.assignService = assignService;
    }

    // 1. ASSIGN 1 OR MORE ADMINS TO A PROJECT (SuperAdmin only)
    @PostMapping("/projects/{projectId}")
    public ResponseEntity<String> assignAdminsToProject(
            @PathVariable Long projectId,
            @Valid @RequestBody AssignAdminsRequestDto request) {
        String result = assignService.assignAdminsToProject(projectId, request);
        return ResponseEntity.ok(result);
    }

    // 2. UNASSIGN 1 OR MORE ADMINS FROM A PROJECT (SuperAdmin only)
    @DeleteMapping("/projects/{projectId}")
    public ResponseEntity<String> unassignAdminsFromProject(
            @PathVariable Long projectId,
            @Valid @RequestBody AssignAdminsRequestDto request) {
        String result = assignService.unassignAdminsFromProject(projectId, request);
        return ResponseEntity.ok(result);
    }
}
