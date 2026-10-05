import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent_graph import execute_agentic_workflow
from rag_engine import sync_knowledge_vault, collection

app = FastAPI(
    title="Cloud Mesh Agent Service",
    description="Agentic RAG Studio driven by LangGraph, ChromaDB, and SSE streaming.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

@app.get("/health")
async def health_check():
    return {
        "status": "UP",
        "service": "agent-service",
        "vector_count": collection.count()
    }

@app.post("/api/v1/agent/knowledge/sync")
async def trigger_knowledge_sync():
    """Trigger the document ingestion pipeline to index markdown chunks into ChromaDB."""
    result = sync_knowledge_vault()
    return {"code": 200, "data": result}

@app.get("/api/v1/agent/knowledge/stats")
async def get_knowledge_stats():
    """Fetch vector database telemetry and collection indexing metrics."""
    return {
        "code": 200,
        "data": {
            "total_vectors": collection.count(),
            "backend": "ChromaDB",
            "distance_metric": "Cosine",
            "embedding_model": "all-MiniLM-L6-v2"
        }
    }

@app.post("/api/v1/agent/chat/stream")
async def chat_stream(request: ChatRequest):
    """Execute LangGraph multi-agent pipeline and stream real-time Server-Sent Events."""
    async def sse_event_generator():
        async for event in execute_agentic_workflow(request.message):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)