package com.company.itasset.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name = "branches")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Branch {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, unique = true)
    private String name;

    private String location;
    private String city;
    private String country;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
