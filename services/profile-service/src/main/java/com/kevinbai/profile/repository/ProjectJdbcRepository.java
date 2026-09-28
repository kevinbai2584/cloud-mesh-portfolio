package com.kevinbai.profile.repository;

import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Persistence Track 2: Native Spring JDBC Repository.
 * Bypasses Hibernate snapshot dirty checking and L1 cache overhead for high-frequency writes and atomic operations.
 */
@Repository
public class ProjectJdbcRepository {

    private final JdbcTemplate jdbcTemplate;

    public ProjectJdbcRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Executes atomic counter increments directly at the PostgreSQL row level.
     * Prevents lost updates under high concurrency without requiring heavy entity load cycles.
     *
     * @param projectId target project identifier
     * @return number of affected rows
     */
    public int incrementViewCount(Long projectId) {
        String sql = "UPDATE profile_schema.projects SET view_count = view_count + 1 WHERE id = ?";
        return jdbcTemplate.update(sql, projectId);
    }

    /**
     * Ingests telemetry access logs using low-level JDBC batching.
     * Leverages PostgreSQL 'reWriteBatchedInserts=true' to maximize throughput and minimize network round-trips.
     *
     * @param projectIds list of accessed project IDs
     * @param clientIp remote client IP address
     * @return array containing the number of rows affected by each statement
     */
    public int[] batchInsertViewLogs(List<Long> projectIds, String clientIp) {
        String createTableSql = """
            CREATE TABLE IF NOT EXISTS profile_schema.project_view_logs (
                id BIGSERIAL PRIMARY KEY,
                project_id BIGINT NOT NULL,
                client_ip VARCHAR(50),
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """;
        jdbcTemplate.execute(createTableSql);

        String insertSql = "INSERT INTO profile_schema.project_view_logs (project_id, client_ip, created_at) VALUES (?, ?, ?)";
        Timestamp now = Timestamp.valueOf(LocalDateTime.now());

        return jdbcTemplate.batchUpdate(insertSql, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                ps.setLong(1, projectIds.get(i));
                ps.setString(2, clientIp);
                ps.setTimestamp(3, now);
            }

            @Override
            public int getBatchSize() {
                return projectIds.size();
            }
        });
    }
}