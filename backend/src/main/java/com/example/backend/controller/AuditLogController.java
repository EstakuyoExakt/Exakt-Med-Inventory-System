package com.example.backend.controller;

import com.example.backend.dto.audit.AuditLogResponseDto;
import com.example.backend.service.AuditLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public ResponseEntity<List<AuditLogResponseDto>> getAuditLogs(
            @RequestParam Long facilityId,
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(auditLogService.getAuditLogs(facilityId, module, severity, search));
    }
}
