package com.example.backend.service;

import com.example.backend.dto.bincard.BinCardEntryDto;
import com.example.backend.dto.bincard.BinCardHeaderDto;
import com.example.backend.dto.bincard.BinCardResponseDto;
import com.example.backend.dto.bincard.BinCardSkuSummaryDto;
import com.example.backend.entity.*;
import com.example.backend.repository.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@PreAuthorize("hasAnyRole('SuperAdmin', 'Admin')")
public class BinCardService {

    private final SkuRepository skuRepository;
    private final FacilityRepository facilityRepository;
    private final BatchRepository batchRepository;
    private final StockAdjustmentLogRepository stockAdjustmentLogRepository;
    private final AuditLogRepository auditLogRepository;

    private static final Pattern DEDUCTED_UNITS_PATTERN = Pattern.compile("Deducted (\\d+) units");

    public BinCardService(SkuRepository skuRepository,
                          FacilityRepository facilityRepository,
                          BatchRepository batchRepository,
                          StockAdjustmentLogRepository stockAdjustmentLogRepository,
                          AuditLogRepository auditLogRepository) {
        this.skuRepository = skuRepository;
        this.facilityRepository = facilityRepository;
        this.batchRepository = batchRepository;
        this.stockAdjustmentLogRepository = stockAdjustmentLogRepository;
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * Retrieves the complete Bin Card (Header metadata + Chronological Transaction Ledger)
     * for a specific SKU within a facility.
     */
    @Transactional(readOnly = true)
    public BinCardResponseDto getBinCard(Long facilityId, Long skuId, LocalDate startDate, LocalDate endDate) {
        if (facilityId == null) {
            throw new IllegalArgumentException("Facility ID is required.");
        }
        if (skuId == null) {
            throw new IllegalArgumentException("SKU ID is required.");
        }

        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new RuntimeException("Facility not found with id: " + facilityId));

        Sku sku = skuRepository.findById(skuId)
                .orElseThrow(() -> new RuntimeException("SKU not found with id: " + skuId));

        if (sku.getFacility() != null && !sku.getFacility().getId().equals(facilityId)) {
            throw new RuntimeException("SKU " + skuId + " does not belong to facility " + facilityId);
        }

        // 1. Gather all chronological ledger events
        List<BinCardEntryDto> rawEntries = new ArrayList<>();

        // 1a. Inward movements: Received Batches
        List<Batch> batches = batchRepository.findBatchesForSkuOrderByReceivedAtAsc(facilityId, skuId);
        for (Batch batch : batches) {
            String poNum = null;
            String supplierName = null;
            Long unitsReceived = batch.getUnits() != null ? batch.getUnits() : 0L;

            if (batch.getOrderedItem() != null) {
                if (batch.getOrderedItem().getOrderedUnits() != null) {
                    unitsReceived = batch.getOrderedItem().getOrderedUnits();
                }
                if (batch.getOrderedItem().getOrder() != null) {
                    Order order = batch.getOrderedItem().getOrder();
                    poNum = order.getPurchaseOrderNum();
                    if (order.getSupplier() != null) {
                        supplierName = order.getSupplier().getName();
                    }
                }
            }

            String ref = (poNum != null && !poNum.isBlank()) ? poNum : "BATCH-" + batch.getBatchNum();
            String reason = supplierName != null
                    ? "PO Stock Received from " + supplierName
                    : "Purchase Order Stock Received";

            // Determine who confirmed/received this batch (full name)
            String receiverName = "Pharmacist / Receiving";
            if (batch.getBatchNum() != null) {
                List<AuditLog> auditLogs = auditLogRepository.filterAuditLogs(
                        facilityId, "Inventory", null, batch.getBatchNum());
                AuditLog receiptLog = auditLogs.stream()
                        .filter(a -> "BATCH_RECEIVED".equalsIgnoreCase(a.getAction()))
                        .findFirst()
                        .orElse(null);
                if (receiptLog != null) {
                    receiverName = resolveUserFullName(receiptLog.getUser(), receiptLog.getUserName(), receiverName);
                }
            }

            rawEntries.add(BinCardEntryDto.builder()
                    .id("BATCH-" + batch.getId())
                    .timestamp(batch.getReceivedAt() != null ? batch.getReceivedAt() : LocalDateTime.now())
                    .transactionType("BATCH_RECEIPT")
                    .typeLabel("PO Batch Receipt")
                    .referenceNumber(ref)
                    .batchNum(batch.getBatchNum())
                    .expiryDate(batch.getExpiryDate())
                    .quantityIn(unitsReceived)
                    .quantityOut(null)
                    .reason(reason)
                    .performedBy(receiverName)
                    .notes(batch.getNotes())
                    .build());
        }

        // 1b. Manual Adjustments: Additions & Deductions
        List<StockAdjustmentLog> adjustments = stockAdjustmentLogRepository
                .findByFacilityIdAndSkuIdOrderByCreatedAtAsc(facilityId, skuId);

        for (StockAdjustmentLog adj : adjustments) {
            boolean isAdd = adj.getAdjustmentType() == com.example.backend.dto.sku.SkuStockAdjustmentDto.Type.ADD;
            String type = isAdd ? "STOCK_ADDITION" : "STOCK_DEDUCTION";
            String typeLabel = isAdd ? "Stock Adjustment (+)" : "Stock Adjustment (-)";

            String batchNum = extractBatchNumFromNotes(adj.getNotes());
            LocalDate expiryDate = extractExpiryDateFromNotes(adj.getNotes());

            // If notes didn't contain batch info (e.g. past/existing deductions), correlate with SKU batches via FEFO
            if (batchNum == null && !batches.isEmpty()) {
                Batch matchedBatch = findMatchingBatchForAdjustment(batches, adj);
                if (matchedBatch != null) {
                    batchNum = matchedBatch.getBatchNum();
                    expiryDate = matchedBatch.getExpiryDate();
                }
            }

            String performerName = resolveUserFullName(adj.getUser(), null, "Pharmacist");

            rawEntries.add(BinCardEntryDto.builder()
                    .id("ADJ-" + adj.getId())
                    .timestamp(adj.getCreatedAt() != null ? adj.getCreatedAt() : LocalDateTime.now())
                    .transactionType(type)
                    .typeLabel(typeLabel)
                    .referenceNumber("ADJ-" + adj.getId())
                    .batchNum(batchNum)
                    .expiryDate(expiryDate)
                    .quantityIn(isAdd ? adj.getAdjustedAmount() : null)
                    .quantityOut(!isAdd ? adj.getAdjustedAmount() : null)
                    .reason(adj.getReason())
                    .performedBy(performerName)
                    .notes(adj.getNotes())
                    .build());
        }

        // 1c. Expired Batch Write-offs
        // Scan batches that have been expired and marked as deducted
        for (Batch batch : batches) {
            if (batch.getStatus() == Batch.Status.Expired && Boolean.TRUE.equals(batch.getSkuDeducted())) {
                LocalDateTime expireTime = batch.getReceivedAt();
                // Check if there is an exact audit log for BATCH_EXPIRED
                List<AuditLog> auditLogs = auditLogRepository.filterAuditLogs(
                        facilityId, "Inventory", null, batch.getBatchNum());

                AuditLog expiryLog = auditLogs.stream()
                        .filter(a -> "BATCH_EXPIRED".equalsIgnoreCase(a.getAction()))
                        .findFirst()
                        .orElse(null);

                Long deductedUnits = batch.getUnits() != null ? batch.getUnits() : 0L;
                if (expiryLog != null) {
                    expireTime = expiryLog.getCreatedAt();
                    deductedUnits = parseDeductedUnits(expiryLog.getDescription(), deductedUnits);
                }

                String expiredBy = resolveUserFullName(
                        expiryLog != null ? expiryLog.getUser() : null,
                        expiryLog != null ? expiryLog.getUserName() : null,
                        "System"
                );

                rawEntries.add(BinCardEntryDto.builder()
                        .id("EXP-" + batch.getId())
                        .timestamp(expireTime != null ? expireTime : LocalDateTime.now())
                        .transactionType("BATCH_EXPIRY")
                        .typeLabel("Batch Expiry Deduction")
                        .referenceNumber("EXP-" + batch.getBatchNum())
                        .batchNum(batch.getBatchNum())
                        .expiryDate(batch.getExpiryDate())
                        .quantityIn(null)
                        .quantityOut(deductedUnits)
                        .reason("Expired stock write-off")
                        .performedBy(expiredBy)
                        .notes(batch.getNotes())
                        .build());
            }
        }

        // 2. Sort all entries chronologically (oldest first) to compute running balances accurately
        rawEntries.sort(Comparator.comparing(BinCardEntryDto::getTimestamp));

        long runningBalance = 0;
        long totalReceived = 0;
        long totalDeducted = 0;
        long totalAdjusted = 0;
        long totalExpired = 0;

        for (BinCardEntryDto entry : rawEntries) {
            if (entry.getQuantityIn() != null && entry.getQuantityIn() > 0) {
                runningBalance += entry.getQuantityIn();
                if ("BATCH_RECEIPT".equals(entry.getTransactionType())) {
                    totalReceived += entry.getQuantityIn();
                } else if ("STOCK_ADDITION".equals(entry.getTransactionType())) {
                    totalAdjusted += entry.getQuantityIn();
                }
            }
            if (entry.getQuantityOut() != null && entry.getQuantityOut() > 0) {
                runningBalance -= entry.getQuantityOut();
                totalDeducted += entry.getQuantityOut();
                if ("BATCH_EXPIRY".equals(entry.getTransactionType())) {
                    totalExpired += entry.getQuantityOut();
                } else if ("STOCK_DEDUCTION".equals(entry.getTransactionType())) {
                    totalAdjusted -= entry.getQuantityOut();
                }
            }
            if (runningBalance < 0) {
                runningBalance = 0;
            }
            entry.setBalanceAfter(runningBalance);
        }

        // If no transactions exist but SKU has on-hand units, show initial balance entry
        if (rawEntries.isEmpty() && sku.getUnits() != null && sku.getUnits() > 0) {
            BinCardEntryDto initial = BinCardEntryDto.builder()
                    .id("INIT-" + sku.getId())
                    .timestamp(sku.getCreatedAt() != null ? sku.getCreatedAt() : LocalDateTime.now())
                    .transactionType("INITIAL_STOCK")
                    .typeLabel("Initial Stock on Record")
                    .referenceNumber("INIT-" + sku.getId())
                    .batchNum("-")
                    .expiryDate(null)
                    .quantityIn(sku.getUnits())
                    .quantityOut(null)
                    .balanceAfter(sku.getUnits())
                    .reason("Initial system balance")
                    .performedBy("System")
                    .notes("Initial inventory recorded")
                    .build();
            rawEntries.add(initial);
            totalReceived += sku.getUnits();
        }

        // 3. Apply optional date filters
        List<BinCardEntryDto> filteredEntries = rawEntries;
        if (startDate != null) {
            LocalDateTime startDateTime = startDate.atStartOfDay();
            filteredEntries = filteredEntries.stream()
                    .filter(e -> !e.getTimestamp().isBefore(startDateTime))
                    .collect(Collectors.toList());
        }
        if (endDate != null) {
            LocalDateTime endDateTime = endDate.atTime(LocalTime.MAX);
            filteredEntries = filteredEntries.stream()
                    .filter(e -> !e.getTimestamp().isAfter(endDateTime))
                    .collect(Collectors.toList());
        }

        // Sort descending (latest transaction on top) for optimal UI presentation
        List<BinCardEntryDto> displayEntries = new ArrayList<>(filteredEntries);
        displayEntries.sort((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()));

        // 4. Build Header
        String status = calculateStockStatus(sku);
        LibMedicine med = sku.getLibMedicine();

        BinCardHeaderDto header = new BinCardHeaderDto(
                sku.getId(),
                med != null ? med.getDrugCode() : "SKU-" + sku.getId(),
                sku.getName(),
                sku.getBrandName(),
                med != null ? med.getDrugDescription() : sku.getName(),
                sku.getDosageForm(),
                sku.getPackagingUnit(),
                facility.getId(),
                facility.getName(),
                sku.getUnits() != null ? sku.getUnits() : 0L,
                sku.getMinimumLevel() != null ? sku.getMinimumLevel() : 0L,
                sku.getReorderLevel() != null ? sku.getReorderLevel() : 0L,
                sku.getMaximumLevel() != null ? sku.getMaximumLevel() : 0L,
                status,
                totalReceived,
                totalDeducted,
                totalAdjusted,
                totalExpired,
                displayEntries.size()
        );

        return new BinCardResponseDto(header, displayEntries);
    }

