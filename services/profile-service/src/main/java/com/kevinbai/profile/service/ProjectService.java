package com.kevinbai.profile.service;

import com.kevinbai.profile.dto.ProjectListResponse;
import com.kevinbai.profile.dto.ProjectResponseDto;
import com.kevinbai.profile.entity.Project;
import com.kevinbai.profile.repository.ProjectJdbcRepository;
import com.kevinbai.profile.repository.ProjectJpaRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProjectService {

    private final ProjectJpaRepository jpaRepository;
    private final ProjectJdbcRepository jdbcRepository;

    public ProjectService(ProjectJpaRepository jpaRepository, ProjectJdbcRepository jdbcRepository) {
        this.jpaRepository = jpaRepository;
        this.jdbcRepository = jdbcRepository;
    }

    @Cacheable(value = "projects", key = "'all'")
    @Transactional(readOnly = true)
    public ProjectListResponse getAllProjects() {
        List<ProjectResponseDto> dtoList = jpaRepository.findAllWithTechStacks()
                .stream()
                .map(ProjectResponseDto::fromEntity)
                .toList();
        return new ProjectListResponse(dtoList);
    }

    @CacheEvict(value = "projects", allEntries = true)
    @Transactional
    public Project createProject(Project project) {
        return jpaRepository.save(project);
    }

    @CacheEvict(value = "projects", allEntries = true)
    @Transactional
    public void recordProjectView(Long projectId, String clientIp) {
        int rowsUpdated = jdbcRepository.incrementViewCount(projectId);
        if (rowsUpdated == 0) {
            throw new IllegalArgumentException("Project not found with id: " + projectId);
        }

        jdbcRepository.batchInsertViewLogs(List.of(projectId), clientIp);
    }
}