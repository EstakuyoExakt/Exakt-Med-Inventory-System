package com.example.backend.repository;

import com.example.backend.entity.Batch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BatchRepository extends JpaRepository<Batch, Long> {

    List<Batch> findByFacilityIdOrderByReceivedAtDesc(Long facilityId);

    List<Batch> findByFacilityIdAndStatusOrderByReceivedAtDesc(Long facilityId, Batch.Status status);

    Optional<Batch> findByBatchNumAndFacilityId(String batchNum, Long facilityId);

    boolean existsByBatchNumAndFacilityId(String batchNum, Long facilityId);

    Optional<Batch> findByOrderedItemId(Long orderedItemId);

    boolean existsByOrderedItemId(Long orderedItemId);

    List<Batch> findByStatusAndExpiryDateLessThanEqual(Batch.Status status, java.time.LocalDate date);

    @Query("SELECT b FROM Batch b WHERE b.orderedItem.sku.id = :skuId " +
           "AND b.facility.id = :facilityId " +
           "AND b.status = :status " +
           "AND b.units > 0 " +
           "ORDER BY b.expiryDate ASC, b.id ASC")
    List<Batch> findAvailableBatchesForSkuFEFO(
            @Param("skuId") Long skuId,
            @Param("facilityId") Long facilityId,
            @Param("status") Batch.Status status);
}

