package com.company.itasset.entity;

import com.company.itasset.entity.enums.RequestStatus;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.envers.Audited;
import org.hibernate.envers.NotAudited;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "asset_requests", indexes = {
    @Index(name = "idx_requests_user",   columnList = "user_id"),
    @Index(name = "idx_requests_status", columnList = "status")
})
@Audited
@Data @NoArgsConstructor @AllArgsConstructor @Builder
@EntityListeners(AuditingEntityListener.class)
public class AssetRequest {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotAudited
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @NotNull
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler","password","branch","role"})
    private User user;

    @NotAudited
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler","branch","assignedTo"})
    private Asset asset;

    @NotBlank @Column(name = "product_name", nullable = false)
    private String productName;

    @NotBlank @Column(nullable = false)
    private String justification;

    @Column(nullable = false)
    @Builder.Default
    private String priority = "MEDIUM";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RequestStatus status = RequestStatus.PENDING;

    @Column(name = "employee_name")
    private String employeeName;

    private String department;

    @Column(name = "project_name")
    private String projectName;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Builder.Default
    private Integer quantity = 1;

    @Column(name = "needed_by")
    private LocalDate neededBy;

    @Column(name = "admin_notes")
    private String adminNotes;

    @NotAudited
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by_user_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler","password","branch","role"})
    private User resolvedBy;

    @CreatedDate
    @Column(name = "request_date", updatable = false)
    private LocalDateTime requestDate;

    @Column(name = "resolved_date")
    private LocalDateTime resolvedDate;
}
