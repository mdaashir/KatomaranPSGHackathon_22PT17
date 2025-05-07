import os
import logging
import json
from typing import Dict, Any, List
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
import uvicorn

from rag.index import init_vectorstore, get_vectorstore, index_documents
from rag.chat import create_chat_response, stream_chat_response

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AI Chat Assistant",
    description="A RAG-based AI chat assistant for event information",
    version="1.0.0",
)

# Configure CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store for monitoring active connections
active_connections = set()

@app.on_event("startup")
async def startup_event():
    """Initialize components when the application starts"""
    logger.info("Starting RAG engine service...")

    # Ensure OpenAI API key is set
    if not os.environ.get("OPENAI_API_KEY"):
        logger.warning("OPENAI_API_KEY environment variable not set!")

    # Initialize the vector database
    try:
        await init_vectorstore()
        logger.info("Vector store initialized successfully")

        # Index documents from the docs folder if not already indexed
        docs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "docs")
        if os.path.exists(docs_dir):
            await index_documents(docs_dir)
            logger.info(f"Documents from {docs_dir} indexed successfully")
        else:
            logger.warning(f"Docs directory not found at {docs_dir}")
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "rag-engine"}


@app.get("/chat")
async def chat_stream(query: str):
    """
    Stream a response to a chat query using Server-Sent Events (SSE)
    """
    logger.info(f"Received streaming chat query: {query}")

    async def event_generator():
        try:
            # Send stream start event
            yield f"data: {json.dumps({'content': ''})}\n\n"

            # Process the query and stream response
            async for chunk in stream_chat_response(query):
                yield f"data: {chunk}\n\n"

            # Send end event
            yield "event: end\ndata: {}\n\n"
        except Exception as e:
            logger.error(f"Error during streaming: {str(e)}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            yield "event: end\ndata: {}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )


@app.post("/chat-sync")
async def chat_sync(request: Request):
    """
    Synchronous endpoint for chat queries (non-streaming)
    """
    try:
        data = await request.json()
        query = data.get("query")

        if not query:
            return JSONResponse(
                status_code=400,
                content={"error": "Missing 'query' parameter"}
            )

        logger.info(f"Received sync chat query: {query}")
        response = await create_chat_response(query)

        return {
            "response": response,
            "success": True
        }
    except Exception as e:
        logger.error(f"Error processing chat query: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "success": False}
        )


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=True)
