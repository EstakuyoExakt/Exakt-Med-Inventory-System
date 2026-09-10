package com.example.backend.dto.assign;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ProjectAssignRequestDto {

    @NotEmpty(message = "Please provide at least one admin user ID")
    private List<Long> userIds;

}
