package com.example.backend.entity;

import com.example.backend.dto.sku.SkuStockAdjustmentDto.Type;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "stock_adjustment_logs")
@Getter
@Setter
@NoArgsConstructor
public class StockAdjustmentLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skuId", nullable = false)
    private Sku sku;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "facilityId", nullable = false)
    private Facility facility;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userId")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "adjustmentType", nullable = false)
    private Type adjustmentType;

    @Column(name = "previousUnits", nullable = false)
    private Long previousUnits;

    @Column(name = "adjustedAmount", nullable = false)
    private Long adjustedAmount;

    @Column(name = "deltaUnits", nullable = false)
    private Long deltaUnits;

    @Column(name = "newUnits", nullable = false)
    private Long newUnits;

    @Column(nullable = false)
    private String reason;

    @Column(length = 500)
    private String notes;

    @Column(name = "createdAt", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
