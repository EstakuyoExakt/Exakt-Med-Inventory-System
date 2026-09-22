package com.example.backend.service;

import com.example.backend.dto.sku.SkuRequestDto;
import com.example.backend.dto.sku.SkuResponseDto;
import com.example.backend.entity.Facility;
import com.example.backend.entity.LibMedicine;
import com.example.backend.entity.Sku;
import com.example.backend.repository.FacilityRepository;
import com.example.backend.repository.LibMedicineRepository;
import com.example.backend.repository.SkuRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SkuService {

    private final SkuRepository skuRepository;
    private final FacilityRepository facilityRepository;
    private final LibMedicineRepository libMedicineRepository;

    public SkuService(SkuRepository skuRepository,
                      FacilityRepository facilityRepository,
                      LibMedicineRepository libMedicineRepository) {
        this.skuRepository = skuRepository;
        this.facilityRepository = facilityRepository;
        this.libMedicineRepository = libMedicineRepository;
    }

    // 1. CREATE SKU (Units field is automatically defaulted to 0 by @PrePersist in Sku entity)
    @Transactional
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin', 'Pharmacist')")
    public SkuResponseDto createSku(SkuRequestDto request) {
        Facility facility = facilityRepository.findById(request.getFacilityId())
                .orElseThrow(() -> new RuntimeException("Facility not found with id: " + request.getFacilityId()));

        LibMedicine libMedicine = libMedicineRepository.findById(request.getMedicineId())
                .orElseThrow(() -> new RuntimeException("Medicine not found with id: " + request.getMedicineId()));

        if (request.getReorderLevel() <= request.getMinimumLevel()) {
            throw new RuntimeException("Reorder level must be greater than minimum level threshold");
        }

        if (request.getMaximumLevel() <= request.getReorderLevel()) {
            throw new RuntimeException("Maximum capacity must be greater than reorder level threshold");
        }

        Sku sku = new Sku();
        sku.setFacility(facility);
        sku.setLibMedicine(libMedicine);
        sku.setName(request.getName().trim());
        sku.setBrandName(request.getBrandName().trim());
        sku.setDosageForm(request.getDosageForm().trim());
        sku.setPackagingUnit(request.getPackagingUnit().trim());
        sku.setMinimumLevel(request.getMinimumLevel());
        sku.setReorderLevel(request.getReorderLevel());
        sku.setMaximumLevel(request.getMaximumLevel());

        Sku savedSku = skuRepository.save(sku);
        return mapToResponseDto(savedSku, "SKU created successfully");
    }

    // 2. GET ALL SKUS (Optionally filtered by facilityId)
    @PreAuthorize("isAuthenticated()")
    public List<SkuResponseDto> getAllSkus(Long facilityId) {
        List<Sku> skus;
        if (facilityId != null) {
            if (!facilityRepository.existsById(facilityId)) {
                throw new RuntimeException("Facility not found with id: " + facilityId);
            }
            skus = skuRepository.findByFacilityId(facilityId);
        } else {
            skus = skuRepository.findAll();
        }
        return skus.stream()
                .map(sku -> mapToResponseDto(sku, null))
                .collect(Collectors.toList());
    }

    // 3. GET SKU BY ID
    @PreAuthorize("isAuthenticated()")
    public SkuResponseDto getSkuById(Long id) {
        Sku sku = skuRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("SKU not found with id: " + id));
        return mapToResponseDto(sku, null);
    }

    // 4. UPDATE SKU
    @Transactional
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin', 'Pharmacist')")
    public SkuResponseDto updateSku(Long id, SkuRequestDto request) {
        Sku existingSku = skuRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("SKU not found with id: " + id));

        // If facility changed
        if (!existingSku.getFacility().getId().equals(request.getFacilityId())) {
            Facility newFacility = facilityRepository.findById(request.getFacilityId())
                    .orElseThrow(() -> new RuntimeException("Facility not found with id: " + request.getFacilityId()));
            existingSku.setFacility(newFacility);
        }

        // If medicine changed
        if (!existingSku.getLibMedicine().getId().equals(request.getMedicineId())) {
            LibMedicine newMedicine = libMedicineRepository.findById(request.getMedicineId())
                    .orElseThrow(() -> new RuntimeException("Medicine not found with id: " + request.getMedicineId()));
            existingSku.setLibMedicine(newMedicine);
        }

        if (request.getReorderLevel() <= request.getMinimumLevel()) {
            throw new RuntimeException("Reorder level must be greater than minimum level threshold");
        }

        if (request.getMaximumLevel() <= request.getReorderLevel()) {
            throw new RuntimeException("Maximum capacity must be greater than reorder level threshold");
        }

        existingSku.setName(request.getName().trim());
        existingSku.setBrandName(request.getBrandName().trim());
        existingSku.setDosageForm(request.getDosageForm().trim());
        existingSku.setPackagingUnit(request.getPackagingUnit().trim());
        existingSku.setMinimumLevel(request.getMinimumLevel());
        existingSku.setReorderLevel(request.getReorderLevel());
        existingSku.setMaximumLevel(request.getMaximumLevel());

        Sku updatedSku = skuRepository.save(existingSku);
        return mapToResponseDto(updatedSku, "SKU updated successfully");
    }

    // 5. DELETE SKU
    @Transactional
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin', 'Pharmacist')")
    public void deleteSku(Long id) {
        if (!skuRepository.existsById(id)) {
            throw new RuntimeException("SKU not found with id: " + id);
        }
        skuRepository.deleteById(id);
    }

    // 6. SEARCH SKUS (by brandName, sku name, and medicine name)
    @PreAuthorize("isAuthenticated()")
    public List<SkuResponseDto> searchSkus(String search, Long facilityId) {
        String query = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        return skuRepository.searchSkus(query, facilityId)
                .stream()
                .map(sku -> mapToResponseDto(sku, null))
                .collect(Collectors.toList());
    }

    // 7. GET SKUS THAT NEED REORDERING (units <= reorderLevel, excluding active Pending/Approved orders)
    @PreAuthorize("isAuthenticated()")
    public List<SkuResponseDto> getReorderNeededSkus(Long facilityId, String search) {
        String query = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        return skuRepository.findReorderNeededSkus(facilityId, query)
                .stream()
                .map(sku -> mapToResponseDto(sku, null))
                .collect(Collectors.toList());
    }

    // Helper: Map Sku entity to SkuResponseDto
    private SkuResponseDto mapToResponseDto(Sku sku, String message) {
        SkuResponseDto dto = new SkuResponseDto();
        dto.setId(sku.getId());

        if (sku.getFacility() != null) {
            dto.setFacilityId(sku.getFacility().getId());
            dto.setFacilityName(sku.getFacility().getName());
        }

        if (sku.getLibMedicine() != null) {
            dto.setMedicineId(sku.getLibMedicine().getId());
            dto.setDrugDescription(sku.getLibMedicine().getDrugDescription());
        }

        dto.setName(sku.getName());
        dto.setBrandName(sku.getBrandName());
        dto.setDosageForm(sku.getDosageForm());
        dto.setPackagingUnit(sku.getPackagingUnit());
        dto.setUnits(sku.getUnits() != null ? sku.getUnits() : 0L);
        dto.setMinimumLevel(sku.getMinimumLevel());
        dto.setReorderLevel(sku.getReorderLevel());
        dto.setMaximumLevel(sku.getMaximumLevel());
        dto.setCreatedAt(sku.getCreatedAt());
        dto.setUpdatedAt(sku.getUpdatedAt());
        dto.setMessage(message);

        return dto;
    }
}
