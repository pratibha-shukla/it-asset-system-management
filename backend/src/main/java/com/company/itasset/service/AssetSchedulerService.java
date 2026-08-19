package com.company.itasset.service;

import com.company.itasset.entity.Asset;
import com.company.itasset.entity.User;
import com.company.itasset.entity.enums.AssetStatus;
import com.company.itasset.repository.AssetRepository;
import com.company.itasset.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled background jobs.
 *
 * @EnableScheduling is already on ItAssetApplication — no extra setup needed.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AssetSchedulerService {

    private final UserRepository  userRepository;
    private final AssetRepository assetRepository;
    private final AuditLogService auditLogService;
    private final KafkaTemplate<String, String> kafkaTemplate;

    /**
     * Every day at 02:00 AM — release assets from deactivated/terminated employees.
     * Cron: second minute hour day month weekday
     */
    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void releaseAssetsFromTerminatedEmployees() {
        log.info("=== Nightly Asset Release Job START — {} ===", LocalDateTime.now());

        List<User> terminated = userRepository.findAll().stream()
                .filter(u -> !u.isActive())
                .toList();

        int totalReleased = 0;

        for (User user : terminated) {
            List<Asset> assigned = assetRepository.findAll().stream()
                    .filter(a -> a.getAssignedTo() != null
                              && a.getAssignedTo().getId().equals(user.getId())
                              && a.getStatus() == AssetStatus.ASSIGNED)
                    .toList();

            if (assigned.isEmpty()) continue;

            log.info("  User '{}' — releasing {} asset(s)", user.getName(), assigned.size());

            for (Asset asset : assigned) {
                asset.setStatus(AssetStatus.AVAILABLE);
                asset.setAssignedTo(null);
                assetRepository.save(asset);

                auditLogService.log("SCHEDULED_UNASSIGN", "Asset", asset.getId(),
                        "SYSTEM_SCHEDULER",
                        String.format("Auto-released '%s' (serial: %s) — employee '%s' deactivated",
                                asset.getName(), asset.getSerialNumber(), user.getName()));

                kafkaTemplate.send("asset-events", String.format(
                        "{\"type\":\"ASSET_RELEASED\",\"assetId\":%d,\"assetName\":\"%s\",\"releasedFrom\":\"%s\"}",
                        asset.getId(), asset.getName(), user.getName()));

                totalReleased++;
            }
        }

        log.info("=== Nightly Asset Release Job END — {} asset(s) released ===", totalReleased);
    }

    /**
     * Every Sunday at 08:00 AM — flag assets with warranty expiring within 90 days.
     */
    @Scheduled(cron = "0 0 8 * * SUN")
    @Transactional
    public void checkWarrantyExpiry() {
        log.info("=== Weekly Warranty Expiry Check START ===");

        LocalDate today    = LocalDate.now();
        LocalDate in90Days = today.plusDays(90);

        List<Asset> expiringSoon = assetRepository.findAll().stream()
                .filter(a -> a.getWarrantyExpiry() != null
                          && !a.getWarrantyExpiry().isBefore(today)
                          && !a.getWarrantyExpiry().isAfter(in90Days)
                          && a.getStatus() != AssetStatus.RETIRED)
                .toList();

        List<Asset> alreadyExpired = assetRepository.findAll().stream()
                .filter(a -> a.getWarrantyExpiry() != null
                          && a.getWarrantyExpiry().isBefore(today)
                          && a.getStatus() != AssetStatus.RETIRED)
                .toList();

        log.info("Warranty check: {} expiring in 90 days, {} already expired",
                expiringSoon.size(), alreadyExpired.size());

        auditLogService.log("WARRANTY_CHECK", null, null,
                "SYSTEM_SCHEDULER",
                String.format("Weekly check: %d expiring in 90 days, %d already expired",
                        expiringSoon.size(), alreadyExpired.size()));

        kafkaTemplate.send("asset-events", String.format(
                "{\"type\":\"WARRANTY_REPORT\",\"expiringSoon\":%d,\"alreadyExpired\":%d}",
                expiringSoon.size(), alreadyExpired.size()));

        log.info("=== Weekly Warranty Expiry Check END ===");
    }
}
