package com.example.backend.config;

import com.example.backend.entity.User;
import com.example.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner initAdminUser(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            // Check if superadmin already exists to prevent duplicate entries
            if (userRepository.findByUsername("superadmin").isEmpty()) {
                User superAdmin = new User();
                superAdmin.setName("Super Administrator");
                superAdmin.setUsername("superadmin");
                superAdmin.setPassword(passwordEncoder.encode("superadmin123")); // Hashed with BCrypt!
                superAdmin.setEmail("superadmin@exaktmed.com");
                superAdmin.setPhone("09123456789");
                superAdmin.setRole(User.Role.SuperAdmin);
                superAdmin.setStatus(true);

                userRepository.save(superAdmin);
                System.out.println(">>> Default SuperAdmin user created: username='superadmin', password='superadmin123'");
            }
        };
    }
}
