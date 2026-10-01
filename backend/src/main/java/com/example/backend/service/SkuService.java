package com.example.backend.service;

import com.example.backend.dto.sku.SkuRequestDto;
import com.example.backend.dto.sku.SkuResponseDto;
import com.example.backend.dto.sku.SkuStockAdjustmentDto;
import com.example.backend.dto.sku.StockAdjustmentLogResponseDto;
import com.example.backend.entity.AuditLog;
import com.example.backend.entity.Batch;
import com.example.backend.entity.Facility;
import com.example.backend.entity.LibMedicine;
import com.example.backend.entity.Sku;
import com.example.backend.entity.StockAdjustmentLog;
import com.example.backend.entity.User;
import com.example.backend.entity.RestockRequest;
import com.example.backend.entity.Order;
import com.example.backend.entity.OrderedItem;
import com.example.backend.repository.FacilityRepository;
import com.example.backend.repository.LibMedicineRepository;
import com.example.backend.repository.OrderedItemRepository;
import com.example.backend.repository.RestockRequestRepository;
import com.example.backend.repository.SkuRepository;
import com.example.backend.repository.StockAdjustmentLogRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class SkuService {

    private final SkuRepository skuRepository;
    private final FacilityRepository facilityRepository;
    private final LibMedicineRepository libMedicineRepository;
    private final BatchService batchService;
    private final StockAdjustmentLogRepository stockAdjustmentLogRepository;
    private final AuditLogService auditLogService;
    private final UserRepository userRepository;
    private final RestockRequestRepository restockRequestRepository;
    private final OrderedItemRepository orderedItemRepository;

    public SkuService(SkuRepository skuRepository,
                      FacilityRepository facilityRepository,
                      LibMedicineRepository libMedicineRepository,
                      BatchService batchService,
                      StockAdjustmentLogRepository stockAdjustmentLogRepository,
                      AuditLogService auditLogService,
                      UserRepository userRepository,
                      RestockRequestRepository restockRequestRepository,
                      OrderedItemRepository orderedItemRepository) {
        this.skuRepository = skuRepository;
        this.facilityRepository = facilityRepository;
        this.libMedicineRepository = libMedicineRepository;
        this.batchService = batchService;
        this.stockAdjustmentLogRepository = stockAdjustmentLogRepository;
        this.auditLogService = auditLogService;
        this.userRepository = userRepository;
        this.restockRequestRepository = restockRequestRepository;
        this.orderedItemRepository = orderedItemRepository;
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

        auditLogService.logAction(
                facility,
                getCurrentUser(),
                "SKU Catalog",
                "SKU_CREATED",
                "New SKU Created (" + savedSku.getName() + ")",
                AuditLog.Severity.SUCCESS,
                savedSku.getName(),
                savedSku.getId(),
                "Registered new SKU '" + savedSku.getName() + "' (" + (savedSku.getBrandName() != null ? savedSku.getBrandName() : "") + ") in catalog.",
                "Admin,Pharmacist"
        );

        return mapToResponseDto(savedSku, "SKU created successfully");
    }

    // 2. GET ALL SKUS (Strictly required facilityId)
    @Transactional
    @PreAuthorize("isAuthenticated()")
    public List<SkuResponseDto> getAllSkus(Long facilityId) {
        if (facilityId == null) {
            throw new RuntimeException("Facility ID is strictly required.");
        }
        if (!facilityRepository.existsById(facilityId)) {
            throw new RuntimeException("Facility not found with id: " + facilityId);
        }

        // Ensure past-due batches have their status marked Expired (no automatic SKU deduction)
        batchService.markPastDueBatchesAsExpired(facilityId);

        List<Sku> skus = skuRepository.findByFacilityId(facilityId);
        Map<Long, SkuOrderMetrics> activeMetricsMap = getActiveOrderMetricsMap(facilityId);

        return skus.stream()
                .map(sku -> mapToResponseDto(sku, null, activeMetricsMap.get(sku.getId())))
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

        auditLogService.logAction(
                updatedSku.getFacility(),
                getCurrentUser(),
                "SKU Catalog",
                "SKU_UPDATED",
                "SKU Details Updated (" + updatedSku.getName() + ")",
                AuditLog.Severity.INFO,
                updatedSku.getName(),
                updatedSku.getId(),
                "Updated SKU details for '" + updatedSku.getName() + "'. Dosage: " + updatedSku.getDosageForm() + ", Reorder: " + updatedSku.getReorderLevel() + ", Max: " + updatedSku.getMaximumLevel() + ".",
                "Admin,Pharmacist"
        );

        return mapToResponseDto(updatedSku, "SKU updated successfully");
    }

    // 5. DELETE SKU
    @Transactional
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin', 'Pharmacist')")
    public void deleteSku(Long id) {
        Sku sku = skuRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("SKU not found with id: " + id));

        skuRepository.delete(sku);

        auditLogService.logAction(
                sku.getFacility(),
                getCurrentUser(),
                "SKU Catalog",
                "SKU_DELETED",
                "SKU Deleted (" + sku.getName() + ")",
                AuditLog.Severity.WARNING,
                sku.getName(),
                sku.getId(),
                "Deleted SKU '" + sku.getName() + "' from inventory catalog.",
                "Admin,Pharmacist"
        );
    }

    // 5b. ADJUST SKU STOCK (Physical count / write-off / correction)
    @Transactional
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin', 'Pharmacist')")
    public SkuResponseDto adjustStock(Long id, SkuStockAdjustmentDto request) {
        Sku sku = skuRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("SKU not found with id: " + id));

        long currentUnits = sku.getUnits() != null ? sku.getUnits() : 0L;
        long newUnits;
        long unitsToDeduct = 0L;
        Batch targetBatch = null;

        switch (request.getType()) {
            case ADD:
                newUnits = currentUnits + request.getAmount();
                if (request.getBatchId() != null) {
                    targetBatch = batchService.addUnitsToBatch(request.getBatchId(), sku.getId(), request.getAmount());
                }
                break;
            case SUBTRACT:
                Long facilityId = sku.getFacility() != null ? sku.getFacility().getId() : null;
                if (facilityId != null && batchService.hasUnprocessedExpiredBatches(facilityId, sku.getId())) {
                    throw new RuntimeException("This SKU has unprocessed expired batches. Please deduct expired batches first before adjusting stock.");
                }
                if (request.getAmount() > currentUnits) {
                    throw new RuntimeException("Cannot deduct more than current stock (" + currentUnits + " units).");
                }
                newUnits = currentUnits - request.getAmount();
                unitsToDeduct = request.getAmount();
                break;
            default:
                throw new IllegalArgumentException("Unknown adjustment type: " + request.getType());
        }

        sku.setUnits(newUnits);
        Sku savedSku = skuRepository.save(sku);

        List<Batch> deductedBatches = new ArrayList<>();
        // FEFO: Deduct from the nearest expiring available batches
        if (unitsToDeduct > 0 && savedSku.getFacility() != null) {
            deductedBatches = batchService.deductBatchesFEFO(savedSku.getId(), savedSku.getFacility().getId(), unitsToDeduct);
        }

        // Build batch metadata string for both additions and deductions
        String batchDetails = null;
        if (targetBatch != null) {
            batchDetails = String.format("(Batch: %s, Expiry: %s)", targetBatch.getBatchNum(), targetBatch.getExpiryDate());
        } else if (!deductedBatches.isEmpty()) {
            if (deductedBatches.size() == 1) {
                Batch b = deductedBatches.get(0);
                batchDetails = String.format("(Batch: %s, Expiry: %s)", b.getBatchNum(), b.getExpiryDate());
            } else {
                batchDetails = "(Batches: " + deductedBatches.stream()
                        .map(b -> b.getBatchNum() + " [Exp: " + b.getExpiryDate() + "]")
                        .collect(Collectors.joining(", ")) + ")";
            }
        }

        // Record stock adjustment log entry
        StockAdjustmentLog log = new StockAdjustmentLog();
        log.setSku(savedSku);
        log.setFacility(savedSku.getFacility());
        log.setUser(getCurrentUser());
        log.setAdjustmentType(request.getType());
        log.setPreviousUnits(currentUnits);
        log.setAdjustedAmount(request.getAmount());
        log.setDeltaUnits(newUnits - currentUnits);
        log.setNewUnits(newUnits);
        log.setReason(request.getReason());

        String userNotes = (request.getNotes() != null && !request.getNotes().isBlank()) ? request.getNotes().trim() : null;
        String logNotes;
        if (userNotes != null && batchDetails != null) {
            logNotes = userNotes + " " + batchDetails;
        } else if (batchDetails != null) {
            logNotes = batchDetails;
        } else {
            logNotes = userNotes;
        }
        log.setNotes(logNotes);
        stockAdjustmentLogRepository.save(log);

        // Record central Audit Log entry
        long delta = newUnits - currentUnits;
        AuditLog.Severity severity = delta < 0 ? AuditLog.Severity.WARNING : AuditLog.Severity.INFO;
        String action;
        String actionLabel;
        if (request.getType() == SkuStockAdjustmentDto.Type.ADD) {
            action = "STOCK_ADDITION";
            actionLabel = "Stock Addition (+" + request.getAmount() + " units)";
        } else {
            action = "STOCK_DEDUCTION";
            actionLabel = "Stock Deduction (-" + request.getAmount() + " units)";
        }
        String batchInfo = "";
        if (targetBatch != null) {
            batchInfo = String.format(" [Target Batch: %s, Expiry: %s, New Batch Units: %d]",
                    targetBatch.getBatchNum(), targetBatch.getExpiryDate(), targetBatch.getUnits());
        } else if (!deductedBatches.isEmpty()) {
            batchInfo = " [Deducted from: " + deductedBatches.stream()
                    .map(b -> b.getBatchNum() + " (Exp: " + b.getExpiryDate() + ")")
                    .collect(Collectors.joining(", ")) + "]";
        }

        String description = String.format(
                "Stock adjusted for SKU '%s' (%s). Previous: %d units, Change: %+d units, New Stock: %d units. Reason: %s.%s%s",
                savedSku.getName(),
                savedSku.getBrandName() != null ? savedSku.getBrandName() : "",
                currentUnits,
                delta,
                newUnits,
                request.getReason(),
                (request.getNotes() != null && !request.getNotes().isBlank()) ? " Notes: " + request.getNotes().trim() : "",
                batchInfo
        );

        auditLogService.logAction(
                savedSku.getFacility(),
                getCurrentUser(),
                "Inventory",
                action,
                actionLabel,
                severity,
                savedSku.getName(),
                savedSku.getId(),
                description,
                "Admin,Pharmacist"
        );

        return mapToResponseDto(savedSku, "Stock adjusted successfully");
    }

    // 5c. GET ADJUSTMENT LOGS FOR A SPECIFIC SKU
    @Transactional(readOnly = true)
    @PreAuthorize("isAuthenticated()")
    public List<StockAdjustmentLogResponseDto> getAdjustmentLogsBySku(Long skuId) {
        return stockAdjustmentLogRepository.findBySkuIdOrderByCreatedAtDesc(skuId)
                .stream()
                .map(this::mapAdjustmentLogToDto)
                .collect(Collectors.toList());
    }

    // 5d. GET ADJUSTMENT LOGS FOR A FACILITY
    @Transactional(readOnly = true)
    @PreAuthorize("isAuthenticated()")
    public List<StockAdjustmentLogResponseDto> getAdjustmentLogsByFacility(Long facilityId) {
        if (facilityId == null) {
            throw new RuntimeException("Facility ID is strictly required.");
        }
        if (!facilityRepository.existsById(facilityId)) {
            throw new RuntimeException("Facility not found with id: " + facilityId);
        }
        return stockAdjustmentLogRepository.findByFacilityIdOrderByCreatedAtDesc(facilityId)
                .stream()
                .map(this::mapAdjustmentLogToDto)
                .collect(Collectors.toList());
    }

    // 6. SEARCH SKUS (by brandName, sku name, and medicine name)
    @Transactional
    @PreAuthorize("isAuthenticated()")
    public List<SkuResponseDto> searchSkus(String search, Long facilityId) {
        if (facilityId == null) {
            throw new RuntimeException("Facility ID is strictly required.");
        }
        if (!facilityRepository.existsById(facilityId)) {
            throw new RuntimeException("Facility not found with id: " + facilityId);
        }

        batchService.markPastDueBatchesAsExpired(facilityId);
        String query = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        List<Sku> skus = skuRepository.searchSkus(query, facilityId);
        Map<Long, SkuOrderMetrics> activeMetricsMap = getActiveOrderMetricsMap(facilityId);
        return skus.stream()
                .map(sku -> mapToResponseDto(sku, null, activeMetricsMap.get(sku.getId())))
                .collect(Collectors.toList());
    }

    // 7. GET SKUS THAT NEED REORDERING (units <= reorderLevel, excluding active Pending/Approved orders)
    @Transactional
    @PreAuthorize("isAuthenticated()")
    public List<SkuResponseDto> getReorderNeededSkus(Long facilityId, String search) {
        if (facilityId == null) {
            throw new RuntimeException("Facility ID is strictly required.");
        }
        if (!facilityRepository.existsById(facilityId)) {
            throw new RuntimeException("Facility not found with id: " + facilityId);
        }

        batchService.markPastDueBatchesAsExpired(facilityId);
        String query = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        List<Sku> skus = skuRepository.findReorderNeededSkus(facilityId, query);
        Map<Long, SkuOrderMetrics> activeMetricsMap = getActiveOrderMetricsMap(facilityId);
        return skus.stream()
                .map(sku -> mapToResponseDto(sku, null, activeMetricsMap.get(sku.getId())))
                .collect(Collectors.toList());
    }

    private static class SkuOrderMetrics {
        long pendingUnits = 0L;
        long toReceiveUnits = 0L;
        boolean hasActiveRestockRequest = false;
        long activeRestockUnits = 0L;
        RestockRequest latestRestockRequest = null;
    }

    private Map<Long, SkuOrderMetrics> getActiveOrderMetricsMap(Long facilityId) {
        if (facilityId == null) {
            return Collections.emptyMap();
        }
        Map<Long, SkuOrderMetrics> map = new HashMap<>();

        // 1. Active Pharmacist Restock Requests
        List<RestockRequest> activeRestocks = restockRequestRepository.findActiveRestockRequestsByFacilityId(facilityId);
        for (RestockRequest rr : activeRestocks) {
            if (rr.getSku() != null && rr.getSku().getId() != null) {
                SkuOrderMetrics m = map.computeIfAbsent(rr.getSku().getId(), k -> new SkuOrderMetrics());
                long units = rr.getRequestedUnits() != null ? rr.getRequestedUnits() : 0L;
                m.hasActiveRestockRequest = true;
                m.activeRestockUnits += units;
                if (m.latestRestockRequest == null) {
                    m.latestRestockRequest = rr;
                }
                // If it has not been assigned to a purchase order yet, add to pending units
                if (rr.getOrder() == null) {
                    m.pendingUnits += units;
                }
            }
        }

        // 2. Active Ordered Items (from POs, whether automated threshold PO or pharmacist requested PO)
        List<OrderedItem> activeItems = orderedItemRepository.findActiveOrderedItemsByFacilityId(facilityId);
        for (OrderedItem oi : activeItems) {
            if (oi.getSku() != null && oi.getSku().getId() != null && oi.getOrder() != null) {
                SkuOrderMetrics m = map.computeIfAbsent(oi.getSku().getId(), k -> new SkuOrderMetrics());
                long units = oi.getOrderedUnits() != null ? oi.getOrderedUnits() : 0L;
                if (oi.getOrder().getStatus() == Order.Status.Pending) {
                    m.pendingUnits += units;
                } else if (oi.getOrder().getStatus() == Order.Status.Approved) {
                    m.toReceiveUnits += units;
                }
            }
        }

        return map;
    }

    private SkuOrderMetrics getSingleSkuOrderMetrics(Long facilityId, Long skuId) {
        if (facilityId == null || skuId == null) {
            return new SkuOrderMetrics();
        }
        SkuOrderMetrics m = new SkuOrderMetrics();
        List<RestockRequest> activeRestocks = restockRequestRepository.findActiveRestockRequestsByFacilityIdAndSkuId(facilityId, skuId);
        for (RestockRequest rr : activeRestocks) {
            long units = rr.getRequestedUnits() != null ? rr.getRequestedUnits() : 0L;
            m.hasActiveRestockRequest = true;
            m.activeRestockUnits += units;
            if (m.latestRestockRequest == null) {
                m.latestRestockRequest = rr;
            }
            if (rr.getOrder() == null) {
                m.pendingUnits += units;
            }
        }
        List<OrderedItem> activeItems = orderedItemRepository.findActiveOrderedItemsByFacilityIdAndSkuId(facilityId, skuId);
        for (OrderedItem oi : activeItems) {
            if (oi.getOrder() != null) {
                long units = oi.getOrderedUnits() != null ? oi.getOrderedUnits() : 0L;
                if (oi.getOrder().getStatus() == Order.Status.Pending) {
                    m.pendingUnits += units;
                } else if (oi.getOrder().getStatus() == Order.Status.Approved) {
                    m.toReceiveUnits += units;
                }
            }
        }
        return m;
    }

    // Helper: Map Sku entity to SkuResponseDto with restock enrichment
    private SkuResponseDto mapToResponseDto(Sku sku, String message, SkuOrderMetrics metrics) {
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

        long pending = metrics != null ? metrics.pendingUnits : 0L;
        long toReceive = metrics != null ? metrics.toReceiveUnits : 0L;

        dto.setPendingUnits(pending);
        dto.setToReceiveUnits(toReceive);

        // hasPendingRestock is strictly for pharmacist restock requests
        // System threshold orders DO NOT block a pharmacist from requesting restock!
        boolean hasActiveRestock = metrics != null && metrics.hasActiveRestockRequest;
        dto.setHasPendingRestock(hasActiveRestock);
        dto.setPendingRestockUnits(hasActiveRestock ? metrics.activeRestockUnits : 0L);

        if (hasActiveRestock && metrics.latestRestockRequest != null) {
            dto.setPendingRestockRequestId(metrics.latestRestockRequest.getId());
            dto.setPendingRestockCreatedAt(metrics.latestRestockRequest.getCreatedAt());
            String status = metrics.latestRestockRequest.getOrder() == null
                    ? "Requested"
                    : metrics.latestRestockRequest.getOrder().getStatus().name();
            dto.setPendingRestockStatus(status);
        } else {
            dto.setPendingRestockRequestId(null);
            dto.setPendingRestockCreatedAt(null);
            dto.setPendingRestockStatus(null);
        }

        return dto;
    }

    // Overloaded helper for single-entity callers
    private SkuResponseDto mapToResponseDto(Sku sku, String message) {
        SkuOrderMetrics metrics = null;
        if (sku.getFacility() != null && sku.getId() != null) {
            metrics = getSingleSkuOrderMetrics(sku.getFacility().getId(), sku.getId());
        }
        return mapToResponseDto(sku, message, metrics);
    }

    private StockAdjustmentLogResponseDto mapAdjustmentLogToDto(StockAdjustmentLog log) {
        StockAdjustmentLogResponseDto dto = new StockAdjustmentLogResponseDto();
        dto.setId(log.getId());
        if (log.getSku() != null) {
            dto.setSkuId(log.getSku().getId());
            dto.setSkuName(log.getSku().getName());
            dto.setBrandName(log.getSku().getBrandName());
        }
        if (log.getFacility() != null) {
            dto.setFacilityId(log.getFacility().getId());
            dto.setFacilityName(log.getFacility().getName());
        }
        if (log.getUser() != null) {
            dto.setUserId(log.getUser().getId());
            dto.setUserName(log.getUser().getName());
        }
        dto.setAdjustmentType(log.getAdjustmentType());
        dto.setPreviousUnits(log.getPreviousUnits());
        dto.setAdjustedAmount(log.getAdjustedAmount());
        dto.setDeltaUnits(log.getDeltaUnits());
        dto.setNewUnits(log.getNewUnits());
        dto.setReason(log.getReason());
        dto.setNotes(log.getNotes());
        dto.setCreatedAt(log.getCreatedAt());
        return dto;
    }

    private User getCurrentUser() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()) {
                String username = authentication.getName();
                return userRepository.findByUsername(username).orElse(null);
            }
        } catch (Exception ignored) {
        }
        return null;
    }
}
