package com.example.backend.config;

import com.example.backend.entity.Facility;
import com.example.backend.entity.Project;
import com.example.backend.entity.User;
import com.example.backend.repository.FacilityRepository;
import com.example.backend.repository.ProjectRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner initUsers(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            // 1. SuperAdmin
            createUserIfNotExists(
                    userRepository,
                    passwordEncoder,
                    "superadmin",
                    "superadmin123",
                    "Super Administrator",
                    "superadmin@exaktmed.com",
                    "09123456789",
                    User.Role.SuperAdmin
            );

            // 2. Admin
            createUserIfNotExists(
                    userRepository,
                    passwordEncoder,
                    "admin",
                    "admin123",
                    "System Administrator",
                    "admin@exaktmed.com",
                    "09123456788",
                    User.Role.Admin
            );

            // 3. Pharmacist
            createUserIfNotExists(
                    userRepository,
                    passwordEncoder,
                    "pharmacist",
                    "pharmacist123",
                    "Lead Pharmacist",
                    "pharmacist@exaktmed.com",
                    "09123456787",
                    User.Role.Pharmacist
            );

            // 4. Procurement
            createUserIfNotExists(
                    userRepository,
                    passwordEncoder,
                    "procurement",
                    "procurement123",
                    "Procurement Officer",
                    "procurement@exaktmed.com",
                    "09123456786",
                    User.Role.Procurement
            );
        };
    }

    private void createUserIfNotExists(UserRepository userRepository,
                                       PasswordEncoder passwordEncoder,
                                       String username,
                                       String password,
                                       String name,
                                       String email,
                                       String phone,
                                       User.Role role) {
        if (userRepository.findByUsername(username).isEmpty()) {
            User user = new User();
            user.setName(name);
            user.setUsername(username);
            user.setPassword(passwordEncoder.encode(password)); // BCrypt hash
            user.setEmail(email);
            user.setPhone(phone);
            user.setRole(role);
            user.setStatus(true);

            userRepository.save(user);
            System.out.println(">>> Initialized " + role + " user: username='" + username + "', password='" + password + "'");
        }
    }

    @Bean
    public CommandLineRunner initData(ProjectRepository projectRepository, FacilityRepository facilityRepository) {
        return args -> {
            // Seed Project if empty
            if (projectRepository.count() == 0) {
                Project project = new Project();
                project.setName("DOH Region 1");
                Project savedProject = projectRepository.saveAndFlush(project);
                savedProject.setProjectCode(String.format("PRJ-%03d", savedProject.getId()));
                projectRepository.save(savedProject);
                System.out.println(">>> Initialized Project: id=" + savedProject.getId() + ", name='" + savedProject.getName() + "', code='" + savedProject.getProjectCode() + "'");

                // Seed Facilities under this Project
                if (facilityRepository.count() == 0) {
                    createFacility(
                            facilityRepository,
                            savedProject,
                            "Ilocos Training and Regional Medical Center",
                            "Dr. Maria Santos",
                            "itrmc@doh.gov.ph",
                            "09123456789",
                            "San Fernando, La Union",
                            Facility.Status.Active
                    );

                    createFacility(
                            facilityRepository,
                            savedProject,
                            "Mariano Marcos Memorial Hospital and Medical Center",
                            "Dr. Juan Dela Cruz",
                            "mmmhmc@doh.gov.ph",
                            "09123456780",
                            "Batac, Ilocos Norte",
                            Facility.Status.Active
                    );

                    createFacility(
                            facilityRepository,
                            savedProject,
                            "Region 1 Medical Center",
                            "Dr. Jose Rizal",
                            "r1mc@doh.gov.ph",
                            "09123456781",
                            "Dagupan City, Pangasinan",
                            Facility.Status.Active
                    );
                }
            }
        };
    }

    private void createFacility(FacilityRepository facilityRepository,
                                Project project,
                                String name,
                                String contactPerson,
                                String email,
                                String phone,
                                String address,
                                Facility.Status status) {
        Facility facility = new Facility();
        facility.setProject(project);
        facility.setName(name);
        facility.setContactPerson(contactPerson);
        facility.setEmail(email);
        facility.setPhone(phone);
        facility.setAddress(address);
        facility.setStatus(status);

        Facility savedFacility = facilityRepository.saveAndFlush(facility);
        savedFacility.setFacilityCode(String.format("FAC-%03d", savedFacility.getId()));
        facilityRepository.save(savedFacility);
        System.out.println(">>> Initialized Facility: id=" + savedFacility.getId() + ", name='" + savedFacility.getName() + "', code='" + savedFacility.getFacilityCode() + "'");
    }
}
