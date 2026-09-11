package com.example.backend.service;

import com.example.backend.dto.assign.FacilityAssignRequestDto;
import com.example.backend.dto.assign.FacilityAssignResponseDto;
import com.example.backend.dto.facility.FacilityResponseDto;
import com.example.backend.dto.user.UserResponseDto;
import com.example.backend.entity.Facility;
import com.example.backend.entity.User;
import com.example.backend.entity.UserFacilityLink;
import com.example.backend.repository.FacilityRepository;
import com.example.backend.repository.UserFacilityLinkRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class FacilityAssignService {

    private final UserRepository userRepository;
    private final FacilityRepository facilityRepository;
    private final UserFacilityLinkRepository userFacilityLinkRepository;

    public FacilityAssignService(UserRepository userRepository,
                                 FacilityRepository facilityRepository,
                                 UserFacilityLinkRepository userFacilityLinkRepository) {
        this.userRepository = userRepository;
        this.facilityRepository = facilityRepository;
        this.userFacilityLinkRepository = userFacilityLinkRepository;
    }

    // 1. ASSIGN 1 OR MORE USERS (ADMIN / PHARMACIST / PROCUREMENT) TO A FACILITY
    @Transactional
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin')")
    public String assignUsersToFacility(Long facilityId, FacilityAssignRequestDto request) {
        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new RuntimeException("Facility not found with id: " + facilityId));

        User currentUser = getCurrentUser();
        List<String> assignedUsernames = new ArrayList<>();

        for (Long userId : request.getUserIds()) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

            // Enforce: Admin, Pharmacist, and Procurement can be assigned to facilities
            boolean isAllowedRole = user.getRole() == User.Role.Admin
                    || user.getRole() == User.Role.Pharmacist
                    || user.getRole() == User.Role.Procurement;

            if (!isAllowedRole) {
                throw new RuntimeException("User '" + user.getUsername() + "' with role " + user.getRole() +
                        " cannot be assigned to a facility. Only Admin, Pharmacist, and Procurement roles are allowed.");
            }

            // Role hierarchy: An Admin cannot assign fellow Admin accounts
            if (currentUser.getRole() == User.Role.Admin && user.getRole() == User.Role.Admin) {
                throw new AccessDeniedException("Admins cannot assign fellow Admin accounts to facilities. Only SuperAdmin can manage Admin assignments.");
            }

            if (!userFacilityLinkRepository.existsByUserIdAndFacilityId(userId, facilityId)) {
                UserFacilityLink link = new UserFacilityLink();
                link.setUser(user);
                link.setFacility(facility);
                userFacilityLinkRepository.save(link);
                assignedUsernames.add(user.getUsername());
            }
        }

        if (assignedUsernames.isEmpty()) {
            return "All specified users are already assigned to facility '" + facility.getName() + "'";
        }

        return "Successfully assigned users " + assignedUsernames + " to facility '" + facility.getName() + "'";
    }

    // 2. UNASSIGN 1 OR MORE USERS FROM A FACILITY
    @Transactional
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin')")
    public String unassignUsersFromFacility(Long facilityId, FacilityAssignRequestDto request) {
        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new RuntimeException("Facility not found with id: " + facilityId));

        User currentUser = getCurrentUser();
        List<Long> unassignedUserIds = new ArrayList<>();

        for (Long userId : request.getUserIds()) {
            Optional<UserFacilityLink> linkOpt = userFacilityLinkRepository.findByUserIdAndFacilityId(userId, facilityId);
            if (linkOpt.isPresent()) {
                User targetUser = linkOpt.get().getUser();

                // Role hierarchy: An Admin cannot unassign fellow Admin accounts
                if (currentUser.getRole() == User.Role.Admin && targetUser.getRole() == User.Role.Admin) {
                    throw new AccessDeniedException("Admins cannot unassign fellow Admin accounts from facilities. Only SuperAdmin can manage Admin assignments.");
                }

                userFacilityLinkRepository.delete(linkOpt.get());
                unassignedUserIds.add(userId);
            }
        }

        if (unassignedUserIds.isEmpty()) {
            return "None of the specified users were assigned to facility '" + facility.getName() + "'";
        }

        return "Successfully unassigned user IDs " + unassignedUserIds + " from facility '" + facility.getName() + "'";
    }

    // 3. GET ALL FACILITY ASSIGNMENTS (SuperAdmin and Admin)
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin')")
    public List<FacilityAssignResponseDto> getAllAssignments() {
        return userFacilityLinkRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    // 4. GET ONE FACILITY ASSIGNMENT BY ID (SuperAdmin and Admin)
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin')")
    public FacilityAssignResponseDto getAssignmentById(Long id) {
        UserFacilityLink link = userFacilityLinkRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assignment not found with id: " + id));
        return mapToResponseDto(link);
    }

    // Helper: Retrieve the currently authenticated User entity
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Unauthorized request");
        }
        String currentUsername = authentication.getName();
        return userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new AccessDeniedException("Authenticated user not found"));
    }

    // Helper: Map UserFacilityLink to FacilityAssignResponseDto
    private FacilityAssignResponseDto mapToResponseDto(UserFacilityLink link) {
        User u = link.getUser();
        UserResponseDto userDto = new UserResponseDto(
                u.getId(),
                u.getName(),
                u.getUsername(),
                u.getEmail(),
                u.getPhone(),
                u.getRole(),
                u.getStatus(),
                link.getFacility().getId(),
                u.getCreatedAt(),
                null
        );

        Facility f = link.getFacility();
        FacilityResponseDto facilityDto = new FacilityResponseDto(
                f.getId(),
                f.getProject() != null ? f.getProject().getId() : null,
                f.getProject() != null ? f.getProject().getName() : null,
                f.getFacilityCode(),
                f.getName(),
                f.getType(),
                f.getContactPerson(),
                f.getEmail(),
                f.getPhone(),
                f.getAddress(),
                f.getStatus(),
                f.getCreatedAt(),
                f.getUpdatedAt(),
                null
        );

        return new FacilityAssignResponseDto(
                link.getId(),
                userDto,
                facilityDto,
                link.getAssignedAt()
        );
    }
}
