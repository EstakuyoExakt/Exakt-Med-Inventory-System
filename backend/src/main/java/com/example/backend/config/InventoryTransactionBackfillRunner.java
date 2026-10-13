package com.example.backend.config;

import com.example.backend.entity.Batch;
import com.example.backend.entity.InventoryTransaction;
import com.example.backend.entity.Order;
import com.example.backend.entity.Sku;
import com.example.backend.repository.BatchRepository;
import com.example.backend.repository.InventoryTransactionRepository;
import com.example.backend.repository.SkuRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Component
public class InventoryTransactionBackfillRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(InventoryTransactionBackfillRunner.class);

    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final BatchRepository batchRepository;
    private final SkuRepository skuRepository;

    public InventoryTransactionBackfillRunner(InventoryTransactionRepository inventoryTransactionRepository,
                                             BatchRepository batchRepository,
                                             SkuRepository skuRepository) {
        this.inventoryTransactionRepository = inventoryTransactionRepository;
        this.batchRepository = batchRepository;
        this.skuRepository = skuRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        long currentCount = inventoryTransactionRepository.count();
        if (currentCount > 0) {
            log.info("Inventory transactions table already contains {} records. Skipping backfill.", currentCount);
            return;
        }

        log.info("Starting one-time backfill of inventory_transactions from existing batches and SKU records...");

        List<Batch> allBatches = batchRepository.findAll();
        // Sort chronologically
        allBatches.sort(Comparator.comparing(b -> b.getReceivedAt() != null ? b.getReceivedAt() : LocalDateTime.MIN));

        Map<Long, Long> runningBalances = new HashMap<>();
        int backfilledCount = 0;

        for (Batch b : allBatches) {
            Sku sku = b.getOrderedItem() != null ? b.getOrderedItem().getSku() : null;
            if (sku == null || b.getFacility() == null) {
                continue;
            }

            long prevBal = runningBalances.getOrDefault(sku.getId(), 0L);
            long units = b.getUnits() != null ? b.getUnits() : 0L;
            if (units <= 0 && b.getStatus() != Batch.Status.Expired) {
                continue;
            }

            String ref = "BATCH-" + b.getBatchNum();
            String reason = "Historical Batch Receipt";
            if (b.getOrderedItem() != null && b.getOrderedItem().getOrder() != null) {
                Order order = b.getOrderedItem().getOrder();
                if (order.getPurchaseOrderNum() != null && !order.getPurchaseOrderNum().isBlank()) {
                    ref = order.getPurchaseOrderNum();
                }
                if (order.getSupplier() != null) {
                    reason = "PO Stock Received from " + order.getSupplier().getName();
                }
            }

            long newBal = prevBal + units;
            runningBalances.put(sku.getId(), newBal);

            LocalDateTime txTime = b.getReceivedAt() != null ? b.getReceivedAt() : LocalDateTime.now();

            InventoryTransaction receiptTx = InventoryTransaction.builder()
                    .facility(b.getFacility())
                    .sku(sku)
                    .batch(b)
                    .transactionType(InventoryTransaction.Type.RECEIPT)
                    .referenceNumber(ref)
                    .batchNum(b.getBatchNum())
                    .expiryDate(b.getExpiryDate())
                    .quantityIn(units)
                    .quantityOut(null)
                    .previousBalance(prevBal)
                    .balanceAfter(newBal)
                    .reason(reason)
                    .notes(b.getNotes())
                    .createdAt(txTime)
                    .build();

            inventoryTransactionRepository.save(receiptTx);
            backfilledCount++;

            // If batch was marked as expired and SKU units were deducted
            if (b.getStatus() == Batch.Status.Expired && Boolean.TRUE.equals(b.getSkuDeducted()) && units > 0) {
                long balBeforeExp = runningBalances.getOrDefault(sku.getId(), newBal);
                long balAfterExp = Math.max(0L, balBeforeExp - units);
                runningBalances.put(sku.getId(), balAfterExp);

                InventoryTransaction expTx = InventoryTransaction.builder()
                        .facility(b.getFacility())
                        .sku(sku)
                        .batch(b)
                        .transactionType(InventoryTransaction.Type.EXPIRY_DEDUCTION)
                        .referenceNumber("EXP-" + b.getBatchNum())
                        .batchNum(b.getBatchNum())
                        .expiryDate(b.getExpiryDate())
                        .quantityIn(null)
                        .quantityOut(units)
                        .previousBalance(balBeforeExp)
                        .balanceAfter(balAfterExp)
                        .reason("Expired stock write-off")
                        .notes(b.getNotes())
                        .createdAt(b.getExpiryDate() != null ? b.getExpiryDate().atStartOfDay() : txTime.plusDays(30))
                        .build();

                inventoryTransactionRepository.save(expTx);
                backfilledCount++;
            }
        }

        // Backfill any SKUs with current units that had no batches recorded
        List<Sku> allSkus = skuRepository.findAll();
        for (Sku s : allSkus) {
            if (!runningBalances.containsKey(s.getId()) && s.getUnits() != null && s.getUnits() > 0 && s.getFacility() != null) {
                InventoryTransaction initTx = InventoryTransaction.builder()
                        .facility(s.getFacility())
                        .sku(s)
                        .transactionType(InventoryTransaction.Type.INITIAL_STOCK)
                        .referenceNumber("INIT-" + s.getId())
                        .quantityIn(s.getUnits())
                        .quantityOut(null)
                        .previousBalance(0L)
                        .balanceAfter(s.getUnits())
                        .reason("Initial system balance on record")
                        .createdAt(s.getCreatedAt() != null ? s.getCreatedAt() : LocalDateTime.now())
                        .build();

                inventoryTransactionRepository.save(initTx);
                backfilledCount++;
            }
        }

        log.info("Backfill complete! Generated {} historical inventory_transactions records.", backfilledCount);
    }
}
