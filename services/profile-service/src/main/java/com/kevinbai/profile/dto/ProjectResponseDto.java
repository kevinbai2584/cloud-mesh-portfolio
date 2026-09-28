package com.kevinbai.profile.dto;

import com.kevinbai.profile.entity.Project;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectResponseDto implements Serializable {
    private Long id;
    private String title;
    private String description;
    private Long viewCount;
    private LocalDateTime createdAt;
    private List<String> techStacks;

    public static ProjectResponseDto fromEntity(Project entity) {
        return ProjectResponseDto.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .viewCount(entity.getViewCount())
                .createdAt(entity.getCreatedAt())
                .techStacks(entity.getTechStacks() != null ? new ArrayList<>(entity.getTechStacks()) : List.of())
                .build();
    }
}