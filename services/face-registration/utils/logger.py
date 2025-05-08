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
            "service": "face-recognition",
            "module": record.module,
            "function": record.funcName,
        }
        if hasattr(record, 'face_id'):
            log_obj['face_id'] = record.face_id
        if hasattr(record, 'duration_ms'):
            log_obj['duration_ms'] = record.duration_ms
        if record.exc_info:
            log_obj['error'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
            }
        return json.dumps(log_obj)

# Configure root logger
logger = logging.getLogger('face-recognition')
logger.setLevel(logging.INFO)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setFormatter(JsonFormatter())
logger.addHandler(console_handler)

# File handler with rotation
file_handler = RotatingFileHandler(
    os.path.join(log_dir, 'face-recognition.log'),
    maxBytes=10*1024*1024,  # 10MB
    backupCount=5
)
file_handler.setFormatter(JsonFormatter())
logger.addHandler(file_handler)

# Specialized loggers
recognition_logger = logger.getChild('recognition')
encoding_logger = logger.getChild('encoding')
storage_logger = logger.getChild('storage')

def log_recognition_event(face_id=None, duration_ms=None, success=True, error=None):
    """Log face recognition events with consistent structure"""
    extra = {'face_id': face_id}
    if duration_ms:
        extra['duration_ms'] = duration_ms

    if success:
        recognition_logger.info(f"Face recognition successful for ID: {face_id}", extra=extra)
    else:
        recognition_logger.error(f"Face recognition failed for ID: {face_id}", exc_info=error, extra=extra)

def log_encoding_event(face_id=None, duration_ms=None, success=True, error=None):
    """Log face encoding events with consistent structure"""
    extra = {'face_id': face_id}
    if duration_ms:
        extra['duration_ms'] = duration_ms

    if success:
        encoding_logger.info(f"Face encoding successful for ID: {face_id}", extra=extra)
    else:
        encoding_logger.error(f"Face encoding failed for ID: {face_id}", exc_info=error, extra=extra)

def log_storage_event(face_id=None, operation=None, success=True, error=None):
    """Log storage operations with consistent structure"""
    extra = {'face_id': face_id, 'operation': operation}

    if success:
        storage_logger.info(f"{operation} successful for ID: {face_id}", extra=extra)
    else:
        storage_logger.error(f"{operation} failed for ID: {face_id}", exc_info=error, extra=extra)
