package com.example.backend.service;

import com.example.backend.dto.batch.BatchRequestDto;
import com.example.backend.dto.batch.BatchResponseDto;
import com.example.backend.entity.Batch;
import com.example.backend.entity.Facility;
import com.example.backend.entity.Order;
import com.example.backend.entity.OrderedItem;
import com.example.backend.entity.Sku;
import com.example.backend.entity.AuditLog;
import com.example.backend.repository.BatchRepository;
import com.example.backend.repository.FacilityRepository;
import com.example.backend.repository.OrderRepository;
import com.example.backend.repository.OrderedItemRepository;
import com.example.backend.repository.SkuRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BatchService {

    private final BatchRepository batchRepository;
    private final OrderedItemRepository orderedItemRepository;
    private final SkuRepository skuRepository;
    private final FacilityRepository facilityRepository;
    private final OrderRepository orderRepository;
    private final AuditLogService auditLogService;

    public BatchService(BatchRepository batchRepository,
                        OrderedItemRepository orderedItemRepository,
                        SkuRepository skuRepository,
                        FacilityRepository facilityRepository,
                        OrderRepository orderRepository,
                        AuditLogService auditLogService) {
        this.batchRepository = batchRepository;
        this.orderedItemRepository = orderedItemRepository;
        this.skuRepository = skuRepository;
        this.facilityRepository = facilityRepository;
        this.orderRepository = orderRepository;
        this.auditLogService = auditLogService;
    }

    // 1. RECEIVE SINGLE BATCH (Pharmacist / Admin / SuperAdmin)
    @Transactional
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin', 'Pharmacist')")
    public BatchResponseDto receiveBatch(BatchRequestDto request) {
        if (request == null) {
            throw new RuntimeException("Request body cannot be null.");
        }

        if (request.getOrderedItemId() == null) {
            throw new RuntimeException("Ordered item ID is required.");
        }

        OrderedItem orderedItem = orderedItemRepository.findById(request.getOrderedItemId())
                .orElseThrow(() -> new RuntimeException("Ordered item not found with id: " + request.getOrderedItemId()));

        Facility facility = null;
        if (request.getFacilityId() != null) {
            facility = facilityRepository.findById(request.getFacilityId())
                    .orElseThrow(() -> new RuntimeException("Facility not found with id: " + request.getFacilityId()));
        } else if (orderedItem.getOrder() != null && orderedItem.getOrder().getFacility() != null) {
            facility = orderedItem.getOrder().getFacility();
        } else if (orderedItem.getSku() != null && orderedItem.getSku().getFacility() != null) {
            facility = orderedItem.getSku().getFacility();
        }

        if (facility == null) {
            throw new RuntimeException("Facility is required for receiving batch.");
        }

        String trimmedBatchNum = request.getBatchNum() != null ? request.getBatchNum().trim() : "";
        if (trimmedBatchNum.isEmpty()) {
            throw new RuntimeException("Batch number is required.");
        }

        if (batchRepository.existsByBatchNumAndFacilityId(trimmedBatchNum, facility.getId())) {
            throw new RuntimeException("Batch number '" + trimmedBatchNum + "' already exists in this facility.");
        }

        if (request.getManufactureDate() == null) {
            throw new RuntimeException("Manufacture date is required.");
        }

        if (request.getExpiryDate() == null) {
            throw new RuntimeException("Expiry date is required.");
        }

        if (!request.getExpiryDate().isAfter(request.getManufactureDate())) {
            throw new RuntimeException("Expiry date must be after manufacture date.");
        }

        Batch batch = new Batch();
        batch.setFacility(facility);
        batch.setOrderedItem(orderedItem);
        batch.setBatchNum(trimmedBatchNum);
        batch.setUnits(orderedItem.getOrderedUnits() != null ? orderedItem.getOrderedUnits() : 0L);
        batch.setManufactureDate(request.getManufactureDate());
        batch.setExpiryDate(request.getExpiryDate());
        batch.setStatus(request.getStatus() != null ? request.getStatus() : Batch.Status.Available);
        batch.setNotes(request.getNotes());

        Batch savedBatch = batchRepository.save(batch);

        // INCREMENT SKU UNITS only if status is Available (quarantined batches do not increment active SKU units)
        if (savedBatch.getStatus() == Batch.Status.Available) {
            Sku sku = orderedItem.getSku();
            if (sku != null) {
                long currentUnits = sku.getUnits() != null ? sku.getUnits() : 0L;
                long unitsToAdd = savedBatch.getUnits() != null ? savedBatch.getUnits() : 0L;
                sku.setUnits(currentUnits + unitsToAdd);
                skuRepository.save(sku);
            }
        }

        // UPDATE ORDER STATUS TO RECEIVED
        Order order = orderedItem.getOrder();
        if (order != null && order.getStatus() != Order.Status.Received) {
            order.setStatus(Order.Status.Received);
            orderRepository.save(order);
        }

        auditLogService.logAction(
                savedBatch.getFacility(),
                "Inventory",
                "BATCH_RECEIVED",
                "Batch Stock Received (" + savedBatch.getUnits() + " units)",
                AuditLog.Severity.SUCCESS,
                savedBatch.getBatchNum(),
                savedBatch.getId(),
                "Received batch '" + savedBatch.getBatchNum() + "' (" + savedBatch.getUnits() + " units) for SKU '" + (orderedItem.getSku() != null ? orderedItem.getSku().getName() : "") + "'. Expiry: " + savedBatch.getExpiryDate() + ".",
                "Admin,Pharmacist"
        );

        return mapToResponseDto(savedBatch);
    }

    // 2. RECEIVE MULTIPLE BATCHES BULK (e.g. from multi-item PO)
    @Transactional
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin', 'Pharmacist')")
    public List<BatchResponseDto> receiveBatchesBulk(List<BatchRequestDto> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new RuntimeException("Batch requests list cannot be empty.");
        }

        List<BatchResponseDto> responses = new ArrayList<>();
        for (BatchRequestDto req : requests) {
            responses.add(receiveBatch(req));
        }
        return responses;
    }

    // 3. GET ALL BATCHES BY FACILITY (with optional Status filter)
    @Transactional
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin', 'Pharmacist', 'Procurement')")
    public List<BatchResponseDto> getBatchesByFacility(Long facilityId, Batch.Status status) {
        if (facilityId == null) {
            throw new RuntimeException("Facility ID is required.");
        }

        // Auto-expire any batches whose expiry date has passed and deduct SKU units
        processExpiredBatches();

        List<Batch> batches;
        if (status != null) {
            batches = batchRepository.findByFacilityIdAndStatusOrderByReceivedAtDesc(facilityId, status);
        } else {
            batches = batchRepository.findByFacilityIdOrderByReceivedAtDesc(facilityId);
        }

        return batches.stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    // 4. GET BATCH BY ID
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin', 'Pharmacist', 'Procurement')")
    public BatchResponseDto getBatchById(Long id) {
        Batch batch = batchRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Batch not found with id: " + id));
        return mapToResponseDto(batch);
    }

    // 5. UPDATE BATCH STATUS & NOTES (Quarantine / Release / Expiry)
    @Transactional
    @PreAuthorize("hasAnyRole('SuperAdmin', 'Admin', 'Pharmacist')")
    public BatchResponseDto updateBatchStatus(Long id, Batch.Status status, String notes) {
        Batch batch = batchRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Batch not found with id: " + id));

        Batch.Status oldStatus = batch.getStatus();
        if (status != null && status != oldStatus) {
            batch.setStatus(status);

            // 1. Quarantined -> Available: add units to active SKU inventory
            if (oldStatus == Batch.Status.Quarantined && status == Batch.Status.Available) {
                adjustSkuUnits(batch, batch.getUnits());
            }
            // 2. Available -> Quarantined: deduct units from active SKU inventory
            else if (oldStatus == Batch.Status.Available && status == Batch.Status.Quarantined) {
                adjustSkuUnits(batch, -batch.getUnits());
            }
            // 3. Available -> Expired: deduct units from active SKU inventory
            else if (oldStatus == Batch.Status.Available && status == Batch.Status.Expired) {
                adjustSkuUnits(batch, -batch.getUnits());
            }
            // 4. Expired -> Available: add units back if mistakenly marked expired
            else if (oldStatus == Batch.Status.Expired && status == Batch.Status.Available) {
                adjustSkuUnits(batch, batch.getUnits());
            }
            // Note: transitions between Quarantined and Expired do not affect active SKU inventory,
            // as neither state's units are counted toward active Sku.units.
        }

        if (notes != null) {
            batch.setNotes(notes.trim());
        }

        Batch updated = batchRepository.save(batch);

        auditLogService.logAction(
                updated.getFacility(),
                "Inventory",
                "BATCH_STATUS_UPDATED",
                "Batch Status Changed (" + oldStatus + " -> " + status + ")",
                status == Batch.Status.Quarantined ? AuditLog.Severity.WARNING : AuditLog.Severity.INFO,
                updated.getBatchNum(),
                updated.getId(),
                "Updated batch status for '" + updated.getBatchNum() + "' from " + oldStatus + " to " + status + "." + (notes != null && !notes.isBlank() ? " Notes: " + notes : ""),
                "Admin,Pharmacist"
        );

        return mapToResponseDto(updated);
    }

    // 6. PROCESS EXPIRED BATCHES (Deducts SKU units & sets status to Expired)
    @Transactional
    public int processExpiredBatches() {
        LocalDate today = LocalDate.now();
        List<Batch> expiredBatches = batchRepository.findByStatusAndExpiryDateLessThanEqual(
                Batch.Status.Available, today);

        for (Batch batch : expiredBatches) {
            batch.setStatus(Batch.Status.Expired);
            adjustSkuUnits(batch, -batch.getUnits());
            String autoNote = "Auto-expired on " + today;
            if (batch.getNotes() == null || batch.getNotes().isBlank()) {
                batch.setNotes(autoNote);
            } else {
                batch.setNotes(batch.getNotes() + " | " + autoNote);
            }
            batchRepository.save(batch);

            auditLogService.logAction(
                    batch.getFacility(),
                    null,
                    "Inventory",
                    "BATCH_EXPIRED",
                    "Batch Expired (" + batch.getBatchNum() + ")",
                    AuditLog.Severity.CRITICAL,
                    batch.getBatchNum(),
                    batch.getId(),
                    "Batch '" + batch.getBatchNum() + "' passed expiration date (" + batch.getExpiryDate() + "). Automatically deducted " + batch.getUnits() + " units from active SKU inventory.",
                    "Admin,Pharmacist"
            );
        }
        return expiredBatches.size();
    }

    // 7. SCHEDULED DAILY MIDNIGHT EXPIRATION RUN
    @Scheduled(cron = "0 0 0 * * ?")
    public void autoExpireBatchesScheduled() {
        processExpiredBatches();
    }

    // 8. DEDUCT BATCHES ACCORDING TO FEFO (FIRST EXPIRE FIRST OUT)
    @Transactional
    public void deductBatchesFEFO(Long skuId, Long facilityId, long unitsToDeduct) {
        if (unitsToDeduct <= 0 || skuId == null || facilityId == null) {
            return;
        }

        List<Batch> availableBatches = batchRepository.findAvailableBatchesForSkuFEFO(
                skuId, facilityId, Batch.Status.Available);

        long remaining = unitsToDeduct;
        for (Batch batch : availableBatches) {
            if (remaining <= 0) {
                break;
            }
            long currentBatchUnits = batch.getUnits() != null ? batch.getUnits() : 0L;
            if (currentBatchUnits <= 0) {
                continue;
            }

            if (currentBatchUnits <= remaining) {
                remaining -= currentBatchUnits;
                batch.setUnits(0L);
            } else {
                batch.setUnits(currentBatchUnits - remaining);
                remaining = 0L;
            }
            batchRepository.save(batch);
        }
    }

    // HELPER: ADJUST ACTIVE SKU UNITS
    private void adjustSkuUnits(Batch batch, long delta) {
        OrderedItem item = batch.getOrderedItem();
        if (item != null && item.getSku() != null) {
            Sku sku = item.getSku();
            long currentUnits = sku.getUnits() != null ? sku.getUnits() : 0L;
            long newUnits = Math.max(0L, currentUnits + delta);
            sku.setUnits(newUnits);
            skuRepository.save(sku);
        }
    }

    // MAPPER HELPER
    private BatchResponseDto mapToResponseDto(Batch batch) {
        BatchResponseDto dto = new BatchResponseDto();
        dto.setId(batch.getId());
        dto.setBatchNum(batch.getBatchNum());
        dto.setManufactureDate(batch.getManufactureDate());
        dto.setUnits(batch.getUnits());
        dto.setExpiryDate(batch.getExpiryDate());
        dto.setStatus(batch.getStatus());
        dto.setNotes(batch.getNotes());
        dto.setReceivedAt(batch.getReceivedAt());

        if (batch.getFacility() != null) {
            dto.setFacilityId(batch.getFacility().getId());
            dto.setFacilityName(batch.getFacility().getName());
        }

        OrderedItem item = batch.getOrderedItem();
        if (item != null) {
            dto.setOrderedItemId(item.getId());
            dto.setQuantity(item.getOrderedUnits());

            if (item.getOrder() != null) {
                dto.setOrderId(item.getOrder().getId());
                dto.setPoNumber(item.getOrder().getPurchaseOrderNum());
                if (item.getOrder().getSupplier() != null) {
                    dto.setSupplierName(item.getOrder().getSupplier().getName());
                }
            }

            Sku sku = item.getSku();
            if (sku != null) {
                dto.setSkuId(sku.getId());
                dto.setSkuName(sku.getName());
                dto.setBrandName(sku.getBrandName());
                dto.setDosageForm(sku.getDosageForm());
                dto.setPackagingUnit(sku.getPackagingUnit());
                if (sku.getLibMedicine() != null) {
                    dto.setGenericName(sku.getLibMedicine().getDrugDescription());
                }
            }
        }

        return dto;
    }
}
