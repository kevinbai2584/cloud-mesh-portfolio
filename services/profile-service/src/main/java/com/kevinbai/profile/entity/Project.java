package com.kevinbai.profile.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Domain entity representing a showcase project.
 * Managed by JPA/Hibernate for complex relational mapping and rich domain lifecycle.
 */
@Entity
@Table(name = "projects", schema = "profile_schema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ElementCollection
    @CollectionTable(
            name = "project_tech_stacks",
            schema = "profile_schema",
            joinColumns = @JoinColumn(name = "project_id")
    )
    @Column(name = "tech_name")
    private List<String> techStacks = new ArrayList<>();

    @Column(name = "view_count", nullable = false)
    private Long viewCount = 0L;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Project(String title, String description, List<String> techStacks) {
        this.title = title;
        this.description = description;
        this.techStacks = techStacks;
        this.viewCount = 0L;
        this.createdAt = LocalDateTime.now();
    }
}