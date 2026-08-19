package com.company.itasset.service;

import com.company.itasset.entity.AuditLog;
import com.company.itasset.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String action, String entityType, Long entityId,
                    String performedBy, String details) {
        auditLogRepository.save(AuditLog.builder()
                .action(action).entityType(entityType).entityId(entityId)
                .performedBy(performedBy).details(details).build());
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getAll(int page, int size) {
        return auditLogRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp")));
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getByEntity(String entityType, Long entityId, int page, int size) {
        return auditLogRepository.findByEntityTypeAndEntityId(
                entityType, entityId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp")));
    }
}
