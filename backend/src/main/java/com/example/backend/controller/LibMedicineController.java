package com.example.backend.controller;

import com.example.backend.dto.medicine.LibMedicineResponseDto;
import com.example.backend.service.LibMedicineService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/medicines", "/api/lib-medicines"})
public class LibMedicineController {

    private final LibMedicineService libMedicineService;

    public LibMedicineController(LibMedicineService libMedicineService) {
        this.libMedicineService = libMedicineService;
    }

    // 1. GET ALL / SEARCH MEDICINES (Paginated for tables or infinite scroll)
    @GetMapping
    public ResponseEntity<Page<LibMedicineResponseDto>> searchMedicines(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "drugDescription") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return ResponseEntity.ok(libMedicineService.searchMedicines(search, pageable));
    }

    // 2. DROPDOWN & AUTOCOMPLETE (Fast limited list for frontend dropdown selects)
    @GetMapping({"/dropdown", "/search"})
    public ResponseEntity<List<LibMedicineResponseDto>> getDropdownMedicines(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(libMedicineService.getDropdownMedicines(search, limit));
    }

    // 3. GET MEDICINE BY ID
    @GetMapping("/{id}")
    public ResponseEntity<LibMedicineResponseDto> getMedicineById(@PathVariable Long id) {
        return ResponseEntity.ok(libMedicineService.getMedicineById(id));
    }

    // 4. GET MEDICINE BY DRUG CODE
    @GetMapping("/code/{drugCode}")
    public ResponseEntity<LibMedicineResponseDto> getMedicineByDrugCode(@PathVariable String drugCode) {
        return ResponseEntity.ok(libMedicineService.getMedicineByDrugCode(drugCode));
    }
}
