import os
import logging
from typing import List, Optional, Dict
import glob
import json
from datetime import datetime

from langchain_community.document_loaders import (
    TextLoader,
    PDFMinerLoader,
    UnstructuredMarkdownLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

logger = logging.getLogger(__name__)

# Define paths for documents and vector store
DOCS_DIR = os.path.join(os.getcwd(), '../..', 'docs')
VECTOR_STORE_PATH = os.path.join(os.getcwd(), 'vector_store')
EVENTS_FILE = os.path.join(os.getcwd(), 'data', 'face_events.json')

# Constants for document splitting
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200

# Ensure data directory exists
os.makedirs(os.path.dirname(EVENTS_FILE), exist_ok=True)

def load_face_events() -> List[Dict]:
    """Load face registration events from JSON file."""
    if os.path.exists(EVENTS_FILE):
        with open(EVENTS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_face_event(event: Dict):
    """Save a new face registration event."""
    events = load_face_events()
    events.append(event)
    with open(EVENTS_FILE, 'w') as f:
        json.dump(events, f, indent=2)

    # Convert event to document for vector store
    doc = Document(
        page_content=f"{event['name']} was registered at {event['timestamp']}",
        metadata={"type": "face_event", "event_id": event['id']}
    )

    # Update vector store with new event
    vector_store = load_vector_store()
    if vector_store:
        vector_store.add_documents([doc])
        save_vector_store(vector_store)

def get_document_loader(file_path: str):
    """Return the appropriate document loader based on file extension."""
    ext = os.path.splitext(file_path)[1].lower()

    if ext == '.pdf':
        return PDFMinerLoader(file_path)
    elif ext == '.md':
        return UnstructuredMarkdownLoader(file_path)
    elif ext in ['.txt', '.csv', '.json']:
        return TextLoader(file_path)
    else:
        logger.warning(f"Unsupported file extension for {file_path}")
        return None

def load_documents(docs_dir: str = DOCS_DIR) -> List[Document]:
    """Load all supported documents from the specified directory."""
    documents = []

    # Define supported file extensions
    extensions = ['*.pdf', '*.md', '*.txt']

    for ext in extensions:
        # Get all matching files in docs directory and its subdirectories
        for file_path in glob.glob(os.path.join(docs_dir, '**', ext), recursive=True):
            try:
                loader = get_document_loader(file_path)
                if loader:
                    logger.info(f"Loading document: {file_path}")
                    docs = loader.load()
                    documents.extend(docs)
            except Exception as e:
                logger.error(f"Error loading {file_path}: {str(e)}")

    logger.info(f"Loaded {len(documents)} documents")
    return documents

def split_documents(documents: List[Document]) -> List[Document]:
    """Split documents into chunks."""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
    )

    split_docs = text_splitter.split_documents(documents)
    logger.info(f"Split into {len(split_docs)} chunks")
    return split_docs

def create_vector_store(documents: List[Document]) -> FAISS:
    """Create a FAISS vector store from documents."""
    try:
        embeddings = OpenAIEmbeddings()
        vector_store = FAISS.from_documents(documents, embeddings)
        logger.info("Vector store created successfully")
        return vector_store
    except Exception as e:
        logger.error(f"Error creating vector store: {str(e)}")
        raise

def save_vector_store(vector_store: FAISS, path: str = VECTOR_STORE_PATH):
    """Save the vector store to disk."""
    try:
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(path), exist_ok=True)
        vector_store.save_local(path)
        logger.info(f"Vector store saved to {path}")
    except Exception as e:
        logger.error(f"Error saving vector store: {str(e)}")

def load_vector_store(path: str = VECTOR_STORE_PATH):
    """Load the vector store from disk."""
    try:
        if os.path.exists(path):
            embeddings = OpenAIEmbeddings()
            vector_store = FAISS.load_local(path, embeddings)
            logger.info(f"Vector store loaded from {path}")
            return vector_store
        else:
            logger.warning(f"Vector store not found at {path}")
            return None
    except Exception as e:
        logger.error(f"Error loading vector store: {str(e)}")
        return None

def initialize_vector_store() -> FAISS:
    """Initialize or load the vector store."""
    # Try to load existing vector store
    vector_store = load_vector_store()

    # If no vector store exists, create a new one
    if vector_store is None:
        logger.info("Creating new vector store...")
        documents = load_documents()
        split_docs = split_documents(documents)
        vector_store = create_vector_store(split_docs)
        save_vector_store(vector_store)

    return vector_store
