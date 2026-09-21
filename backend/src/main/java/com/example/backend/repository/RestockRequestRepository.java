package com.example.backend.repository;

import com.example.backend.entity.RestockRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RestockRequestRepository extends JpaRepository<RestockRequest, Long> {
    List<RestockRequest> findByFacilityIdOrderByCreatedAtDesc(Long facilityId);
    List<RestockRequest> findByFacilityIdAndOrderIsNullOrderByCreatedAtDesc(Long facilityId);
    List<RestockRequest> findAllByOrderByCreatedAtDesc();
    List<RestockRequest> findByOrderIsNullOrderByCreatedAtDesc();
    List<RestockRequest> findBySkuId(Long skuId);
    Optional<RestockRequest> findByOrderId(Long orderId);
}
