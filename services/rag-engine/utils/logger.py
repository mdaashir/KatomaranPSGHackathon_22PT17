import os
import logging
import json
from datetime import datetime
from logging.handlers import RotatingFileHandler

# Create logs directory if it doesn't exist
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'logs')
os.makedirs(log_dir, exist_ok=True)

# Custom JSON formatter
class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_obj = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "service": "rag-engine",
            "module": record.module,
            "function": record.funcName,
        }
        if hasattr(record, 'query_id'):
            log_obj['query_id'] = record.query_id
        if hasattr(record, 'duration_ms'):
            log_obj['duration_ms'] = record.duration_ms
        if hasattr(record, 'tokens_used'):
            log_obj['tokens_used'] = record.tokens_used
        if record.exc_info:
            log_obj['error'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
            }
        return json.dumps(log_obj)

# Configure root logger
logger = logging.getLogger('rag-engine')
logger.setLevel(logging.INFO)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setFormatter(JsonFormatter())
logger.addHandler(console_handler)

# File handler with rotation
file_handler = RotatingFileHandler(
    os.path.join(log_dir, 'rag-engine.log'),
    maxBytes=10*1024*1024,  # 10MB
    backupCount=5
)
file_handler.setFormatter(JsonFormatter())
logger.addHandler(file_handler)

# Specialized loggers
query_logger = logger.getChild('query')
vector_logger = logger.getChild('vector')
chat_logger = logger.getChild('chat')

def log_query_event(query_id=None, query=None, duration_ms=None, success=True, error=None):
    """Log query processing events with consistent structure"""
    extra = {'query_id': query_id}
    if duration_ms:
        extra['duration_ms'] = duration_ms

    if success:
        query_logger.info(f"Query processed successfully: {query[:100]}...", extra=extra)
    else:
        query_logger.error(f"Query processing failed: {query[:100]}...", exc_info=error, extra=extra)

def log_vector_event(query_id=None, operation=None, duration_ms=None, success=True, error=None):
    """Log vector store operations with consistent structure"""
    extra = {'query_id': query_id}
    if duration_ms:
        extra['duration_ms'] = duration_ms

    if success:
        vector_logger.info(f"Vector store {operation} successful", extra=extra)
    else:
        vector_logger.error(f"Vector store {operation} failed", exc_info=error, extra=extra)

def log_chat_event(query_id=None, tokens_used=None, duration_ms=None, success=True, error=None):
    """Log chat completion events with consistent structure"""
    extra = {
        'query_id': query_id,
        'tokens_used': tokens_used,
        'duration_ms': duration_ms
    }

    if success:
        chat_logger.info("Chat completion successful", extra=extra)
    else:
        chat_logger.error("Chat completion failed", exc_info=error, extra=extra)
