package com.example.backend.repository;

import com.example.backend.entity.UserProjectLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserProjectLinkRepository extends JpaRepository<UserProjectLink, Long> {

    Optional<UserProjectLink> findByUserIdAndProjectId(Long userId, Long projectId);

    boolean existsByUserIdAndProjectId(Long userId, Long projectId);

    void deleteByUserIdAndProjectId(Long userId, Long projectId);

    List<UserProjectLink> findByUserId(Long userId);

    List<UserProjectLink> findByProjectId(Long projectId);
}
