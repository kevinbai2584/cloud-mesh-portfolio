package com.kevinbai.profile.controller;

import com.kevinbai.profile.entity.Project;
import com.kevinbai.profile.service.ProjectService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * RESTful API endpoints for querying and managing showcase projects and real-time view telemetry.
 */
@RestController
@RequestMapping("/api/v1/profile/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public ResponseEntity<List<Project>> listProjects() {
        return ResponseEntity.ok(projectService.getAllProjects());
    }

    @PostMapping
    public ResponseEntity<Project> createProject(@RequestBody Project project) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectService.createProject(project));
    }

    /**
     * Ingests a view hit telemetry event.
     * Resolves proxy headers (X-Forwarded-For) if behind an API Gateway / CloudFront.
     */
    @PostMapping("/{id}/view")
    public ResponseEntity<Void> hitView(@PathVariable Long id, HttpServletRequest request) {
        String clientIp = request.getHeader("X-Forwarded-For");
        if (clientIp == null || clientIp.isBlank()) {
            clientIp = request.getRemoteAddr();
        }

        projectService.recordProjectView(id, clientIp);
        return ResponseEntity.accepted().build();
    }
}
