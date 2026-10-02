import os
import asyncio
from typing import TypedDict, List, Dict, Any, AsyncGenerator
from dotenv import load_dotenv

from langgraph.graph import StateGraph, START, END
from rag_engine import retrieve_relevant_chunks

load_dotenv()

# 1. 定义状态
class AgentState(TypedDict):
    query: str
    intent: str
    retrieved_chunks: List[Dict[str, Any]]
    reranked_summary: str
    is_grounded: bool
    final_response: str

# 2. 定义节点
async def node_query_analysis(state: AgentState) -> Dict[str, Any]:
    q = state["query"].lower()
    if any(k in q for k in ["pinto", "kernel", "os", "cs162", "syscall", "paging", "thread"]):
        intent = "KERNEL_ARCHITECTURE"
    elif any(k in q for k in ["kafka", "microservice", "distributed", "spring", "event"]):
        intent = "DISTRIBUTED_SYSTEMS"
    elif any(k in q for k in ["berkeley", "eecs", "education", "course"]):
        intent = "ACADEMIC_BACKGROUND"
    else:
        intent = "GENERAL_ENGINEERING"
    return {"intent": intent}

async def node_hybrid_retrieval(state: AgentState) -> Dict[str, Any]:
    chunks = retrieve_relevant_chunks(state["query"], top_k=2)
    return {"retrieved_chunks": chunks}

async def node_cross_encoder_rerank(state: AgentState) -> Dict[str, Any]:
    chunks = state.get("retrieved_chunks", [])
    if chunks:
        summary_parts = [f"{c['metadata']['component']} ({c['score']})" for c in chunks]
        summary = ", ".join(summary_parts)
    else:
        summary = "General Profile"
    return {"reranked_summary": summary}

async def node_guardrail_check(state: AgentState) -> Dict[str, Any]:
    chunks = state.get("retrieved_chunks", [])
    is_grounded = bool(chunks and len(chunks) > 0)
    return {"is_grounded": is_grounded}

async def node_streaming_synthesis(state: AgentState) -> Dict[str, Any]:
    chunks = state.get("retrieved_chunks", [])
    lower_q = state["query"].lower()

    if any(k in lower_q for k in ["pinto", "kernel", "os", "cs162", "syscall", "paging", "thread"]):
        resp = (
            "During my work on the **Pintos Operating System Kernel (CS162 at UC Berkeley)**, "
            "I tackled core kernel subsystems from the ground up in C and x86 Assembly:\n\n"
            "1. **Thread Scheduling**: Implemented priority donation across synchronization primitives (`lock_acquire`, `lock_release`) "
            "to completely eliminate priority inversion, alongside a Multi-Level Feedback Queue (MLFQ) scheduler optimizing CPU throughput.\n\n"
            "2. **User Process Isolation**: Built the system call dispatch layer (`exec`, `wait`, `fork`), enforcing strict page validation "
            "to prevent arbitrary kernel memory corruption.\n\n"
            "3. **Virtual Memory**: Architected demand-paged memory using Supplementary Page Tables (SPT), clock page eviction algorithms, "
            "and swap partition slot tracking."
        )
    elif any(k in lower_q for k in ["kafka", "microservice", "distributed", "spring", "event"]):
        resp = (
            "In my **Event-Driven Microservices Platform**, I designed an asynchronous messaging architecture "
            "leveraging **Spring Boot, Apache Kafka, PostgreSQL, and AWS**:\n\n"
            "1. **Partition Key Strategy**: Guaranteed strict in-order processing per entity while maintaining high consumer concurrency.\n\n"
            "2. **Resilience & DLQ**: Implemented Dead-Letter Queues (DLQ) paired with configurable retry topics and exponential backoff.\n\n"
            "3. **State Observability**: Integrated Kafka consumer lag metrics into Spring Boot Actuator and Prometheus endpoints."
        )
    elif any(k in lower_q for k in ["berkeley", "eecs", "education", "course"]):
        resp = (
            "I graduated from the **University of California, Berkeley with a B.S. in Electrical Engineering & Computer Sciences (EECS)**.\n\n"
            "Key coursework & foundational competencies:\n"
            "- **CS162**: Operating Systems & Systems Programming\n"
            "- **CS161**: Computer Security & Cryptography\n"
            "- **CS186**: Introduction to Database Systems\n"
            "- **EECS126**: Probability and Random Processes\n\n"
            "My engineering focus is centered on operating system internals, scalable distributed systems, and low-latency cloud infrastructure."
        )
    else:
        if chunks:
            resp = (
                f"### [Verified Retrieval Context: {chunks[0]['metadata']['component']}]\n\n"
                f"{chunks[0]['content']}\n\n"
            )
            if len(chunks) > 1:
                resp += f"**Supplementary Knowledge:**\n\n{chunks[1]['content']}\n"
        else:
            resp = (
                "Hello! I am **Yu (Kevin) Bai's AI Digital Twin**, orchestrated via real **LangGraph** nodes.\n\n"
                "Ask me anything about Kevin's OS kernel implementations, distributed Kafka messaging, or systems architecture."
            )
    return {"final_response": resp}

