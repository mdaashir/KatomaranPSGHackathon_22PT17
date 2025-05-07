import os
import json
import logging
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Define response models
class FaceListResponse(BaseModel):
    faces: List[str]

class FaceDeleteResponse(BaseModel):
    deleted: bool
    name: str

# Path to the encodings file
ENCODINGS_FILE = os.path.join("data", "encodings.json")

def load_encodings() -> List[Dict[str, Any]]:
    """Load face encodings from JSON file."""
    try:
        if os.path.exists(ENCODINGS_FILE) and os.path.getsize(ENCODINGS_FILE) > 0:
            with open(ENCODINGS_FILE, 'r') as f:
                return json.load(f)
        return []
    except Exception as e:
        logger.error(f"Error loading encodings: {str(e)}", exc_info=True)
        return []

def save_encodings(encodings: List[Dict[str, Any]]) -> bool:
    """Save face encodings to JSON file."""
    try:
        # Ensure data directory exists
        os.makedirs(os.path.dirname(ENCODINGS_FILE), exist_ok=True)

        with open(ENCODINGS_FILE, 'w') as f:
            json.dump(encodings, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error saving encodings: {str(e)}", exc_info=True)
        return False

@router.get("/faces", response_model=FaceListResponse)
async def get_faces():
    """
    Get a list of all stored face names.

    Returns:
        List of face names
    """
    try:
        # Load encodings
        encodings = load_encodings()

        # Extract unique names
        face_names = list({entry.get("name", "") for entry in encodings if "name" in entry})

        logger.info(f"Retrieved {len(face_names)} stored faces")
        return FaceListResponse(faces=face_names)

    except Exception as e:
        logger.error(f"Error retrieving faces: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving face list")

@router.delete("/faces/{name}", response_model=FaceDeleteResponse)
async def delete_face(name: str = Path(..., description="Name of the person to delete")):
    """
    Delete a face from the stored encodings.

    Args:
        name: Name of the person to delete

    Returns:
        Deletion status
    """
    try:
        # Load encodings
        encodings = load_encodings()

        # Count the original number of entries
        original_count = len(encodings)

        # Filter out entries with the given name
        filtered_encodings = [entry for entry in encodings if entry.get("name") != name]

        # Check if any entries were removed
        if len(filtered_encodings) == original_count:
            raise HTTPException(status_code=404, detail=f"No face found with name: {name}")

        # Save the updated encodings
        if save_encodings(filtered_encodings):
            logger.info(f"Deleted face: {name}")
            return FaceDeleteResponse(deleted=True, name=name)
        else:
            raise HTTPException(status_code=500, detail="Error saving updated encodings")

    except HTTPException:
        # Re-raise HTTP exceptions
        raise

    except Exception as e:
        logger.error(f"Error deleting face: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error deleting face: {str(e)}")
