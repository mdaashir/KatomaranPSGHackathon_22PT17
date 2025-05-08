import os
import json
import logging
import asyncio
from typing import Dict, Any
from dotenv import load_dotenv

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

# Import RAG modules
from rag.index import initialize_vector_store
from rag.chat import stream_answer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join("..", "..", "logs", "rag-engine.log"))
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="RAG-based AI Chat Assistant",
    description="A real-time AI chat assistant with RAG-based answers",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, specify specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store vector store as an app state
vector_store = None

@app.on_event("startup")
async def startup_event():
    """Initialize the vector store at startup."""
    global vector_store
    try:
        logger.info("Initializing vector store")
        vector_store = await initialize_vector_store()
        logger.info("Vector store initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing vector store: {str(e)}")
        # We'll continue running the app, but RAG won't work until vector store is initialized

@app.get("/")
async def root():
    """Root endpoint for health check."""
    return {"status": "ok", "message": "RAG engine is running"}

@app.get("/chat")
async def chat_streaming(query: str):
    """
    Stream a response to a chat query.

    This endpoint is used for SSE (Server-Sent Events) streaming.

    Args:
        query: The user's query

    Returns:
        StreamingResponse: A streaming response with chunks of the answer
    """
    if not query or query.strip() == "":
        return StreamingResponse(
            iter([json.dumps({"error": "Query cannot be empty"}) + "\n\n"]),
            media_type="text/event-stream"
        )

    if not vector_store:
        return StreamingResponse(
            iter([json.dumps({"error": "Vector store not initialized"}) + "\n\n"]),
            media_type="text/event-stream"
        )

    async def event_generator():
        try:
            async for chunk in stream_answer(query, vector_store):
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            # Send end marker
            yield f"data: {json.dumps({'end': True})}\n\n"
        except Exception as e:
            logger.error(f"Error in chat streaming: {str(e)}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            yield f"data: {json.dumps({'end': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/chat")
async def chat(request: Request):
    """
    Initialize a chat query.

    This endpoint is used to validate the query before starting SSE streaming.

    Args:
        request: The HTTP request containing the query

    Returns:
        Dict: A success indicator
    """
    try:
        body = await request.json()
        query = body.get("query")

        if not query or query.strip() == "":
            raise HTTPException(status_code=400, detail="Query cannot be empty")

        if not vector_store:
            raise HTTPException(status_code=503, detail="Vector store not initialized")

        return {"success": True}
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5002)
