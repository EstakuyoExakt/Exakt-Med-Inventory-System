package com.example.backend.service;

import com.example.backend.dto.facility.FacilityRequestDto;
import com.example.backend.dto.facility.FacilityResponseDto;
import com.example.backend.entity.Facility;
import com.example.backend.entity.Project;
import com.example.backend.repository.FacilityRepository;
import com.example.backend.repository.ProjectRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class FacilityService {

    private final FacilityRepository facilityRepository;
    private final ProjectRepository projectRepository;

    public FacilityService(FacilityRepository facilityRepository, ProjectRepository projectRepository) {
        this.facilityRepository = facilityRepository;
        this.projectRepository = projectRepository;
    }

    // 1. CREATE FACILITY (SuperAdmin and Admin)
    @Transactional
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin')")
    public FacilityResponseDto createFacility(FacilityRequestDto request) {
        // Validate project exists
        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new RuntimeException("Project not found with id: " + request.getProjectId()));

        Facility facility = new Facility();
        facility.setProject(project);
        facility.setName(request.getName());
        facility.setType(request.getType());
        facility.setContactPerson(request.getContactPerson());
        facility.setEmail(request.getEmail());
        facility.setPhone(request.getPhone());
        facility.setAddress(request.getAddress());
        facility.setStatus(request.getStatus() != null ? request.getStatus() : Facility.Status.Active);

        // Save initially to generate the auto-increment ID
        Facility savedFacility = facilityRepository.saveAndFlush(facility);

        // Auto-generate facilityCode format: FAC-001, FAC-010, etc.
        savedFacility.setFacilityCode(String.format("FAC-%03d", savedFacility.getId()));
        savedFacility = facilityRepository.save(savedFacility);

        return mapToResponseDto(savedFacility, "Facility Created Successfully");
    }

    // 2. GET ALL FACILITIES (SuperAdmin and Admin)
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin')")
    public List<FacilityResponseDto> getAllFacilities() {
        return facilityRepository.findAll()
                .stream()
                .map(facility -> mapToResponseDto(facility, null))
                .collect(Collectors.toList());
    }

    // 3. GET FACILITY BY ID (SuperAdmin and Admin)
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin')")
    public FacilityResponseDto getFacilityById(Long id) {
        Facility facility = facilityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Facility not found with id: " + id));
        return mapToResponseDto(facility, "Facility Fetched Successfully");
    }

    // 4. UPDATE FACILITY (SuperAdmin and Admin)
    @Transactional
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin')")
    public FacilityResponseDto updateFacility(Long id, FacilityRequestDto request) {
        Facility existingFacility = facilityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Facility not found with id: " + id));

        // If project reference changed
        if (!existingFacility.getProject().getId().equals(request.getProjectId())) {
            Project project = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new RuntimeException("Project not found with id: " + request.getProjectId()));
            existingFacility.setProject(project);
        }

        existingFacility.setName(request.getName());
        existingFacility.setType(request.getType());
        existingFacility.setContactPerson(request.getContactPerson());
        existingFacility.setEmail(request.getEmail());
        existingFacility.setPhone(request.getPhone());
        existingFacility.setAddress(request.getAddress());
        if (request.getStatus() != null) {
            existingFacility.setStatus(request.getStatus());
        }

        Facility updatedFacility = facilityRepository.save(existingFacility);
        return mapToResponseDto(updatedFacility, "Facility Updated Successfully");
    }

    // 5. DELETE FACILITY (SuperAdmin and Admin)
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin')")
    public void deleteFacility(Long id) {
        if (!facilityRepository.existsById(id)) {
            throw new RuntimeException("Facility not found with id: " + id);
        }
        facilityRepository.deleteById(id);
    }

    // Helper: Map Facility entity to FacilityResponseDto
    private FacilityResponseDto mapToResponseDto(Facility facility, String message) {
        FacilityResponseDto response = new FacilityResponseDto();
        response.setId(facility.getId());
        if (facility.getProject() != null) {
            response.setProjectId(facility.getProject().getId());
            response.setProjectName(facility.getProject().getName());
        }
        response.setFacilityCode(facility.getFacilityCode());
        response.setName(facility.getName());
        response.setType(facility.getType());
        response.setContactPerson(facility.getContactPerson());
        response.setEmail(facility.getEmail());
        response.setPhone(facility.getPhone());
        response.setAddress(facility.getAddress());
        response.setStatus(facility.getStatus());
        response.setCreatedAt(facility.getCreatedAt());
        response.setUpdatedAt(facility.getUpdatedAt());
        response.setMessage(message);
        return response;
    }
}
