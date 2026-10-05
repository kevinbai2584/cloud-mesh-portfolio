\# Distributed Systems \& Cloud Architecture



\## Event-Driven Kafka Messaging Architecture

Engineered high-throughput event streaming pipelines leveraging Spring Boot, Apache Kafka, and PostgreSQL. Used consistent aggregate entity ID partition keys to guarantee strict in-order message consumption per entity while scaling consumer groups horizontally.



\## Fault Tolerance DLQ and Rebalancing

Designed Dead-Letter Queue (DLQ) pipelines with exponential backoff retry topics to gracefully isolate unprocessable payloads without halting consumer threads. Implemented custom ConsumerRebalanceListener hooks to commit offsets cleanly and avoid duplicate processing or split-brain states during partition rebalances.



\## Backend Observability and Cloud Infrastructure

Integrated Spring Boot Actuator with Micrometer and Prometheus to scrape and expose JVM garbage collection pauses, thread contention, and Kafka consumer group lag. Deployed containerized microservices orchestrated with Docker Compose and cloud gateways.

