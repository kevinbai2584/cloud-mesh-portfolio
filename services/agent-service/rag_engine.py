"""
RAG Engine (Hybrid Search: Dense Vector + BM25 with Reciprocal Rank Fusion)
==============================================================================
ARCHITECTURE ENHANCEMENT:
This module integrates Sparse Keyword Retrieval (BM25) with Dense Semantic
Embeddings (ChromaDB HNSW) and merges ranked lists using Reciprocal Rank Fusion (RRF).

PROS (ADVANTAGES):
1. Precision on Exact Out-Of-Vocabulary Identifiers:
   - Dense embeddings suffer from semantic drift when querying exact technical tokens
     (e.g., 'sys_wait', 'sema_down', 'CS162', 'max.poll.interval.ms').
   - BM25 guarantees high ranking when exact rare keywords appear in target chunks.
2. Semantic Generalization:
   - Dense retrieval covers multi-word paraphrases and conversational intent even when
     keywords do not literally match.
3. Resilient Score Normalization (RRF):
   - BM25 yields unbounded scores depending on query/document length, whereas Cosine
     distance is bounded within [0, 1]. Direct linear interpolation is brittle.
   - RRF operates purely on relative ordinal ranking (1 / (k + rank)), eliminating
     scale divergence without complex dynamic hyperparameter tuning.
4. Fully Embedded & Self-Contained:
   - Both ChromaDB and rank-bm25 run in-process without external SaaS dependencies,
     preserving zero-cost execution and 100% data privacy.

CONS (DISADVANTAGES & TRADEOFFS):
1. In-Memory Tokenization Overhead:
   - BM25 constructs an in-memory inverted token list. For massive corpora (> 100k
     documents), memory footprint and tokenization latency during startup grow linearly.
2. Naive Tokenization Limitations:
   - Simple whitespace/regex tokenization might miss advanced linguistic morphology
     (e.g., stemming irregularities or multi-lingual segmentation) compared to full-blown
     inverted search engines like Lucene/Elasticsearch.
3. Cold-Start Index Build Time:
   - Rebuilding the BM25 inverted index occurs whenever the corpus changes or service boots.
==============================================================================
"""
"""
============================================================
1. Pure dense vector seach test (Pure Dense Vector Search)
============================================================
Rank 1 [Cosine Similarity: 0.7019]:
## Thread Scheduling and Priority Donation
In the Pintos OS (CS162 at UC Berkeley), multiple threads frequently compete ...

Rank 2 [Cosine Similarity: 0.4493]:
# Pintos Operating System Kernel...

Rank 3 [Cosine Similarity: 0.4135]:          <------------------------------------      after use hybird search, this out
Designed Dead-Letter Queue (DLQ) pipelines with exponential backoff retry topics to gracefully isolate unprocessable pay...

============================================================
2. Hybird seach test (BM25 + Dense Vector with RRF)
============================================================
Rank 1 [RRF Score: 0.0328 | Dense Sim: 0.7019]:
## Thread Scheduling and Priority Donation
In the Pintos OS (CS162 at UC Berkeley), multiple threads frequently compete ...

Rank 2 [RRF Score: 0.0323 | Dense Sim: 0.4493]:
# Pintos Operating System Kernel...

Rank 3 [RRF Score: 0.0313 | Dense Sim: 0.2743]:      <------------------------------------  correct data in, prevented semantic drift
## User Process Isolation and Syscall Layer
Constructed the user memory protection and system call dispatching layer. Ha...



"""
import os
from pathlib import Path

# If SSL_CERT_FILE is set to a non-existent path, remove it so Python uses system default certs
if "SSL_CERT_FILE" in os.environ and not Path(os.environ["SSL_CERT_FILE"]).exists():
    del os.environ["SSL_CERT_FILE"]
import re
import hashlib
from typing import List, Dict, Any
from pathlib import Path
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi

# Base paths
BASE_DIR = Path(__file__).resolve().parent
VAULT_DIR = BASE_DIR / "knowledge_vault"
CHROMA_DATA_DIR = str(BASE_DIR / ".chroma_db")

