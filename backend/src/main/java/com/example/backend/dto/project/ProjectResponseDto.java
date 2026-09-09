package com.example.backend.dto.project;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProjectResponseDto {
    private Long id;
    private String name;
    private String projectCode;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String message;
}