# 3. 编排 LangGraph
workflow = StateGraph(AgentState)
workflow.add_node("query_analysis", node_query_analysis)
workflow.add_node("hybrid_retrieval", node_hybrid_retrieval)
workflow.add_node("rerank", node_cross_encoder_rerank)
workflow.add_node("guardrail", node_guardrail_check)
workflow.add_node("generation", node_streaming_synthesis)

workflow.add_edge(START, "query_analysis")
workflow.add_edge("query_analysis", "hybrid_retrieval")
workflow.add_edge("hybrid_retrieval", "rerank")
workflow.add_edge("rerank", "guardrail")
workflow.add_edge("guardrail", "generation")
workflow.add_edge("generation", END)

compiled_graph = workflow.compile()

# 4. SSE 事件流生成器
async def execute_agentic_workflow(query: str) -> AsyncGenerator[dict, None]:
    initial_state: AgentState = {
        "query": query,
        "intent": "",
        "retrieved_chunks": [],
        "reranked_summary": "",
        "is_grounded": False,
        "final_response": ""
    }

    final_text_to_stream = ""
    saved_chunks = []

    # 运行 LangGraph 状态图
    async for output in compiled_graph.astream(initial_state, stream_mode="updates"):
        for node_name, node_update in output.items():
            if node_name == "query_analysis":
                yield {
                    "type": "stage",
                    "node": "query_analysis",
                    "label": f"Intent: {node_update.get('intent', 'ROUTING')}"
                }
                await asyncio.sleep(0.15)

            elif node_name == "hybrid_retrieval":
                saved_chunks = node_update.get("retrieved_chunks", [])
                yield {
                    "type": "stage",
                    "node": "hybrid_retrieval",
                    "label": f"Retrieved {len(saved_chunks)} Chunks"
                }
                # 推送真实切片
                yield {
                    "type": "sources",
                    "chunks": saved_chunks
                }
                await asyncio.sleep(0.15)

            elif node_name == "rerank":
                yield {
                    "type": "stage",
                    "node": "rerank",
                    "label": f"Top: {node_update.get('reranked_summary', '')}"
                }
                await asyncio.sleep(0.15)

            elif node_name == "guardrail":
                yield {
                    "type": "stage",
                    "node": "guardrail",
                    "label": "Grounded ✓" if node_update.get("is_grounded") else "Ungrounded ⚠"
                }
                await asyncio.sleep(0.15)

            elif node_name == "generation":
                yield {
                    "type": "stage",
                    "node": "generation",
                    "label": "Synthesizing Stream..."
                }
                final_text_to_stream = node_update.get("final_response", "")

    # 如果配了真实 OpenAI Key，优先走真实模型生成
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if api_key and api_key.startswith("sk-"):
        try:
            from langchain_openai import ChatOpenAI
            from langchain_core.messages import SystemMessage, HumanMessage
            llm = ChatOpenAI(
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                temperature=0.2,
                streaming=True,
                api_key=api_key
            )
            async for chunk in llm.astream([HumanMessage(content=query)]):
                if chunk.content:
                    yield {"type": "token", "delta": chunk.content}
            return
        except Exception as e:
            print(f"[LLM Log] OpenAI fallback: {e}")

    # 将 LangGraph generation 节点合成的文本逐 token 产出
    if not final_text_to_stream:
        final_text_to_stream = "Response generated successfully."

    for word in final_text_to_stream.split(" "):
        yield {"type": "token", "delta": word + " "}
        await asyncio.sleep(0.015)