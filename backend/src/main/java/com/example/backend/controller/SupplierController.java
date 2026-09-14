package com.example.backend.controller;

import com.example.backend.dto.supplier.SupplierRequestDto;
import com.example.backend.dto.supplier.SupplierResponseDto;
import com.example.backend.service.SupplierService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {

    private final SupplierService supplierService;

    public SupplierController(SupplierService supplierService) {
        this.supplierService = supplierService;
    }

    // 1. CREATE SUPPLIER
    @PostMapping
    public ResponseEntity<SupplierResponseDto> createSupplier(@Valid @RequestBody SupplierRequestDto request) {
        SupplierResponseDto response = supplierService.createSupplier(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    // 2. GET ALL SUPPLIERS (Optionally filtered by facilityId)
    @GetMapping
    public ResponseEntity<List<SupplierResponseDto>> getAllSuppliers(
            @RequestParam(required = false) Long facilityId) {
        return ResponseEntity.ok(supplierService.getAllSuppliers(facilityId));
    }

    // 3. GET SUPPLIER BY ID
    @GetMapping("/{id}")
    public ResponseEntity<SupplierResponseDto> getSupplierById(@PathVariable Long id) {
        return ResponseEntity.ok(supplierService.getSupplierById(id));
    }

    // 4. UPDATE SUPPLIER
    @PutMapping("/{id}")
    public ResponseEntity<SupplierResponseDto> updateSupplier(
            @PathVariable Long id,
            @Valid @RequestBody SupplierRequestDto request) {
        return ResponseEntity.ok(supplierService.updateSupplier(id, request));
    }

    // 5. DELETE SUPPLIER
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteSupplier(@PathVariable Long id) {
        supplierService.deleteSupplier(id);
        return ResponseEntity.ok("Supplier deleted successfully");
    }

}
