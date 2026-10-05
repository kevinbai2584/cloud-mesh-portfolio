import os
import glob
import hashlib
from typing import List, Dict, Any
import chromadb
from chromadb.utils import embedding_functions

# Clean up broken SSL environment variables common in Windows/Conda setups
if "SSL_CERT_FILE" in os.environ and not os.path.exists(os.environ["SSL_CERT_FILE"]):
    del os.environ["SSL_CERT_FILE"]
if "REQUESTS_CA_BUNDLE" in os.environ and not os.path.exists(os.environ["REQUESTS_CA_BUNDLE"]):
    del os.environ["REQUESTS_CA_BUNDLE"]

BASE_DIR = os.path.dirname(__file__)
CHROMA_DATA_DIR = os.path.join(BASE_DIR, ".chroma_db")
VAULT_DIR = os.path.join(BASE_DIR, "knowledge_vault")

# Dense embedding function using sentence-transformers (384-dimensional dense vectors)
embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

# Persistent ChromaDB client targeting local storage
chroma_client = chromadb.PersistentClient(path=CHROMA_DATA_DIR)

# Initialize collection configured for HNSW cosine distance metric
collection = chroma_client.get_or_create_collection(
    name="kevin_verified_knowledge",
    embedding_function=embedding_fn,
    metadata={"hnsw:space": "cosine"}
)

def _compute_chunk_hash(title: str, content: str) -> str:
    """Generate SHA-256 fingerprint for chunk deduplication and delta tracking."""
    return hashlib.sha256(f"{title}::{content}".encode("utf-8")).hexdigest()

def _parse_markdown_chunks(filepath: str) -> List[Dict[str, Any]]:
    """Parse Markdown documents into semantic chunks split by level-2 headers (##)."""
    chunks = []
    filename = os.path.basename(filepath)
    source_tag = filename.replace(".md", "").replace("_", " ").title()

    with open(filepath, "r", encoding="utf-8") as f:
        raw_text = f.read()

    sections = raw_text.split("## ")
    main_title = sections[0].strip().replace("# ", "") if sections else "Knowledge Base"

    for sec in sections[1:]:
        lines = sec.strip().split("\n")
        sub_title = lines[0].strip()
        body = "\n".join(lines[1:]).strip()
        if body:
            full_title = f"{main_title} - {sub_title}"
            c_hash = _compute_chunk_hash(full_title, body)
            chunk_id = f"{filename}::{sub_title.lower().replace(' ', '_')}"
            chunks.append({
                "id": chunk_id,
                "title": full_title,
                "content": body,
                "source": source_tag,
                "component": sub_title,
                "hash": c_hash
            })
    return chunks

def sync_knowledge_vault() -> Dict[str, Any]:
    """
    Incremental ingestion pipeline:
    1. Scan knowledge_vault for Markdown source files.
    2. Compare chunk SHA-256 fingerprints against existing collection metadata.
    3. Execute embedding inference and upsert exclusively on new or mutated chunks.
    """
    os.makedirs(VAULT_DIR, exist_ok=True)
    md_files = glob.glob(os.path.join(VAULT_DIR, "*.md"))
    if not md_files:
        return {"status": "empty", "message": "No markdown files found in knowledge_vault."}

    all_parsed_chunks: List[Dict[str, Any]] = []
    for file_path in md_files:
        all_parsed_chunks.extend(_parse_markdown_chunks(file_path))

    if not all_parsed_chunks:
        return {"status": "no_chunks", "indexed": 0}

    # Retrieve existing collection state for fingerprint differential check
    existing_items = collection.get(include=["metadatas"])
    existing_hashes = {}
    if existing_items and "ids" in existing_items and "metadatas" in existing_items:
        for idx, item_id in enumerate(existing_items["ids"]):
            meta = existing_items["metadatas"][idx] or {}
            existing_hashes[item_id] = meta.get("hash", "")

    chunks_to_upsert = [
        c for c in all_parsed_chunks if existing_hashes.get(c["id"]) != c["hash"]
    ]

    if chunks_to_upsert:
        ids = [c["id"] for c in chunks_to_upsert]
        documents = [c["content"] for c in chunks_to_upsert]
        metadatas = [
            {
                "title": c["title"],
                "source": c["source"],
                "component": c["component"],
                "hash": c["hash"]
            }
            for c in chunks_to_upsert
        ]
        print(f"[ChromaDB] Upserting {len(ids)} new/modified chunks into persistent store...")
        collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
        return {
            "status": "synced",
            "updated": len(ids),
            "total_indexed": collection.count()
        }
    
    return {
        "status": "up_to_date",
        "updated": 0,
        "total_indexed": collection.count()
    }

def retrieve_relevant_chunks(query: str, top_k: int = 2) -> List[Dict[str, Any]]:
    """Query ChromaDB using HNSW dense vector cosine distance."""
    if collection.count() == 0:
        sync_knowledge_vault()

    results = collection.query(
        query_texts=[query],
        n_results=top_k,
        include=["documents", "metadatas", "distances"]
    )

    retrieved = []
    if results and results.get("documents") and len(results["documents"][0]) > 0:
        docs = results["documents"][0]
        metas = results["metadatas"][0]
        distances = results["distances"][0]

        for i in range(len(docs)):
            dist = distances[i]
            sim_score = max(0.0, round(1.0 - dist, 3))
            meta = metas[i]

            retrieved.append({
                "title": meta.get("title", "Verified Knowledge"),
                "content": docs[i],
                "metadata": {
                    "source": meta.get("source", "Knowledge Vault"),
                    "component": meta.get("component", "Subsystem")
                },
                "score": sim_score
            })
    return retrieved

# Execute silent initialization check on module load
sync_knowledge_vault()