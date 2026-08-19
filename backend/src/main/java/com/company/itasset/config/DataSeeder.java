package com.company.itasset.config;

import com.company.itasset.entity.Asset;
import com.company.itasset.entity.Branch;
import com.company.itasset.entity.User;
import com.company.itasset.entity.enums.AssetStatus;
import com.company.itasset.entity.enums.Role;
import com.company.itasset.repository.AssetRepository;
import com.company.itasset.repository.BranchRepository;
import com.company.itasset.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final BranchRepository branchRepository;
    private final UserRepository userRepository;
    private final AssetRepository assetRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        // ── Always ensure the admin user exists ──────────────────────────────
        // This runs even when branches are already present (e.g. existing DB),
        // so a fresh Spring Boot restart always has a working admin account.
        fixRoleConstraint();
        ensureAdminExists();
        ensureTestUsersExist();

        if (branchRepository.count() > 0) {
            log.info("Data already seeded, skipping bulk seed.");
            return;
        }

        log.info("Seeding initial data...");

        // Branches
        Branch hq = branchRepository.save(Branch.builder()
                .name("Headquarters").location("123 Main St").city("New York")
                .country("USA").contactEmail("hq@company.com").build());

        Branch la = branchRepository.save(Branch.builder()
                .name("West Coast Office").location("456 Sunset Blvd").city("Los Angeles")
                .country("USA").contactEmail("la@company.com").build());

        Branch london = branchRepository.save(Branch.builder()
                .name("London Office").location("10 Baker St").city("London")
                .country("UK").contactEmail("london@company.com").build());

        // Re-attach admin to the HQ branch now that branches exist
        userRepository.findByEmail("admin@company.com").ifPresent(admin -> {
            admin.setBranch(hq);
            userRepository.save(admin);
        });

        // Employee users
        userRepository.save(User.builder()
                .name("John Smith").email("john@company.com")
                .password(passwordEncoder.encode("Admin@123"))
                .role(Role.EMPLOYEE).branch(hq).active(true)
                .employeeId("EMP002").build());

        userRepository.save(User.builder()
                .name("Sarah Johnson").email("sarah@company.com")
                .password(passwordEncoder.encode("Admin@123"))
                .role(Role.EMPLOYEE).branch(la).active(true)
                .employeeId("EMP003").build());

        // Assets - Laptops
        List<Asset> assets = List.of(
            Asset.builder()
                .name("HP EliteBook 840 G10").type("Laptop")
                .serialNumber("HP-ELT-840-001").manufacturer("HP")
                .model("EliteBook 840 G10").status(AssetStatus.AVAILABLE)
                .description("14\" FHD, Intel Core i7-1355U, 16GB RAM, 512GB SSD, Windows 11 Pro. Business-grade laptop with long battery life.")
                .purchasePrice(new BigDecimal("1299.99"))
                .purchaseDate(LocalDate.of(2024, 1, 15))
                .warrantyExpiry(LocalDate.of(2027, 1, 15))
                .branch(hq).build(),

            Asset.builder()
                .name("HP ProBook 450 G10").type("Laptop")
                .serialNumber("HP-PRO-450-001").manufacturer("HP")
                .model("ProBook 450 G10").status(AssetStatus.ASSIGNED)
                .description("15.6\" FHD, Intel Core i5-1335U, 8GB RAM, 256GB SSD, Windows 11 Pro. Reliable everyday business laptop.")
                .purchasePrice(new BigDecimal("899.99"))
                .purchaseDate(LocalDate.of(2024, 2, 10))
                .warrantyExpiry(LocalDate.of(2027, 2, 10))
                .branch(hq).build(),

            Asset.builder()
                .name("HP ZBook Fury 16 G10").type("Laptop")
                .serialNumber("HP-ZBK-FRY-001").manufacturer("HP")
                .model("ZBook Fury 16 G10").status(AssetStatus.AVAILABLE)
                .description("16\" 4K DreamColor, Intel Core i9-13950HX, 64GB RAM, 2TB SSD, NVIDIA RTX 4000. Professional mobile workstation.")
                .purchasePrice(new BigDecimal("3499.99"))
                .purchaseDate(LocalDate.of(2024, 3, 5))
                .warrantyExpiry(LocalDate.of(2027, 3, 5))
                .branch(la).build(),

            Asset.builder()
                .name("Dell Latitude 5540").type("Laptop")
                .serialNumber("DELL-LAT-5540-001").manufacturer("Dell")
                .model("Latitude 5540").status(AssetStatus.AVAILABLE)
                .description("15.6\" FHD, Intel Core i7-1365U, 16GB RAM, 512GB SSD. Enterprise-grade security with TPM 2.0.")
                .purchasePrice(new BigDecimal("1149.99"))
                .purchaseDate(LocalDate.of(2024, 1, 20))
                .warrantyExpiry(LocalDate.of(2027, 1, 20))
                .branch(london).build(),

            Asset.builder()
                .name("MacBook Pro 14\" M3").type("Laptop")
                .serialNumber("APPLE-MBP-M3-001").manufacturer("Apple")
                .model("MacBook Pro 14 M3").status(AssetStatus.ASSIGNED)
                .description("14\" Liquid Retina XDR, Apple M3 Pro chip, 18GB Unified Memory, 512GB SSD. Exceptional performance for creative work.")
                .purchasePrice(new BigDecimal("1999.99"))
                .purchaseDate(LocalDate.of(2024, 4, 1))
                .warrantyExpiry(LocalDate.of(2025, 4, 1))
                .branch(la).build(),

            // Monitors
            Asset.builder()
                .name("HP Z27k G3 4K Monitor").type("Monitor")
                .serialNumber("HP-MON-Z27K-001").manufacturer("HP")
                .model("Z27k G3").status(AssetStatus.AVAILABLE)
                .description("27\" 4K UHD IPS Display, USB-C, HDMI, DisplayPort. Factory color calibrated for professional use.")
                .purchasePrice(new BigDecimal("649.99"))
                .purchaseDate(LocalDate.of(2024, 2, 1))
                .warrantyExpiry(LocalDate.of(2027, 2, 1))
                .branch(hq).build(),

            Asset.builder()
                .name("Dell UltraSharp 27\" U2722D").type("Monitor")
                .serialNumber("DELL-MON-U27-001").manufacturer("Dell")
                .model("UltraSharp U2722D").status(AssetStatus.AVAILABLE)
                .description("27\" QHD IPS, USB-C Hub, 60W Power Delivery. ComfortView Plus certified for low blue light.")
                .purchasePrice(new BigDecimal("549.99"))
                .purchaseDate(LocalDate.of(2024, 3, 10))
                .warrantyExpiry(LocalDate.of(2027, 3, 10))
                .branch(hq).build(),

            // Desktops
            Asset.builder()
                .name("HP EliteDesk 800 G9").type("Desktop")
                .serialNumber("HP-DSK-800G9-001").manufacturer("HP")
                .model("EliteDesk 800 G9").status(AssetStatus.AVAILABLE)
                .description("Intel Core i7-12700, 32GB RAM, 512GB SSD + 2TB HDD, Windows 11 Pro. High-performance business desktop.")
                .purchasePrice(new BigDecimal("1499.99"))
                .purchaseDate(LocalDate.of(2023, 11, 15))
                .warrantyExpiry(LocalDate.of(2026, 11, 15))
                .branch(london).build(),

            // Printers
            Asset.builder()
                .name("HP LaserJet Pro M404dn").type("Printer")
                .serialNumber("HP-PRN-M404-001").manufacturer("HP")
                .model("LaserJet Pro M404dn").status(AssetStatus.AVAILABLE)
                .description("Monochrome laser printer, 38 ppm, Auto duplex, Ethernet. Ideal for high-volume office printing.")
                .purchasePrice(new BigDecimal("299.99"))
                .purchaseDate(LocalDate.of(2023, 9, 1))
                .warrantyExpiry(LocalDate.of(2024, 9, 1))
                .branch(hq).build(),

            Asset.builder()
                .name("HP Color LaserJet Pro M454dw").type("Printer")
                .serialNumber("HP-PRN-M454-001").manufacturer("HP")
                .model("Color LaserJet Pro M454dw").status(AssetStatus.AVAILABLE)
                .description("Color laser, 28 ppm, WiFi, Auto duplex, Mobile print. Professional color output for presentations.")
                .purchasePrice(new BigDecimal("449.99"))
                .purchaseDate(LocalDate.of(2023, 10, 5))
                .warrantyExpiry(LocalDate.of(2024, 10, 5))
                .branch(la).build(),

            // Keyboards & Mice
            Asset.builder()
                .name("Logitech MX Keys for Business").type("Keyboard")
                .serialNumber("LOG-KBD-MXB-001").manufacturer("Logitech")
                .model("MX Keys for Business").status(AssetStatus.AVAILABLE)
                .description("Wireless illuminated keyboard, Bluetooth multi-device, USB-C rechargeable. Quiet, precise typing.")
                .purchasePrice(new BigDecimal("129.99"))
                .purchaseDate(LocalDate.of(2024, 1, 5))
                .warrantyExpiry(LocalDate.of(2026, 1, 5))
                .branch(hq).build(),

            Asset.builder()
                .name("Logitech MX Master 3S").type("Mouse")
                .serialNumber("LOG-MOU-MX3S-001").manufacturer("Logitech")
                .model("MX Master 3S").status(AssetStatus.AVAILABLE)
                .description("Wireless ergonomic mouse, 8000 DPI, MagSpeed scrolling, USB-C. Works on any surface including glass.")
                .purchasePrice(new BigDecimal("99.99"))
                .purchaseDate(LocalDate.of(2024, 1, 5))
                .warrantyExpiry(LocalDate.of(2026, 1, 5))
                .branch(hq).build(),

            // Networking
            Asset.builder()
                .name("Cisco Catalyst 2960-X Switch").type("Network Equipment")
                .serialNumber("CISCO-SW-2960-001").manufacturer("Cisco")
                .model("Catalyst 2960-X-24TS-L").status(AssetStatus.AVAILABLE)
                .description("24-port Gigabit Ethernet switch, 4 SFP uplinks, Layer 2. Enterprise-grade for office networking.")
                .purchasePrice(new BigDecimal("2199.99"))
                .purchaseDate(LocalDate.of(2023, 6, 15))
                .warrantyExpiry(LocalDate.of(2026, 6, 15))
                .branch(hq).build(),

            // Tablets
            Asset.builder()
                .name("iPad Pro 12.9\" M2").type("Tablet")
                .serialNumber("APPLE-IPD-PRO-001").manufacturer("Apple")
                .model("iPad Pro 12.9 M2 WiFi+Cell").status(AssetStatus.MAINTENANCE)
                .description("12.9\" Liquid Retina XDR, Apple M2 chip, 256GB, 5G. Perfect for field work and presentations.")
                .purchasePrice(new BigDecimal("1299.99"))
                .purchaseDate(LocalDate.of(2023, 8, 20))
                .warrantyExpiry(LocalDate.of(2024, 8, 20))
                .branch(london).build(),

            // Server
            Asset.builder()
                .name("HP ProLiant DL380 Gen10").type("Server")
                .serialNumber("HP-SRV-DL380-001").manufacturer("HP")
                .model("ProLiant DL380 Gen10").status(AssetStatus.AVAILABLE)
                .description("2U rack server, 2x Intel Xeon Gold 5218, 128GB ECC RAM, 8x 1.2TB SAS. Ideal for virtualization workloads.")
                .purchasePrice(new BigDecimal("8999.99"))
                .purchaseDate(LocalDate.of(2023, 3, 10))
                .warrantyExpiry(LocalDate.of(2026, 3, 10))
                .branch(hq).build()
        );

        assetRepository.saveAll(assets);
        log.info("Seeded {} assets across {} branches.", assets.size(), 3);
    }

    /**
     * Idempotent — creates the admin account if it doesn't exist yet.
     * Runs on every startup so the app is always usable even when the DB
     * already has branch/asset data from a previous run.
     *
     * Credentials: admin@company.com / Admin@123
     */
    /**
     * Always ensures employee and manager test accounts exist.
     * Safe to call on every startup — skips accounts that already exist.
     * All passwords: Admin@123
     */
    /**
     * Drops and recreates the users_role_check constraint to include MANAGER.
     * Safe to run on every startup — silently skips if constraint doesn't exist.
     */
    private void fixRoleConstraint() {
        try {
            jdbcTemplate.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
            jdbcTemplate.execute(
                "ALTER TABLE users ADD CONSTRAINT users_role_check " +
                "CHECK (role IN ('ADMIN', 'MANAGER', 'EMPLOYEE'))");
            log.info("✅ users_role_check constraint updated to include MANAGER");
        } catch (Exception e) {
            log.warn("Could not update users_role_check constraint: {}", e.getMessage());
        }

        // Clean up any half-inserted test accounts from previous failed startup attempts
        try {
            jdbcTemplate.update(
                "DELETE FROM users WHERE email IN ('manager@company.com','employee@company.com') " +
                "AND id NOT IN (SELECT COALESCE(user_id,0) FROM asset_requests UNION SELECT COALESCE(resolved_by_user_id,0) FROM asset_requests)");
        } catch (Exception e) {
            log.warn("Could not clean up orphaned test accounts: {}", e.getMessage());
        }
    }

    private void ensureTestUsersExist() {
        Branch defaultBranch = branchRepository.findAll().stream().findFirst().orElse(null);

        // ── Admin 2 ───────────────────────────────────────────────────────────
        if (!userRepository.existsByEmail("admin2@company.com")) {
            userRepository.save(User.builder()
                    .name("Admin Two").email("admin2@company.com")
                    .password(passwordEncoder.encode("Admin2@123"))
                    .role(Role.ADMIN).branch(defaultBranch).active(true).build());
            log.info("✅ admin2@company.com / Admin2@123");
        }

        // ── Manager 1 ─────────────────────────────────────────────────────────
        User manager1 = userRepository.findByEmail("manager1@company.com").orElseGet(() -> {
            User m = userRepository.save(User.builder()
                    .name("Manager One").email("manager1@company.com")
                    .password(passwordEncoder.encode("Manager1@123"))
                    .role(Role.MANAGER).branch(defaultBranch).active(true).build());
            log.info("✅ manager1@company.com / Manager1@123");
            return m;
        });

        // ── Manager 2 ─────────────────────────────────────────────────────────
        User manager2 = userRepository.findByEmail("manager2@company.com").orElseGet(() -> {
            User m = userRepository.save(User.builder()
                    .name("Manager Two").email("manager2@company.com")
                    .password(passwordEncoder.encode("Manager2@123"))
                    .role(Role.MANAGER).branch(defaultBranch).active(true).build());
            log.info("✅ manager2@company.com / Manager2@123");
            return m;
        });

        // ── Employee 1 (under Manager 1) ──────────────────────────────────────
        if (!userRepository.existsByEmail("employee1@company.com")) {
            userRepository.save(User.builder()
                    .name("Employee One").email("employee1@company.com")
                    .password(passwordEncoder.encode("Employee1@123"))
                    .role(Role.EMPLOYEE).branch(defaultBranch).active(true)
                    .managerId(manager1.getId()).build());
            log.info("✅ employee1@company.com / Employee1@123");
        }

        // ── Employee 2 (under Manager 2) ──────────────────────────────────────
        if (!userRepository.existsByEmail("employee2@company.com")) {
            userRepository.save(User.builder()
                    .name("Employee Two").email("employee2@company.com")
                    .password(passwordEncoder.encode("Employee2@123"))
                    .role(Role.EMPLOYEE).branch(defaultBranch).active(true)
                    .managerId(manager2.getId()).build());
            log.info("✅ employee2@company.com / Employee2@123");
        }
    }

    private void ensureAdminExists() {
        Branch branch = branchRepository.findAll().stream().findFirst().orElse(null);
        String encoded = passwordEncoder.encode("Admin@123");

        userRepository.findByEmail("admin@company.com").ifPresentOrElse(admin -> {
            // Always reset password so it matches Admin@123 after any DB migration
            admin.setPassword(encoded);
            admin.setActive(true);
            admin.setRole(Role.ADMIN);
            userRepository.save(admin);
            log.info("✅ admin@company.com password reset to Admin@123");
        }, () -> {
            userRepository.save(User.builder()
                    .name("Admin One")
                    .email("admin@company.com")
                    .password(encoded)
                    .role(Role.ADMIN)
                    .branch(branch)
                    .active(true)
                    .build());
            log.info("✅ admin@company.com / Admin@123 created");
        });
    }
}
