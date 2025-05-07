import os
import asyncio
import logging
from typing import List, Dict, Any, Optional

# LangChain imports
from langchain.vectorstores import FAISS
from langchain.embeddings import OpenAIEmbeddings
from langchain.document_loaders import DirectoryLoader, TextLoader, PDFLoader, CSVLoader, Docx2txtLoader, UnstructuredMarkdownLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)

# Set OpenAI API key from environment variable
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
if not OPENAI_API_KEY:
    logger.warning("OPENAI_API_KEY environment variable not set")

# Configure paths
DOCS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "docs")
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "vectorstore")

# Global vectorstore instance
_vectorstore = None

async def load_documents() -> List[Any]:
    """
    Load documents from the docs directory
    """
    logger.info(f"Loading documents from {DOCS_DIR}")

    # Ensure docs directory exists
    if not os.path.exists(DOCS_DIR):
        logger.warning(f"Documents directory not found: {DOCS_DIR}")
        os.makedirs(DOCS_DIR, exist_ok=True)
        return []

    loaders = [
        DirectoryLoader(DOCS_DIR, glob="**/*.txt", loader_cls=TextLoader),
        DirectoryLoader(DOCS_DIR, glob="**/*.pdf", loader_cls=PDFLoader),
        DirectoryLoader(DOCS_DIR, glob="**/*.csv", loader_cls=CSVLoader),
        DirectoryLoader(DOCS_DIR, glob="**/*.docx", loader_cls=Docx2txtLoader),
        DirectoryLoader(DOCS_DIR, glob="**/*.md", loader_cls=UnstructuredMarkdownLoader),
    ]

    documents = []
    for loader in loaders:
        try:
            docs = loader.load()
            logger.info(f"Loaded {len(docs)} documents with {loader.__class__.__name__}")
            documents.extend(docs)
        except Exception as e:
            logger.error(f"Error loading documents with {loader.__class__.__name__}: {str(e)}")

    logger.info(f"Total documents loaded: {len(documents)}")
    return documents

async def create_vectorstore() -> FAISS:
    """
    Create a new vector store from documents
    """
    # Load documents
    documents = await load_documents()

    if not documents:
        logger.warning("No documents loaded. Using empty vector store.")
        # Create embeddings with OpenAI
        embeddings = OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)
        # Create empty FAISS index
        return FAISS.from_texts(["Empty document store"], embeddings)

    # Split documents into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    chunks = text_splitter.split_documents(documents)
    logger.info(f"Split into {len(chunks)} chunks")

    # Create embeddings with OpenAI
    embeddings = OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)

    # Create FAISS index from documents
    vectorstore = FAISS.from_documents(chunks, embeddings)

    # Save the vectorstore
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    vectorstore.save_local(DB_PATH)
    logger.info(f"Vector store saved to {DB_PATH}")

    return vectorstore

async def load_vectorstore() -> Optional[FAISS]:
    """
    Load existing vector store or create new one
    """
    try:
        if os.path.exists(DB_PATH):
            logger.info(f"Loading existing vector store from {DB_PATH}")
            embeddings = OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)
            return FAISS.load_local(DB_PATH, embeddings)
    except Exception as e:
        logger.error(f"Error loading vector store: {str(e)}")

    logger.info("Creating new vector store")
    return await create_vectorstore()

async def get_vectorstore() -> FAISS:
    """
    Get or create the vector store
    """
    global _vectorstore

    if _vectorstore is None:
        _vectorstore = await load_vectorstore()

    return _vectorstore

async def search_documents(query: str, k: int = 5) -> List[Any]:
    """
    Search documents in the vector store
    """
    vectorstore = await get_vectorstore()
    results = vectorstore.similarity_search(query, k=k)
    return results
