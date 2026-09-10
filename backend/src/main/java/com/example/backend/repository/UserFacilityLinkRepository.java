package com.example.backend.repository;

import com.example.backend.entity.UserFacilityLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserFacilityLinkRepository extends JpaRepository<UserFacilityLink, Long> {

    Optional<UserFacilityLink> findByUserId(Long userId);

    void deleteByUserId(Long userId);
}
