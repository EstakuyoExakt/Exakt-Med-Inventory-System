package com.example.backend.dto.user;

import com.example.backend.entity.User;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserResponseDto {
    private Long id;
    private String name;
    private String username;
    private String email;
    private String phone;
    private User.Role role;
    private Boolean status;
    private LocalDateTime createdAt;
    private String message;
}