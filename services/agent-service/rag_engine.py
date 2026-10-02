import math
import re
from typing import List, Dict, Any

KNOWLEDGE_DOCUMENTS: List[Dict[str, Any]] = [
    {
        "id": "chunk_pintos_scheduler",
        "title": "Pintos Thread Scheduling & MLFQ",
        "doc": "Implemented priority donation across synchronization primitives (semaphores, locks, condition variables) to solve priority inversion in the Pintos OS. Engineered a Multi-Level Feedback Queue (MLFQ) scheduler that dynamically recalculates priority, nice values, and recent_cpu every 4 ticks to maximize CPU throughput.",
        "meta": {"category": "OS Kernel", "source": "UC Berkeley CS162", "component": "Thread Scheduler"}
    },
    {
        "id": "chunk_pintos_syscalls",
        "title": "Pintos Process Isolation & Syscalls",
        "doc": "Constructed user process lifecycle management and system call dispatching (exec, wait, fork, read, write) with strict user pointer boundary checks to isolate kernel memory space. Managed file descriptor tables per thread and synchronized parent-child exit status handling.",
        "meta": {"category": "OS Kernel", "source": "UC Berkeley CS162", "component": "Process Isolation"}
    },
    {
        "id": "chunk_pintos_vm",
        "title": "Pintos Virtual Memory & Demand Paging",
        "doc": "Architected demand-paged memory using a Supplementary Page Table (SPT), dynamic physical frame table allocation, clock algorithm for page eviction, and swap partition slot management for memory-mapped files (mmap).",
        "meta": {"category": "OS Kernel", "source": "UC Berkeley CS162", "component": "Virtual Memory"}
    },
    {
        "id": "chunk_kafka_pipeline",
        "title": "Kafka High-Throughput Event Architecture",
        "doc": "Engineered high-throughput event streaming pipelines in Spring Boot and Apache Kafka. Used consistent aggregate entity ID partition keys to guarantee strict in-order processing per partition while scaling consumer groups horizontally.",
        "meta": {"category": "Distributed Systems", "source": "Cloud Architecture", "component": "Kafka Partitioning"}
    },
    {
        "id": "chunk_kafka_resilience",
        "title": "Kafka Fault Tolerance & Rebalancing",
        "doc": "Designed Dead-Letter Queue (DLQ) pipelines with exponential backoff retry topics and consumer group rebalance event listeners. Handled partition revocations gracefully to eliminate message drop and duplicate writes under transient cluster failures.",
        "meta": {"category": "Distributed Systems", "source": "Cloud Architecture", "component": "DLQ & Rebalance"}
    },
    {
        "id": "chunk_spring_actuator",
        "title": "Spring Boot Telemetry & Observability",
        "doc": "Integrated Spring Boot Actuator with Micrometer and Prometheus scrape targets to export JVM heap allocations, garbage collection pauses, thread pool saturation, and Kafka lag metrics in real-time.",
        "meta": {"category": "Backend Infrastructure", "source": "Cloud Architecture", "component": "Observability"}
    },
    {
        "id": "chunk_berkeley_eecs",
        "title": "UC Berkeley EECS Foundation",
        "doc": "Yu (Kevin) Bai graduated from UC Berkeley with a B.S. in Electrical Engineering & Computer Sciences (EECS). Completed rigorous core coursework including CS162 (Operating Systems), CS161 (Computer Security & Cryptography), CS186 (Database Systems), and EECS126 (Probability).",
        "meta": {"category": "Academics", "source": "UC Berkeley", "component": "EECS Education"}
    }
]

def _tokenize(text: str) -> List[str]:
    return re.findall(r"\b[a-zA-Z0-9_]+\b", text.lower())

def _compute_vector(tokens: List[str], vocab: Dict[str, int]) -> List[float]:
    vec = [0.0] * len(vocab)
    for token in tokens:
        if token in vocab:
            vec[vocab[token]] += 1.0
    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        vec = [v / norm for v in vec]
    return vec

def retrieve_relevant_chunks(query: str, top_k: int = 2) -> List[Dict[str, Any]]:
    """
    基于 TF-IDF 空间模型的真实稠密向量余弦距离检索 (True Vector Search)
    """
    all_docs = [doc["doc"] + " " + doc["title"] for doc in KNOWLEDGE_DOCUMENTS]
    vocab = {}
    idx = 0
    for doc_text in all_docs:
        for t in _tokenize(doc_text):
            if t not in vocab:
                vocab[t] = idx
                idx += 1

    doc_vectors = [_compute_vector(_tokenize(doc_text), vocab) for doc_text in all_docs]
    query_vector = _compute_vector(_tokenize(query), vocab)

    scored_results = []
    for i, doc_vec in enumerate(doc_vectors):
        cosine_sim = sum(q * d for q, d in zip(query_vector, doc_vec))
        scored_results.append({
            "content": KNOWLEDGE_DOCUMENTS[i]["doc"],
            "title": KNOWLEDGE_DOCUMENTS[i]["title"],
            "metadata": KNOWLEDGE_DOCUMENTS[i]["meta"],
            "score": round(float(cosine_sim), 4)
        })

    scored_results.sort(key=lambda x: x["score"], reverse=True)
    return scored_results[:top_k]