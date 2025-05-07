import os
import json
import logging
from typing import List, Dict, Any, AsyncGenerator

# LangChain imports
from langchain.chat_models import ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain.schema.output_parser import StrOutputParser
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema import Document

# Local imports
from .index import get_vectorstore, search_documents

logger = logging.getLogger(__name__)

# Set OpenAI API key from environment variable
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# Define the prompt template for RAG
RAG_PROMPT_TEMPLATE = """
You are a helpful AI assistant integrated into an event management system.
Answer the user's question based on the provided context.
If you don't know the answer or can't find it in the context, say so politely.
Do not make up information or hallucinate facts.

Context:
{context}

Question:
{query}

Answer (be concise and helpful):
"""

# Create the prompt
QA_PROMPT = PromptTemplate(
    template=RAG_PROMPT_TEMPLATE,
    input_variables=["context", "query"],
)

class CustomStreamingCallbackHandler(StreamingStdOutCallbackHandler):
    """Custom callback handler for streaming responses"""

    def __init__(self):
        super().__init__()
        self.tokens = []

    def on_llm_new_token(self, token: str, **kwargs):
        self.tokens.append(token)

    def get_tokens(self) -> List[str]:
        return self.tokens

def format_docs(docs: List[Document]) -> str:
    """Format documents into a context string"""
    return "\n\n".join([doc.page_content for doc in docs])

async def create_chat_response(query: str) -> str:
    """
    Create a non-streaming response using RAG
    """
    try:
        # Get the vector store
        vectorstore = await get_vectorstore()

        # Set up the LLM
        llm = ChatOpenAI(
            model_name="gpt-4-turbo",  # Use "gpt-3.5-turbo" for cost savings
            openai_api_key=OPENAI_API_KEY,
            temperature=0.7,
            verbose=True
        )

        # Create the RAG pipeline
        retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
        rag_chain = (
            {"context": retriever | format_docs, "query": RunnablePassthrough()}
            | QA_PROMPT
            | llm
            | StrOutputParser()
        )

        # Execute the chain
        response = await rag_chain.ainvoke(query)
        return response

    except Exception as e:
        logger.error(f"Error generating chat response: {str(e)}")
        return "I'm sorry, I encountered an error while processing your request."

async def stream_chat_response(query: str) -> AsyncGenerator[str, None]:
    """
    Stream a response using RAG
    """
    try:
        # Get relevant documents
        docs = await search_documents(query, k=5)
        context = format_docs(docs)

        # Set up the streaming LLM
        llm = ChatOpenAI(
            model_name="gpt-4-turbo",  # Use "gpt-3.5-turbo" for cost savings
            openai_api_key=OPENAI_API_KEY,
            temperature=0.7,
            streaming=True,
            verbose=True
        )

        # Prepare the prompt
        prompt = QA_PROMPT.format(context=context, query=query)

        # Stream the response
        async for chunk in llm.astream(prompt):
            if hasattr(chunk, 'content'):
                yield json.dumps({"content": chunk.content})

    except Exception as e:
        logger.error(f"Error streaming chat response: {str(e)}")
        yield json.dumps({"content": "I'm sorry, I encountered an error while processing your request."})
