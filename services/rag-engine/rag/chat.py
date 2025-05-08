import os
import logging
import asyncio
from typing import AsyncGenerator, Any, List, Optional
from datetime import datetime

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_core.documents import Document

from .index import load_face_events

logger = logging.getLogger(__name__)

# Define the number of relevant documents to retrieve for each query
TOP_K = 4

# Template for generating answers based on retrieved context
PROMPT_TEMPLATE = """You are a helpful AI assistant for the Face Recognition Platform.
Use the following context about face registration events and documentation to answer the question:

{context}

Question: {query}

If the question is about face registration events (like who registered or when someone registered),
first check the context for face_event type documents. These contain the actual registration history.

If the context doesn't contain relevant face registration events, say that you don't have that information in your records.

Answer the question concisely and accurately using only information from the provided context.
Always include the specific time when answering questions about when someone was registered.
"""

async def format_docs(docs: List[Document]) -> str:
    """Format a list of documents into a string."""
    # Sort face event documents to show most recent first
    docs = sorted(
        docs,
        key=lambda x: x.metadata.get('timestamp', ''),
        reverse=True if any(d.metadata.get('type') == 'face_event' for d in docs) else False
    )
    return "\n\n".join(doc.page_content for doc in docs)

async def stream_answer(query: str, vector_store: Any) -> AsyncGenerator[str, None]:
    """
    Stream a response to a query using RAG.

    Args:
        query: The user's query
        vector_store: The vector store to query

    Yields:
        str: Chunks of the generated answer
    """
    try:
        # Set up the OpenAI language model
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning("OPENAI_API_KEY not found in environment variables")

        model = ChatOpenAI(
            model="gpt-4",  # Using GPT-4 for better comprehension
            streaming=True,
            temperature=0.7,
        )

        # Create a prompt template
        prompt = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)

        # For queries about most recent registrations, load events directly
        if "last" in query.lower() or "recent" in query.lower():
            events = load_face_events()
            if events:
                latest = events[-1]
                docs = [Document(
                    page_content=f"{latest['name']} was registered at {latest['timestamp']}",
                    metadata={"type": "face_event", "event_id": latest['id']}
                )]
            else:
                docs = []
        else:
            # Retrieve relevant documents from the vector store
            docs = await asyncio.to_thread(
                lambda: vector_store.similarity_search(query, k=TOP_K)
            )

        # Format the documents into context
        context = await format_docs(docs)

        # Create the RAG chain
        chain = (
            {"context": lambda x: context, "query": RunnablePassthrough()}
            | prompt
            | model
            | StrOutputParser()
        )

        # Stream the response
        async for chunk in chain.astream(query):
            yield chunk

    except Exception as e:
        logger.error(f"Error in stream_answer: {str(e)}")
        yield f"Error generating response: {str(e)}"
