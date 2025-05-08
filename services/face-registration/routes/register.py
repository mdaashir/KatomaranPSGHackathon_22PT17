import logging
from datetime import datetime
import json
import os
from typing import Dict, List, Any
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, validator
from utils.encoding import decode_base64_image, encode_face

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Create data directory if it doesn't exist
os.makedirs(os.path.join("data"), exist_ok=True)
ENCODINGS_FILE = os.path.join("data", "encodings.json")

# RAG service URL
RAG_SERVICE_URL = os.getenv("RAG_SERVICE_URL", "http://localhost:8080")

# Define request model
class RegistrationRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    image: str = Field(..., min_length=10)  # Base64 encoded image

    @validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()

# Define response model
class RegistrationResponse(BaseModel):
    success: bool
    message: str
    user_id: str = None

# Helper function to load and save encodings
def load_encodings() -> List[Dict[str, Any]]:
    try:
        if os.path.exists(ENCODINGS_FILE) and os.path.getsize(ENCODINGS_FILE) > 0:
            with open(ENCODINGS_FILE, 'r') as f:
                return json.load(f)
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding encodings file: {e}")
        return []
    except Exception as e:
        logger.error(f"Error loading encodings: {e}")
        return []

def save_encoding(encoding_data: Dict[str, Any]):
    encodings = load_encodings()
    encodings.append(encoding_data)

    with open(ENCODINGS_FILE, 'w') as f:
        json.dump(encodings, f, indent=2)

async def notify_rag_service(event: Dict[str, Any]):
    """Notify RAG service of new face registration event."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{RAG_SERVICE_URL}/event",
                json=event,
                timeout=5.0
            )
            response.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to notify RAG service: {str(e)}")
        # Don't raise the error - we don't want to fail registration if RAG notification fails

@router.post("/register", response_model=RegistrationResponse)
async def register_face(request: RegistrationRequest):
    logger.info(f"Processing registration request for user: {request.name}")

    try:
        # Decode the base64 image
        image = decode_base64_image(request.image)
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image data")

        # Encode the face
        face_encoding, face_location = encode_face(image)

        if face_encoding is None:
            raise HTTPException(status_code=400, detail="No face detected in the image")

        # Generate a simple ID from name and timestamp
        timestamp = datetime.now().isoformat()
        user_id = f"{request.name.lower().replace(' ', '_')}_{timestamp.replace(':', '-')}"

        # Create encoding data
        encoding_data = {
            "id": user_id,
            "name": request.name,
            "encoding": face_encoding.tolist(),  # Convert numpy array to list for JSON serialization
            "timestamp": timestamp
        }

        # Save the encoding
        save_encoding(encoding_data)

        # Notify RAG service about the new registration
        event_data = {
            "id": user_id,
            "name": request.name,
            "timestamp": timestamp,
            "type": "registration"
        }
        await notify_rag_service(event_data)

        logger.info(f"Successfully registered face for user: {request.name}, ID: {user_id}")
        return RegistrationResponse(
            success=True,
            message="Face registered successfully",
            user_id=user_id
        )

    except HTTPException as e:
        # Re-raise HTTP exceptions
        logger.warning(f"Registration failed: {e.detail}")
        raise

    except Exception as e:
        logger.error(f"Error processing registration: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred during face registration: {str(e)}"
        )
