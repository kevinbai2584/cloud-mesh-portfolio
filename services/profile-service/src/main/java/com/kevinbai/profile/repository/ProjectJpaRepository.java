package com.kevinbai.profile.repository;

import com.kevinbai.profile.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Persistence Track 1: Spring Data JPA Repository.
 * Handles aggregate root retrieval with eager collection fetching to eliminate N+1 query overhead.
 */
@Repository
public interface ProjectJpaRepository extends JpaRepository<Project, Long> {

    /**
     * Retrieves all projects along with their associated tech stacks in a single query.
     * Uses JOIN FETCH to prevent LazyInitializationException and N+1 query issues.
     */
    @Query("SELECT DISTINCT p FROM Project p LEFT JOIN FETCH p.techStacks ORDER BY p.id ASC")
    List<Project> findAllWithTechStacks();
}