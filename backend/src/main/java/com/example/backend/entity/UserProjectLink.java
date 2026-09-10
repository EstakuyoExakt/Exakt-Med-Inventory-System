package com.example.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "user_project_links",
    uniqueConstraints = {
            // Prevents linking the exact same user to the same project
            @UniqueConstraint(columnNames = {"user_id", "project_id"})
    }
)
@Getter
@Setter
public class UserProjectLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userId", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "projectId", nullable = false)
    private Project project;

    @Column(updatable = false)
    private LocalDateTime assignedAt;

    @PrePersist
    private void onAssign() {
        assignedAt = LocalDateTime.now();
    }

}
