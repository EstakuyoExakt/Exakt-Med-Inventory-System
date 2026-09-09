package com.example.backend.service;

import com.example.backend.dto.user.UserRequestDto;
import com.example.backend.dto.user.UserResponseDto;
import com.example.backend.entity.User;
import com.example.backend.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // 1. CREATE USER
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin')")
    public UserResponseDto createUser(UserRequestDto request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new RuntimeException("Username already exists: " + request.getUsername());
        }

        // An Admin cannot create SuperAdmin or Admin accounts
        User currentUser = getCurrentUser();
        if (currentUser.getRole() == User.Role.Admin) {
            if (request.getRole() == User.Role.SuperAdmin || request.getRole() == User.Role.Admin) {
                throw new AccessDeniedException("Admins cannot create SuperAdmin or Admin accounts");
            }
        }

        User user = new User();
        user.setName(request.getName());
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setRole(request.getRole());
        user.setStatus(request.getStatus() != null ? request.getStatus() : true);

        User savedUser = userRepository.save(user);
        return mapToResponseDto(savedUser, "User created successfully");
    }

    // 2. GET ALL USERS
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin')")
    public List<UserResponseDto> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(user -> mapToResponseDto(user, null))
                .collect(Collectors.toList());
    }

    // 3. GET USER BY ID
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin')")
    public UserResponseDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
        return mapToResponseDto(user, "User fetched successfully");
    }

    // 4. UPDATE USER
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin')")
    public UserResponseDto updateUser(Long id, UserRequestDto request) {
        User targetUser = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));

        User currentUser = getCurrentUser();

        // If the logged-in user is an Admin:
        // Do not allow updating fellow Admins or SuperAdmins (unless updating themselves)
        if (currentUser.getRole() == User.Role.Admin) {
            boolean isTargetAdminOrSuperAdmin = targetUser.getRole() == User.Role.Admin || targetUser.getRole() == User.Role.SuperAdmin;
            boolean isSelf = targetUser.getId().equals(currentUser.getId());

            if (isTargetAdminOrSuperAdmin && !isSelf) {
                throw new AccessDeniedException("Admins are not allowed to update other Admin or SuperAdmin accounts");
            }

            // Also prevent Admin from promoting anyone to Admin or SuperAdmin
            if (request.getRole() != null && (request.getRole() == User.Role.Admin || request.getRole() == User.Role.SuperAdmin) && !isSelf) {
                throw new AccessDeniedException("Admins cannot assign Admin or SuperAdmin roles");
            }
        }

        // Update fields
        targetUser.setName(request.getName());
        targetUser.setEmail(request.getEmail());
        targetUser.setPhone(request.getPhone());
        if (request.getRole() != null) {
            targetUser.setRole(request.getRole());
        }
        if (request.getStatus() != null) {
            targetUser.setStatus(request.getStatus());
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            targetUser.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        User updatedUser = userRepository.save(targetUser);
        return mapToResponseDto(updatedUser, "User updated successfully");
    }

    // 5. DELETE USER
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin')")
    public void deleteUser(Long id) {
        User targetUser = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));

        User currentUser = getCurrentUser();

        // If the logged-in user is an Admin:
        // Do not allow deleting fellow Admins or SuperAdmins
        if (currentUser.getRole() == User.Role.Admin) {
            if (targetUser.getRole() == User.Role.Admin || targetUser.getRole() == User.Role.SuperAdmin) {
                throw new AccessDeniedException("Admins are not allowed to delete Admin or SuperAdmin accounts");
            }
        }

        userRepository.delete(targetUser);
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

    // Helper: Map User entity to UserResponseDto
    private UserResponseDto mapToResponseDto(User user, String message) {
        return new UserResponseDto(
                user.getId(),
                user.getName(),
                user.getUsername(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.getStatus(),
                user.getCreatedAt(),
                message
        );
    }
}
