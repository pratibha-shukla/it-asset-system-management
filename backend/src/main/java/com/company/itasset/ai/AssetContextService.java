package com.company.itasset.ai;

import com.company.itasset.entity.Asset;
import com.company.itasset.entity.enums.AssetStatus;
import com.company.itasset.repository.AssetRepository;
import com.company.itasset.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * RAG Context Builder — grounding Claude in real ITAM data.
 *
 * This is the core of the RAG (Retrieval-Augmented Generation) pipeline.
 * Instead of Claude guessing, it only answers from data fetched here:
 *
 *   1. Fetch live asset records from PostgreSQL via JPA
 *   2. Format into a plain-text context block
 *   3. Inject into Claude's system prompt (see ChatbotService)
 *   4. Claude answers ONLY from this data → grounded, accurate responses
 *
 * Vector Database note:
 *   For semantic similarity search (find "laptop" when user types "computer"),
 *   embeddings can be stored in pgvector (PostgreSQL extension) or ChromaDB.
 *   Current implementation uses structured JPA queries which covers 90% of
 *   ITAM use cases without the overhead of a separate vector store.
 */
@Service
@RequiredArgsConstructor
public class AssetContextService {

    private final AssetRepository assetRepository;
    private final UserRepository  userRepository;

    /**
     * Builds a complete context block for the AI from live database data.
     * Called once per chat request — data is always fresh, never stale.
     *
     * @Transactional is required because we access lazy-loaded associations
     * (assignedTo, branch) on Asset entities after the initial findAll() call.
     * Without a transaction, JPA closes the session after the query and
     * accessing lazy fields throws LazyInitializationException.
     */
    @Transactional(readOnly = true)
    public String buildContext() {
        StringBuilder ctx = new StringBuilder();
        ctx.append(buildAssetSummary());
        ctx.append(buildAssignedAssets());
        ctx.append(buildAvailableAssets());
        ctx.append(buildInactiveUserAssets());
        return ctx.toString();
    }

    /** Overall asset counts by status — answers "how many X are available?" */
    private String buildAssetSummary() {
        long available   = assetRepository.countByStatus(AssetStatus.AVAILABLE);
        long assigned    = assetRepository.countByStatus(AssetStatus.ASSIGNED);
        long maintenance = assetRepository.countByStatus(AssetStatus.MAINTENANCE);
        long retired     = assetRepository.countByStatus(AssetStatus.RETIRED);

        List<Object[]> byType = assetRepository.countByType();
        String typeBreakdown = byType.stream()
                .map(r -> r[0] + ": " + r[1])
                .collect(Collectors.joining(", "));

        return """
                === ASSET SUMMARY ===
                Total by status — Available: %d | Assigned: %d | Maintenance: %d | Retired: %d
                Total by type   — %s

                """.formatted(available, assigned, maintenance, retired, typeBreakdown);
    }

    /** All currently assigned assets with employee name */
    private String buildAssignedAssets() {
        List<Asset> assigned = assetRepository.findAll().stream()
                .filter(a -> a.getStatus() == AssetStatus.ASSIGNED && a.getAssignedTo() != null)
                .collect(Collectors.toList());

        if (assigned.isEmpty()) return "=== ASSIGNED ASSETS ===\nNone currently assigned.\n\n";

        String rows = assigned.stream()
                .map(a -> String.format("  • [%s] %s (%s) → %s | %s",
                        a.getId(), a.getName(), a.getType(),
                        a.getAssignedTo().getName(), a.getAssignedTo().getEmail()))
                .collect(Collectors.joining("\n"));

        return "=== ASSIGNED ASSETS ===\n" + rows + "\n\n";
    }

    /** Available assets — answers "what can I request?" */
    private String buildAvailableAssets() {
        List<Asset> available = assetRepository.findAll().stream()
                .filter(a -> a.getStatus() == AssetStatus.AVAILABLE)
                .collect(Collectors.toList());

        if (available.isEmpty()) return "=== AVAILABLE ASSETS ===\nNo assets currently available.\n\n";

        String rows = available.stream()
                .map(a -> String.format("  • [%s] %s (%s) — %s | Branch: %s",
                        a.getId(), a.getName(), a.getType(),
                        a.getModel() != null ? a.getModel() : "N/A",
                        a.getBranch() != null ? a.getBranch().getName() : "N/A"))
                .collect(Collectors.joining("\n"));

        return "=== AVAILABLE ASSETS ===\n" + rows + "\n\n";
    }

    /**
     * COMPLIANCE RISK: Assets still assigned to inactive (deactivated) users.
     * This is the core Agentic RAG use-case — finding unreturned assets from
     * employees who are no longer active in the system.
     */
    private String buildInactiveUserAssets() {
        List<Asset> risks = assetRepository.findAll().stream()
                .filter(a -> a.getStatus() == AssetStatus.ASSIGNED
                          && a.getAssignedTo() != null
                          && !a.getAssignedTo().isActive())
                .collect(Collectors.toList());

        if (risks.isEmpty()) return "=== COMPLIANCE STATUS ===\nAll clear — no assets held by inactive users.\n\n";

        String rows = risks.stream()
                .map(a -> String.format("  ⚠ [%s] %s (%s) → %s (%s) [INACTIVE USER — asset not returned]",
                        a.getId(), a.getName(), a.getType(),
                        a.getAssignedTo().getName(), a.getAssignedTo().getEmail()))
                .collect(Collectors.joining("\n"));

        return "=== COMPLIANCE RISKS (Inactive users holding assets) ===\n" + rows + "\n\n";
    }
}
