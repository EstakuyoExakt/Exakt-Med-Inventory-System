package com.example.backend.service;

import com.example.backend.dto.assign.AssignRequestDto;
import com.example.backend.dto.assign.AssignResponseDto;
import com.example.backend.dto.project.ProjectResponseDto;
import com.example.backend.dto.user.UserResponseDto;
import com.example.backend.entity.Project;
import com.example.backend.entity.User;
import com.example.backend.entity.UserProjectLink;
import com.example.backend.repository.ProjectRepository;
import com.example.backend.repository.UserProjectLinkRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class AssignService {

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final UserProjectLinkRepository userProjectLinkRepository;

    public AssignService(UserRepository userRepository,
                         ProjectRepository projectRepository,
                         UserProjectLinkRepository userProjectLinkRepository) {
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.userProjectLinkRepository = userProjectLinkRepository;
    }

    // 1. ASSIGN 1 OR MORE ADMINS TO A PROJECT (SuperAdmin only)
    @Transactional
    @PreAuthorize("hasRole('SuperAdmin')")
    public String assignAdminsToProject(Long projectId, AssignRequestDto request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found with id: " + projectId));

        List<String> assignedUsernames = new ArrayList<>();

        for (Long userId : request.getUserIds()) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

            if (user.getRole() != User.Role.Admin) {
                throw new RuntimeException("User '" + user.getUsername() + "' does not have the Admin role (current role: " + user.getRole() + ")");
            }

            if (!userProjectLinkRepository.existsByUserIdAndProjectId(userId, projectId)) {
                UserProjectLink link = new UserProjectLink();
                link.setUser(user);
                link.setProject(project);
                userProjectLinkRepository.save(link);
                assignedUsernames.add(user.getUsername());
            }
        }

        if (assignedUsernames.isEmpty()) {
            return "All specified admins are already assigned to project '" + project.getName() + "'";
        }

        return "Successfully assigned admins " + assignedUsernames + " to project '" + project.getName() + "'";
    }

    // 2. UNASSIGN 1 OR MORE ADMINS FROM A PROJECT (SuperAdmin only)
    @Transactional
    @PreAuthorize("hasRole('SuperAdmin')")
    public String unassignAdminsFromProject(Long projectId, AssignRequestDto request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found with id: " + projectId));

        List<Long> unassignedUserIds = new ArrayList<>();

        for (Long userId : request.getUserIds()) {
            Optional<UserProjectLink> linkOpt = userProjectLinkRepository.findByUserIdAndProjectId(userId, projectId);
            if (linkOpt.isPresent()) {
                userProjectLinkRepository.delete(linkOpt.get());
                unassignedUserIds.add(userId);
            }
        }

        if (unassignedUserIds.isEmpty()) {
            return "None of the specified users were assigned to project '" + project.getName() + "'";
        }

        return "Successfully unassigned user IDs " + unassignedUserIds + " from project '" + project.getName() + "'";
    }

    // 3. GET ALL ASSIGNMENTS (SuperAdmin only)
    @PreAuthorize("hasRole('SuperAdmin')")
    public List<AssignResponseDto> getAllAssignments() {
        return userProjectLinkRepository.findAll()
                .stream()
                .map(this::mapToAssignResponseDto)
                .collect(Collectors.toList());
    }

    // 4. GET ONE ASSIGNMENT BY ID (SuperAdmin only)
    @PreAuthorize("hasRole('SuperAdmin')")
    public AssignResponseDto getAssignmentById(Long id) {
        UserProjectLink link = userProjectLinkRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assignment not found with id: " + id));
        return mapToAssignResponseDto(link);
    }

    /*
    // 5. GET ALL ADMINS FOR A SPECIFIC PROJECT (SuperAdmin only)
    @PreAuthorize("hasRole('SuperAdmin')")
    public List<AssignResponseDto> getAssignmentsByProject(Long projectId) {
        if (!projectRepository.existsById(projectId)) {
            throw new RuntimeException("Project not found with id: " + projectId);
        }
        return userProjectLinkRepository.findByProjectId(projectId)
                .stream()
                .map(this::mapToAssignResponseDto)
                .collect(Collectors.toList());
    }

    // 6. GET ALL PROJECTS FOR AN ADMIN USER (SuperAdmin only)
    @PreAuthorize("hasRole('SuperAdmin')")
    public List<AssignResponseDto> getAssignmentsByUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("User not found with id: " + userId);
        }
        return userProjectLinkRepository.findByUserId(userId)
                .stream()
                .map(this::mapToAssignResponseDto)
                .collect(Collectors.toList());
    }
    */

    // Helper: Map UserProjectLink to AssignResponseDto
    private AssignResponseDto mapToAssignResponseDto(UserProjectLink link) {
        User u = link.getUser();
        UserResponseDto userDto = new UserResponseDto(
                u.getId(),
                u.getName(),
                u.getUsername(),
                u.getEmail(),
                u.getPhone(),
                u.getRole(),
                u.getStatus(),
                null, // facilityId is null for admins
                u.getCreatedAt(),
                null
        );

        Project p = link.getProject();
        ProjectResponseDto projectDto = new ProjectResponseDto(
                p.getId(),
                p.getName(),
                p.getProjectCode(),
                p.getCreatedAt(),
                p.getUpdatedAt(),
                null
        );

        return new AssignResponseDto(
                link.getId(),
                userDto,
                projectDto,
                link.getAssignedAt()
        );
    }
}