    /**
     * Returns a summary list of all SKUs in a facility so admins can search and pick an SKU.
     */
    @Transactional(readOnly = true)
    public List<BinCardSkuSummaryDto> getSkusForBinCard(Long facilityId) {
        if (facilityId == null) {
            throw new IllegalArgumentException("Facility ID is required.");
        }
        List<Sku> skus = skuRepository.findByFacilityId(facilityId);

        return skus.stream()
                .map(sku -> {
                    String skuCode = sku.getLibMedicine() != null ? sku.getLibMedicine().getDrugCode() : "SKU-" + sku.getId();
                    return new BinCardSkuSummaryDto(
                            sku.getId(),
                            skuCode,
                            sku.getName(),
                            sku.getBrandName(),
                            sku.getDosageForm(),
                            sku.getPackagingUnit(),
                            sku.getUnits() != null ? sku.getUnits() : 0L,
                            sku.getMinimumLevel() != null ? sku.getMinimumLevel() : 0L,
                            sku.getReorderLevel() != null ? sku.getReorderLevel() : 0L,
                            sku.getMaximumLevel() != null ? sku.getMaximumLevel() : 0L,
                            calculateStockStatus(sku)
                    );
                })
                .sorted(Comparator.comparing(BinCardSkuSummaryDto::getName, String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());
    }

    private String calculateStockStatus(Sku sku) {
        long units = sku.getUnits() != null ? sku.getUnits() : 0L;
        long min = sku.getMinimumLevel() != null ? sku.getMinimumLevel() : 0L;
        long reorder = sku.getReorderLevel() != null ? sku.getReorderLevel() : 0L;
        Long max = sku.getMaximumLevel();

        if (units <= 0) {
            return "OUT_OF_STOCK";
        } else if (units <= min) {
            return "CRITICAL";
        } else if (units <= reorder) {
            return "LOW_STOCK";
        } else if (max != null && max > 0 && units > max) {
            return "OVERSTOCK";
        } else {
            return "NORMAL";
        }
    }

    private String extractBatchNumFromNotes(String notes) {
        if (notes == null) return null;
        if (notes.contains("(Batch: ")) {
            int start = notes.indexOf("(Batch: ") + 8;
            int end = notes.indexOf(")", start);
            if (end > start) {
                String sub = notes.substring(start, end);
                if (sub.contains(", Expiry:")) {
                    return sub.substring(0, sub.indexOf(", Expiry:")).trim();
                }
                return sub.trim();
            }
        }
        if (notes.contains("(Batches: ")) {
            int start = notes.indexOf("(Batches: ") + 10;
            int end = notes.indexOf(")", start);
            if (end > start) {
                return notes.substring(start, end).trim();
            }
        }
        if (notes.startsWith("Added to Batch ")) {
            return notes.substring("Added to Batch ".length()).trim();
        }
        return null;
    }

    private LocalDate extractExpiryDateFromNotes(String notes) {
        if (notes == null) return null;
        if (notes.contains("Expiry: ")) {
            int start = notes.indexOf("Expiry: ") + 8;
            int end = start + 10;
            if (notes.length() >= end) {
                try {
                    return LocalDate.parse(notes.substring(start, end).trim());
                } catch (Exception ignored) {}
            }
        }
        return null;
    }

    private Batch findMatchingBatchForAdjustment(List<Batch> batches, StockAdjustmentLog adj) {
        if (batches == null || batches.isEmpty()) return null;
        if (batches.size() == 1) {
            return batches.get(0);
        }
        LocalDateTime adjTime = adj.getCreatedAt() != null ? adj.getCreatedAt() : LocalDateTime.now();
        return batches.stream()
                .filter(b -> b.getReceivedAt() == null || !b.getReceivedAt().isAfter(adjTime))
                .filter(b -> b.getExpiryDate() != null)
                .min(Comparator.comparing(Batch::getExpiryDate))
                .orElse(batches.get(0));
    }

    private Long parseDeductedUnits(String description, Long fallback) {
        if (description != null) {
            Matcher m = DEDUCTED_UNITS_PATTERN.matcher(description);
            if (m.find()) {
                try {
                    return Long.parseLong(m.group(1));
                } catch (NumberFormatException ignored) {}
            }
        }
        return fallback;
    }

    /**
     * Resolves the user's full name, falling back to username, audit log userName, or default fallback.
     */
    private String resolveUserFullName(User user, String fallbackName, String defaultFallback) {
        if (user != null) {
            if (user.getName() != null && !user.getName().isBlank()) {
                return user.getName().trim();
            }
            if (user.getUsername() != null && !user.getUsername().isBlank()) {
                return user.getUsername().trim();
            }
        }
        if (fallbackName != null && !fallbackName.isBlank()) {
            return fallbackName.trim();
        }
        return defaultFallback;
    }
}

