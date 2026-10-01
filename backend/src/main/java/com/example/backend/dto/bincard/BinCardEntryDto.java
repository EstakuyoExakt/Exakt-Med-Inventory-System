package com.example.backend.dto.bincard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BinCardEntryDto {

    private String id;
    private LocalDateTime timestamp;
    private String transactionType; // BATCH_RECEIPT, STOCK_ADDITION, STOCK_DEDUCTION, BATCH_EXPIRY
    private String typeLabel;       // e.g. "PO Batch Receipt", "Stock Adjustment (+)", "Stock Adjustment (-)", "Batch Expiry Deduction"
    private String referenceNumber; // e.g. PO number, Batch number, or Adjustment ID
    private String batchNum;
    private LocalDate expiryDate;

    // Movement quantities
    private Long quantityIn;        // Units received or added
    private Long quantityOut;       // Units dispensed or deducted
    private Long balanceAfter;      // Running on-hand balance after this transaction

    // Context & Audit
    private String reason;
    private String performedBy;
    private String notes;
}
