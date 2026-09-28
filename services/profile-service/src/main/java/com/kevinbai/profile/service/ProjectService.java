package com.kevinbai.profile.service;

import com.kevinbai.profile.entity.Project;
import com.kevinbai.profile.repository.ProjectJdbcRepository;
import com.kevinbai.profile.repository.ProjectJpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service orchestrating dual persistence workflows:
 * Delegates domain management to JPA and offloads high-frequency telemetry/atomic mutations to JDBC.
 */
@Service
public class ProjectService {

    private final ProjectJpaRepository jpaRepository;
    private final ProjectJdbcRepository jdbcRepository;

    public ProjectService(ProjectJpaRepository jpaRepository, ProjectJdbcRepository jdbcRepository) {
        this.jpaRepository = jpaRepository;
        this.jdbcRepository = jdbcRepository;
    }

    @Transactional(readOnly = true)
    public List<Project> getAllProjects() {
        return jpaRepository.findAllWithTechStacks();
    }

    @Transactional
    public Project createProject(Project project) {
        return jpaRepository.save(project);
    }

    /**
     * Records a view metric for a project by executing an atomic counter increment
     * and asynchronously capturing the audit trail via native JDBC batch operations.
     */
    @Transactional
    public void recordProjectView(Long projectId, String clientIp) {
        int rowsUpdated = jdbcRepository.incrementViewCount(projectId);
        if (rowsUpdated == 0) {
            throw new IllegalArgumentException("Project not found with id: " + projectId);
        }

        // Asynchronously persist view log entry via high-throughput batching
        jdbcRepository.batchInsertViewLogs(List.of(projectId), clientIp);
    }
}
