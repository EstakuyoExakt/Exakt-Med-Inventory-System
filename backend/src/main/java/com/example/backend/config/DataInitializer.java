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
    public CommandLineRunner initData(ProjectRepository projectRepository,
                                      FacilityRepository facilityRepository,
                                      com.example.backend.repository.SupplierRepository supplierRepository) {
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

            // Seed Suppliers if empty
            if (supplierRepository.count() == 0 && facilityRepository.count() > 0) {
                java.util.List<Facility> allFacilities = facilityRepository.findAll();
                Facility fac1 = allFacilities.get(0);
                Facility fac2 = allFacilities.size() > 1 ? allFacilities.get(1) : fac1;

                createSupplier(supplierRepository, fac1, "Unilab Pharmaceuticals Inc.", "Dr. Roberto Tan", "orders@unilab.com.ph", "+63 2 8858 1000", "66 United Street, Mandaluyong City, Metro Manila", "Net 30", com.example.backend.entity.Supplier.Status.Active);
                createSupplier(supplierRepository, fac1, "Zuellig Pharma Corporation", "Ma. Elena Alvarez", "supply.ph@zuelligpharma.com", "+63 2 8988 2000", "Km. 14 West Service Road, Parañaque City, Metro Manila", "Net 60", com.example.backend.entity.Supplier.Status.Active);
                createSupplier(supplierRepository, fac1, "Metro Drug Distribution Inc.", "Carlos Miguel Ocampo", "carlos.ocampo@metrodrug.com.ph", "+63 2 8837 0123", "Mañalac Avenue, Bagumbayan, Taguig City", "Net 30", com.example.backend.entity.Supplier.Status.Active);
                createSupplier(supplierRepository, fac2, "Medline Medical Supplies Ltd.", "Theresa Ramos", "sales@medlinesupplies.ph", "+63 2 8712 3456", "BGC Corporate Center, Taguig City, Metro Manila", "Net 15", com.example.backend.entity.Supplier.Status.Active);
                createSupplier(supplierRepository, fac2, "Novartis Healthcare Phils.", "Dr. Patrick Del Rosario", "pharma.ph@novartis.com", "+63 2 8867 7000", "Ayala Avenue, Makati City, Metro Manila", "Net 45", com.example.backend.entity.Supplier.Status.Active);
                createSupplier(supplierRepository, fac2, "Dynasty Pharmaceuticals", "Arthur David Sy", "info@dynastypharma.com", "+63 2 8241 6789", "Binondo, Manila, Metro Manila", "COD", com.example.backend.entity.Supplier.Status.Inactive);
            }
        };
    }

    private void createSupplier(com.example.backend.repository.SupplierRepository supplierRepository,
                                Facility facility,
                                String name,
                                String contactPerson,
                                String email,
                                String phone,
                                String address,
                                String paymentTerms,
                                com.example.backend.entity.Supplier.Status status) {
        com.example.backend.entity.Supplier s = new com.example.backend.entity.Supplier();
        s.setFacility(facility);
        s.setName(name);
        s.setContactPerson(contactPerson);
        s.setEmail(email);
        s.setPhone(phone);
        s.setAddress(address);
        s.setPaymentTerms(paymentTerms);
        s.setStatus(status);
        supplierRepository.save(s);
        System.out.println(">>> Initialized Supplier: name='" + name + "' for facility=" + facility.getName());
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
