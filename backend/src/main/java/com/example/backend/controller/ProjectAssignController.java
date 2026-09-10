package com.example.backend.controller;

import com.example.backend.dto.assign.ProjectAssignRequestDto;
import com.example.backend.dto.assign.ProjectAssignResponseDto;
import com.example.backend.service.ProjectAssignService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/assign/projects")
public class ProjectAssignController {

    private final ProjectAssignService projectAssignService;

    public ProjectAssignController(ProjectAssignService projectAssignService) {
        this.projectAssignService = projectAssignService;
    }

    // 1. ASSIGN 1 OR MORE ADMINS TO A PROJECT (SuperAdmin only)
    @PostMapping("/{projectId}")
    public ResponseEntity<String> assignAdminsToProject(
            @PathVariable Long projectId,
            @Valid @RequestBody ProjectAssignRequestDto request) {
        String result = projectAssignService.assignAdminsToProject(projectId, request);
        return ResponseEntity.ok(result);
    }

    // 2. UNASSIGN 1 OR MORE ADMINS FROM A PROJECT (SuperAdmin only)
    @DeleteMapping("/{projectId}")
    public ResponseEntity<String> unassignAdminsFromProject(
            @PathVariable Long projectId,
            @Valid @RequestBody ProjectAssignRequestDto request) {
        String result = projectAssignService.unassignAdminsFromProject(projectId, request);
        return ResponseEntity.ok(result);
    }

    // 3. GET ALL ASSIGNMENTS (SuperAdmin only)
    @GetMapping
    public ResponseEntity<List<ProjectAssignResponseDto>> getAllAssignments() {
        return ResponseEntity.ok(projectAssignService.getAllAssignments());
    }

    // 4. GET ONE ASSIGNMENT BY ID (SuperAdmin only)
    @GetMapping("/{id}")
    public ResponseEntity<ProjectAssignResponseDto> getAssignmentById(@PathVariable Long id) {
        return ResponseEntity.ok(projectAssignService.getAssignmentById(id));
    }

    /*
    // 5. GET ALL ADMINS FOR A SPECIFIC PROJECT (SuperAdmin only)
    @GetMapping("/{projectId}")
    public ResponseEntity<List<ProjectAssignResponseDto>> getAssignmentsByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(assignService.getAssignmentsByProject(projectId));
    }

    // 6. GET ALL PROJECTS FOR A SPECIFIC ADMIN USER (SuperAdmin only)
    @GetMapping("/users/{userId}")
    public ResponseEntity<List<ProjectAssignResponseDto>> getAssignmentsByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(assignService.getAssignmentsByUser(userId));
    }
    */
}
