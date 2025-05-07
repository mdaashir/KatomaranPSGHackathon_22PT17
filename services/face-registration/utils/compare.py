import logging
import numpy as np
import face_recognition
from typing import List, Dict, Any, Tuple, Optional
import json
import os
from datetime import datetime

logger = logging.getLogger(__name__)

def load_known_encodings() -> List[Dict[str, Any]]:
    """
    Load face encodings from the JSON storage file.

    Returns:
        List of dictionaries containing face encodings and metadata
    """
    encodings_file = os.path.join("data", "encodings.json")

    try:
        if not os.path.exists(encodings_file) or os.path.getsize(encodings_file) == 0:
            logger.warning(f"Encodings file {encodings_file} does not exist or is empty")
            return []

        with open(encodings_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading encodings: {str(e)}", exc_info=True)
        return []

def find_face_match(unknown_encoding: np.ndarray) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """
    Compare an unknown face encoding with known encodings to find a match.

    Args:
        unknown_encoding: Face encoding to compare (128-dimensional vector)

    Returns:
        Tuple containing:
            - Boolean indicating if a match was found
            - Dictionary with match details, or None if no match
    """
    # Ensure we're working with float64 precision
    unknown_encoding = np.array(unknown_encoding, dtype=np.float64)

    # Load known encodings
    known_faces = load_known_encodings()
    if not known_faces:
        logger.info("No known faces available for comparison")
        return False, None

    # Extract encodings and convert to numpy arrays with float64 precision
    known_encodings = [np.array(face["encoding"], dtype=np.float64) for face in known_faces]

    # Compare faces (tolerance=0.45 as specified)
    matches = face_recognition.compare_faces(known_encodings, unknown_encoding, tolerance=0.45)

    # Compute face distances for all known faces
    face_distances = face_recognition.face_distance(known_encodings, unknown_encoding)

    # Check if we have any matches
    if any(matches):
        # Find the best match (smallest distance)
        best_match_index = np.argmin(face_distances)

        if matches[best_match_index]:
            matched_person = known_faces[best_match_index]
            distance = float(face_distances[best_match_index])
            confidence = 1 - distance  # Convert distance to confidence score

            logger.info(f"Match found: {matched_person['name']} with confidence {confidence:.2f}")

            # Return match information
            return True, {
                "name": matched_person["name"],
                "user_id": matched_person.get("id", "unknown"),
                "confidence": confidence,
                "timestamp": datetime.now().isoformat()
            }

    logger.info("No match found for the face")
    return False, None

def push_match_to_node(match_data: Dict[str, Any]) -> bool:
    """
    Push match notification to Node.js backend for WebSocket broadcast.

    Args:
        match_data: Dictionary containing match information

    Returns:
        Boolean indicating success or failure
    """
    try:
        import requests

        # Prepare data for the Node.js backend
        payload = {
            "event": "match",
            "name": match_data["name"],
            "timestamp": match_data["timestamp"]
        }

        # Send to Node.js backend
        response = requests.post(
            "http://localhost:3001/api/push",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=2  # Short timeout to not block the main thread too long
        )

        if response.status_code == 200:
            logger.info(f"Successfully pushed match event to Node.js backend")
            return True
        else:
            logger.warning(f"Failed to push match to Node.js backend: {response.status_code}")
            return False

    except Exception as e:
        logger.error(f"Error pushing match to Node.js backend: {str(e)}", exc_info=True)
        return False
