import os
import logging
import asyncio
from typing import AsyncGenerator, Any, List, Optional

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_core.documents import Document

logger = logging.getLogger(__name__)

# Define the number of relevant documents to retrieve for each query
TOP_K = 4

# Template for generating answers based on retrieved context
PROMPT_TEMPLATE = """You are a helpful AI assistant for the Katomaran Hackathon event.
Answer the question based only on the following context:

{context}

Question: {query}

Answer the question concisely and accurately using only information from the provided context.
If the context doesn't contain the answer, respond with "I don't have information about that in my knowledge base."
"""

async def format_docs(docs: List[Document]) -> str:
    """Format a list of documents into a string."""
    return "\n\n".join([doc.page_content for doc in docs])

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
            model="gpt-4o",  # Use desired model: gpt-4-turbo, gpt-3.5-turbo, etc.
            streaming=True,
            temperature=0.7,
        )

        # Create a prompt template
        prompt = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)

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
