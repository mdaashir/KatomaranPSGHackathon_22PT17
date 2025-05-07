import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from utils.encoding import decode_base64_image, encode_face
from utils.compare import find_face_match, push_match_to_node
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Define request model
class RecognitionRequest(BaseModel):
    image: str = Field(..., min_length=10)  # Base64 encoded image

# Define response models
class MatchResponse(BaseModel):
    match: bool
    name: Optional[str] = None
    timestamp: Optional[str] = None

@router.post("/recognize", response_model=MatchResponse)
async def recognize_face(request: RecognitionRequest):
    """
    Recognize a face in an image by comparing it with stored face encodings.

    Args:
        request: RecognitionRequest with base64 encoded image

    Returns:
        MatchResponse with match result
    """
    logger.info("Processing face recognition request")

    try:
        # Decode the base64 image
        image = decode_base64_image(request.image)
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image data")

        # Extract face encoding
        face_encoding, face_location = encode_face(image)

        if face_encoding is None:
            logger.warning("No face detected in the recognition request")
            return MatchResponse(match=False)

        # Find matching face
        is_match, match_data = find_face_match(face_encoding)

        # If we found a match, push the match event to Node.js for WebSocket broadcast
        if is_match and match_data:
            # Non-blocking push to Node backend
            push_match_to_node(match_data)

            # Return match result to client
            return MatchResponse(
                match=True,
                name=match_data["name"],
                timestamp=match_data["timestamp"]
            )
        else:
            # No match found
            return MatchResponse(match=False)

    except HTTPException as e:
        # Re-raise HTTP exceptions
        logger.warning(f"Recognition failed: {e.detail}")
        raise

    except Exception as e:
        logger.error(f"Error processing recognition request: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred during face recognition: {str(e)}"
        )
