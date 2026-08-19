package com.company.itasset.ai;

import com.company.itasset.entity.Asset;
import com.company.itasset.entity.enums.AssetStatus;
import com.company.itasset.repository.AssetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * MCP (Model Context Protocol) — Tool Handler
 *
 * MCP defines a structured contract between the AI model and your system.
 * Instead of the AI having free-form access, each action is a named "tool"
 * with defined inputs and outputs. Claude reads the tool definitions from
 * the system prompt and decides which tool to call based on the question.
 *
 * Tools available in this ITAM system:
 *   - search_by_type     → find assets by type (laptop, monitor, etc.)
 *   - search_by_status   → find assets by status
 *   - get_asset_by_id    → look up a specific asset
 *   - compliance_check   → list all compliance risks
 *   - asset_summary      → total counts per status
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class McpToolHandler {

    private final AssetRepository assetRepository;

    /**
     * Returns MCP tool definitions injected into Claude's system prompt.
     * Claude reads this and decides which tool to call for each question.
     */
    public String getToolDefinitions() {
        return """
                === AVAILABLE TOOLS (MCP — Model Context Protocol) ===
                You may reference these tools in your reasoning. Results are already included
                in the context above, but you can describe which tool would retrieve specific data:

                • search_by_type(type: string)
                  → Returns all assets matching the given type (e.g. "Laptop", "Monitor")

                • search_by_status(status: AVAILABLE | ASSIGNED | MAINTENANCE | RETIRED)
                  → Returns all assets with the given status

                • get_asset_by_id(id: number)
                  → Returns details for a single asset by its ID

                • compliance_check()
                  → Lists all assets held by inactive/deactivated users (compliance risk)

                • asset_summary()
                  → Returns total counts of assets grouped by status and type

                """;
    }

    /** Execute a tool call by name — routes to the correct repository query. */
    @Transactional(readOnly = true)
    public String executeTool(String toolName, String param) {
        long start = System.currentTimeMillis();
        String result;

        try {
            result = switch (toolName) {
                case "search_by_type"   -> searchByType(param);
                case "search_by_status" -> searchByStatus(param);
                case "get_asset_by_id"  -> getById(param);
                case "compliance_check" -> complianceCheck();
                case "asset_summary"    -> assetSummary();
                default -> "Unknown tool: " + toolName;
            };
        } catch (Exception e) {
            result = "Tool error [" + toolName + "]: " + e.getMessage();
            log.error("MCP tool error — tool={} param={}: {}", toolName, param, e.getMessage());
        }

        log.info("MCP tool executed — tool={} param={} latency={}ms",
                toolName, param, System.currentTimeMillis() - start);
        return result;
    }

    // ── Tool implementations ──────────────────────────────────────────────────

    private String searchByType(String type) {
        List<Asset> assets = assetRepository.findAll().stream()
                .filter(a -> a.getType() != null &&
                             a.getType().equalsIgnoreCase(type))
                .collect(Collectors.toList());
        if (assets.isEmpty()) return "No assets found with type: " + type;
        return assets.stream()
                .map(a -> String.format("[%d] %s — %s | %s",
                        a.getId(), a.getName(), a.getStatus(),
                        a.getAssignedTo() != null ? a.getAssignedTo().getName() : "Unassigned"))
                .collect(Collectors.joining("\n"));
    }

    private String searchByStatus(String statusStr) {
        try {
            AssetStatus status = AssetStatus.valueOf(statusStr.toUpperCase());
            List<Asset> assets = assetRepository.findAll().stream()
                    .filter(a -> a.getStatus() == status)
                    .collect(Collectors.toList());
            if (assets.isEmpty()) return "No assets with status: " + status;
            return assets.stream()
                    .map(a -> String.format("[%d] %s (%s)", a.getId(), a.getName(), a.getType()))
                    .collect(Collectors.joining("\n"));
        } catch (IllegalArgumentException e) {
            return "Invalid status. Use: AVAILABLE, ASSIGNED, MAINTENANCE, or RETIRED";
        }
    }

    private String getById(String idStr) {
        try {
            Long id = Long.parseLong(idStr);
            return assetRepository.findById(id)
                    .map(a -> String.format(
                            "Asset [%d]: %s | Type: %s | Status: %s | Model: %s | Serial: %s | Branch: %s | Assigned to: %s",
                            a.getId(), a.getName(), a.getType(), a.getStatus(),
                            a.getModel(), a.getSerialNumber(),
                            a.getBranch() != null ? a.getBranch().getName() : "N/A",
                            a.getAssignedTo() != null ? a.getAssignedTo().getName() : "Unassigned"))
                    .orElse("Asset not found with ID: " + id);
        } catch (NumberFormatException e) {
            return "Invalid ID format: " + idStr;
        }
    }

    private String complianceCheck() {
        List<Asset> risks = assetRepository.findAll().stream()
                .filter(a -> a.getStatus() == AssetStatus.ASSIGNED
                          && a.getAssignedTo() != null
                          && !a.getAssignedTo().isActive())
                .collect(Collectors.toList());
        if (risks.isEmpty()) return "Compliance check passed — no risks found.";
        return "COMPLIANCE RISKS:\n" + risks.stream()
                .map(a -> String.format("  ⚠ [%d] %s held by inactive user: %s (%s)",
                        a.getId(), a.getName(),
                        a.getAssignedTo().getName(), a.getAssignedTo().getEmail()))
                .collect(Collectors.joining("\n"));
    }

    private String assetSummary() {
        long available   = assetRepository.countByStatus(AssetStatus.AVAILABLE);
        long assigned    = assetRepository.countByStatus(AssetStatus.ASSIGNED);
        long maintenance = assetRepository.countByStatus(AssetStatus.MAINTENANCE);
        long retired     = assetRepository.countByStatus(AssetStatus.RETIRED);
        return String.format("Summary: Available=%d | Assigned=%d | Maintenance=%d | Retired=%d",
                available, assigned, maintenance, retired);
    }
}
