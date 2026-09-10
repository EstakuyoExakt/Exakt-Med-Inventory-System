package com.example.backend.dto.facility;

import com.example.backend.entity.Facility;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FacilityResponseDto {

    private Long id;
    private Long projectId;
    private String projectName;
    private String facilityCode;
    private String name;
    private String type;
    private String contactPerson;
    private String email;
    private String phone;
    private String address;
    private Facility.Status status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String message;

}
