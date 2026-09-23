package com.example.backend.repository;

import com.example.backend.entity.StockAdjustmentLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockAdjustmentLogRepository extends JpaRepository<StockAdjustmentLog, Long> {

    List<StockAdjustmentLog> findBySkuIdOrderByCreatedAtDesc(Long skuId);

    List<StockAdjustmentLog> findByFacilityIdOrderByCreatedAtDesc(Long facilityId);
}
