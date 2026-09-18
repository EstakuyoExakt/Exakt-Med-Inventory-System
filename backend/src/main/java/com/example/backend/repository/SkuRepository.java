package com.example.backend.repository;

import com.example.backend.entity.Sku;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SkuRepository extends JpaRepository<Sku, Long> {
    List<Sku> findByFacilityId(Long facilityId);
    List<Sku> findByLibMedicineId(Long medicineId);

    @Query("SELECT s FROM Sku s LEFT JOIN s.libMedicine m WHERE " +
           "(:facilityId IS NULL OR s.facility.id = :facilityId) AND " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(s.brandName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.drugDescription) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<Sku> searchSkus(@Param("search") String search, @Param("facilityId") Long facilityId);

    @Query("SELECT s FROM Sku s LEFT JOIN s.libMedicine m WHERE " +
           "(:facilityId IS NULL OR s.facility.id = :facilityId) AND " +
           "(s.units <= s.reorderLevel) AND " +
           "NOT EXISTS (" +
           "    SELECT 1 FROM OrderedItem oi " +
           "    WHERE oi.sku = s " +
           "      AND oi.order.facility = s.facility" +
           "      AND oi.order.status IN (com.example.backend.entity.Order.Status.Pending, com.example.backend.entity.Order.Status.Approved)" +
           ") AND " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(s.brandName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.drugDescription) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<Sku> findReorderNeededSkus(@Param("facilityId") Long facilityId, @Param("search") String search);
}
