package com.kevinbai.profile;

import com.kevinbai.profile.entity.Project;
import com.kevinbai.profile.repository.ProjectJpaRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.util.List;

@SpringBootApplication
public class ProfileApplication {

	public static void main(String[] args) {
		SpringApplication.run(ProfileApplication.class, args);
	}

	/**
	 * Seeds initial production projects on bootstrap if the database is unpopulated.
	 */
	@Bean
	CommandLineRunner initDatabase(ProjectJpaRepository repository) {
		return args -> {
			if (repository.count() == 0) {
				repository.save(new Project(
						"Pintos Operating System Kernel",
						"Implemented MLFQ thread scheduler, virtual memory demand paging, and multi-threaded system calls.",
						List.of("C", "x86", "Operating Systems", "Concurrency")
				));
				repository.save(new Project(
						"Cloud Mesh Distributed Portfolio",
						"Cloud-native microservices architecture featuring Spring Boot 3, Kafka, LangGraph, and Module Federation.",
						List.of("Java 21", "Spring Boot", "Kafka", "Python", "FastAPI", "React")
				));
			}
		};
	}
}