package com.example.backend.controller;

import com.example.backend.dto.project.ProjectRequestDto;
import com.example.backend.dto.project.ProjectResponseDto;
import com.example.backend.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    // 1. CREATE PROJECT
    @PostMapping
    public ResponseEntity<ProjectResponseDto> createProject(@Valid @RequestBody ProjectRequestDto request) {
        ProjectResponseDto response = projectService.createProject(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    // 2. GET ALL PROJECTS
    @GetMapping
    public ResponseEntity<List<ProjectResponseDto>> getAllProjects() {
        return ResponseEntity.ok(projectService.getAllProjects());
    }

    // 3. GET PROJECT BY ID
    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponseDto> getProjectById(@PathVariable Long id) {
        return ResponseEntity.ok(projectService.getProjectById(id));
    }

    // 4. UPDATE PROJECT
    @PutMapping("/{id}")
    public ResponseEntity<ProjectResponseDto> updateProject(
            @PathVariable Long id,
            @Valid @RequestBody ProjectRequestDto request) {
        return ResponseEntity.ok(projectService.updateProject(id, request));
    }

    // 5. DELETE PROJECT
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteProject(@PathVariable Long id) {
        projectService.deleteProject(id);
        return ResponseEntity.ok("Project deleted successfully");
    }
}