# ChromaDB client & collection initialization
chroma_client = chromadb.PersistentClient(
    path=CHROMA_DATA_DIR,
    settings=Settings(anonymized_telemetry=False)
)

COLLECTION_NAME = "portfolio_knowledge_base"
collection = chroma_client.get_or_create_collection(
    name=COLLECTION_NAME,
    metadata={"hnsw:space": "cosine"}
)

# Local dense embedding model
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
model = SentenceTransformer(EMBEDDING_MODEL_NAME)

# In-memory BM25 index components
_bm25_index: BM25Okapi | None = None
_bm25_corpus: List[Dict[str, Any]] = []


def _tokenize(text: str) -> List[str]:
    """Tokenize query and documents for BM25 with code identifier preservation."""
    # Split by whitespace, punctuation while keeping underscores and alphanumeric words
    tokens = re.findall(r'[a-zA-Z0-9_\-]+', text.lower())
    return tokens


def _build_bm25_index():
    """Build in-memory BM25 index from all documents stored in ChromaDB."""
    global _bm25_index, _bm25_corpus
    all_data = collection.get(include=["documents", "metadatas"])
    
    docs = all_data.get("documents", [])
    ids = all_data.get("ids", [])
    metadatas = all_data.get("metadatas", [])

    if not docs:
        _bm25_index = None
        _bm25_corpus = []
        return

    _bm25_corpus = []
    tokenized_corpus = []

    for doc_id, doc_text, meta in zip(ids, docs, metadatas):
        _bm25_corpus.append({
            "id": doc_id,
            "text": doc_text,
            "metadata": meta
        })
        tokenized_corpus.append(_tokenize(doc_text))

    _bm25_index = BM25Okapi(tokenized_corpus)


def compute_file_sha256(filepath: Path) -> str:
    """Compute SHA-256 fingerprint for document deduplication and change detection."""
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            sha.update(chunk)
    return sha.hexdigest()


def chunk_markdown(content: str, max_chunk_size: int = 500) -> List[str]:
    """Split markdown documents into logical paragraphs or max_chunk_size limits."""
    raw_sections = content.split("\n\n")
    chunks = []
    current_chunk = ""

    for sec in raw_sections:
        clean_sec = sec.strip()
        if not clean_sec:
            continue
        if len(current_chunk) + len(clean_sec) > max_chunk_size:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = clean_sec
        else:
            current_chunk = f"{current_chunk}\n\n{clean_sec}" if current_chunk else clean_sec

    if current_chunk:
        chunks.append(current_chunk)
    return chunks


def sync_knowledge_vault() -> str:
    """Scan knowledge_vault directory and synchronize changed markdown files into ChromaDB."""
    if not VAULT_DIR.exists():
        VAULT_DIR.mkdir(parents=True, exist_ok=True)
        return "Knowledge vault initialized (empty)."

    md_files = list(VAULT_DIR.glob("*.md"))
    if not md_files:
        _build_bm25_index()
        return "No markdown documents found in knowledge vault."

    updated_count = 0
    total_chunks = 0

    for file_path in md_files:
        current_hash = compute_file_sha256(file_path)
        existing = collection.get(
            where={"source_file": file_path.name},
            include=["metadatas"]
        )

        needs_update = False
        if existing and existing["ids"]:
            stored_hash = existing["metadatas"][0].get("file_hash")
            if stored_hash != current_hash:
                collection.delete(where={"source_file": file_path.name})
                needs_update = True
        else:
            needs_update = True

        if needs_update:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            chunks = chunk_markdown(content)
            if not chunks:
                continue

            embeddings = model.encode(chunks, normalize_embeddings=True).tolist()
            ids = [f"{file_path.stem}_chunk_{idx}" for idx in range(len(chunks))]
            metadatas = [
                {
                    "source_file": file_path.name,
                    "file_hash": current_hash,
                    "chunk_index": idx
                }
                for idx in range(len(chunks))
            ]

            collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=chunks,
                metadatas=metadatas
            )
            updated_count += 1
            total_chunks += len(chunks)

    # Rebuild sparse index after synchronization
    _build_bm25_index()

    return f"Knowledge sync complete: {updated_count} files refreshed, total new chunks: {total_chunks}."


