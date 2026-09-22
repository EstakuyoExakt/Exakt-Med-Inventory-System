package com.example.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "batches")
@Getter
@Setter
public class Batch {

    public enum Status {
        Quarantined,
        Available
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "facilityId", nullable = false)
    private Facility facility;

    @OneToOne
    @JoinColumn(name = "orderedItemId")
    private OrderedItem orderedItem;

    @Column(nullable = false)
    private String batchNum;

    @Column(nullable = false)
    private Long units = 0L;

    @Column(nullable = false)
    private LocalDate manufactureDate;

    @Column(nullable = false)
    private LocalDate expiryDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.Available;

    private String notes;

    @Column(nullable = false)
    private LocalDateTime receivedAt;

    @PrePersist
    private void onReceive() {
        receivedAt = LocalDateTime.now();
    }

}
