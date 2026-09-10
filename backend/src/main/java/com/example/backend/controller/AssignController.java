package com.example.backend.controller;

import com.example.backend.dto.assign.AssignRequestDto;
import com.example.backend.dto.assign.AssignResponseDto;
import com.example.backend.service.AssignService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/assign/projects")
public class AssignController {

    private final AssignService assignService;

    public AssignController(AssignService assignService) {
        this.assignService = assignService;
    }

    // 1. ASSIGN 1 OR MORE ADMINS TO A PROJECT (SuperAdmin only)
    @PostMapping("/{projectId}")
    public ResponseEntity<String> assignAdminsToProject(
            @PathVariable Long projectId,
            @Valid @RequestBody AssignRequestDto request) {
        String result = assignService.assignAdminsToProject(projectId, request);
        return ResponseEntity.ok(result);
    }

    // 2. UNASSIGN 1 OR MORE ADMINS FROM A PROJECT (SuperAdmin only)
    @DeleteMapping("/{projectId}")
    public ResponseEntity<String> unassignAdminsFromProject(
            @PathVariable Long projectId,
            @Valid @RequestBody AssignRequestDto request) {
        String result = assignService.unassignAdminsFromProject(projectId, request);
        return ResponseEntity.ok(result);
    }

    // 3. GET ALL ASSIGNMENTS (SuperAdmin only)
    @GetMapping
    public ResponseEntity<List<AssignResponseDto>> getAllAssignments() {
        return ResponseEntity.ok(assignService.getAllAssignments());
    }

    // 4. GET ONE ASSIGNMENT BY ID (SuperAdmin only)
    @GetMapping("/{id}")
    public ResponseEntity<AssignResponseDto> getAssignmentById(@PathVariable Long id) {
        return ResponseEntity.ok(assignService.getAssignmentById(id));
    }

    /*
    // 5. GET ALL ADMINS FOR A SPECIFIC PROJECT (SuperAdmin only)
    @GetMapping("/{projectId}")
    public ResponseEntity<List<AssignResponseDto>> getAssignmentsByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(assignService.getAssignmentsByProject(projectId));
    }

    // 6. GET ALL PROJECTS FOR A SPECIFIC ADMIN USER (SuperAdmin only)
    @GetMapping("/users/{userId}")
    public ResponseEntity<List<AssignResponseDto>> getAssignmentsByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(assignService.getAssignmentsByUser(userId));
    }
    */
}