def reciprocal_rank_fusion(
    bm25_results: List[Dict[str, Any]],
    dense_results: List[Dict[str, Any]],
    k: int = 60,
    top_k: int = 4
) -> List[Dict[str, Any]]:
    """
    Combine sparse (BM25) and dense (ChromaDB) rankings using Reciprocal Rank Fusion (RRF).
    Formula: RRF_Score = sum(1 / (k + rank_i))
    """
    scores: Dict[str, float] = {}
    doc_map: Dict[str, Dict[str, Any]] = {}

    # Rank sparse results
    for rank, item in enumerate(bm25_results):
        doc_id = item["id"]
        doc_map[doc_id] = item
        scores[doc_id] = scores.get(doc_id, 0.0) + (1.0 / (k + rank + 1))

    # Rank dense results
    for rank, item in enumerate(dense_results):
        doc_id = item["id"]
        doc_map[doc_id] = item
        scores[doc_id] = scores.get(doc_id, 0.0) + (1.0 / (k + rank + 1))

    # Sort merged documents by fused RRF score descending
    sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)

    final_results = []
    for doc_id in sorted_ids[:top_k]:
        item = doc_map[doc_id]
        item["rrf_score"] = round(scores[doc_id], 4)
        final_results.append(item)

    return final_results

def retrieve_relevant_chunks(query: str, top_k: int = 3) -> List[Dict[str, Any]]:
    """
    Backward-compatible wrapper for AgentGraph.
    Delegates to hybrid_retrieve (BM25 + Dense HNSW + RRF).
    """
    return hybrid_retrieve(query=query, top_k=top_k)

def hybrid_retrieve(query: str, top_k: int = 3, candidate_pool: int = 10) -> List[Dict[str, Any]]:
    """
    Execute dual-path retrieval (BM25 sparse + ChromaDB dense) and fuse results via RRF.
    """
    global _bm25_index, _bm25_corpus
    if _bm25_index is None:
        _build_bm25_index()

    # 1. Sparse BM25 Retrieval Path
    bm25_candidates = []
    if _bm25_index and _bm25_corpus:
        tokenized_query = _tokenize(query)
        raw_scores = _bm25_index.get_scores(tokenized_query)
        scored_indices = sorted(range(len(raw_scores)), key=lambda i: raw_scores[i], reverse=True)
        
        for idx in scored_indices[:candidate_pool]:
            if raw_scores[idx] > 0.0:  # Only include non-zero keyword matches
                candidate = dict(_bm25_corpus[idx])
                candidate["sparse_score"] = float(raw_scores[idx])
                bm25_candidates.append(candidate)

    # 2. Dense Vector Retrieval Path (ChromaDB)
    query_embedding = model.encode([query], normalize_embeddings=True).tolist()
    dense_res = collection.query(
        query_embeddings=query_embedding,
        n_results=candidate_pool,
        include=["documents", "metadatas", "distances"]
    )

    dense_candidates = []
    if dense_res and dense_res.get("ids") and dense_res["ids"][0]:
        ids = dense_res["ids"][0]
        docs = dense_res["documents"][0]
        metas = dense_res["metadatas"][0]
        distances = dense_res["distances"][0]

        for doc_id, doc_text, meta, dist in zip(ids, docs, metas, distances):
            dense_candidates.append({
                "id": doc_id,
                "text": doc_text,
                "metadata": meta,
                "dense_similarity": round(1.0 - dist, 4)
            })

    # 3. Reciprocal Rank Fusion
    fused_results = reciprocal_rank_fusion(
        bm25_results=bm25_candidates,
        dense_results=dense_candidates,
        k=60,
        top_k=top_k
    )

    return fused_results


# Execute initial synchronization and index build on import
sync_knowledge_vault()