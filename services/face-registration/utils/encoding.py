import logging
import base64
from typing import Tuple, Optional, List
import numpy as np
from io import BytesIO
import face_recognition
from PIL import Image

logger = logging.getLogger(__name__)

def decode_base64_image(base64_string: str) -> Optional[np.ndarray]:
    """
    Decode a base64 image string to a numpy array for face_recognition.

    Args:
        base64_string: Base64 encoded image string, may or may not include the data URL prefix.

    Returns:
        numpy.ndarray: Image as numpy array in RGB format, or None if decoding fails.
    """
    try:
        # Check if the base64 string includes the data URL prefix
        if ',' in base64_string:
            # Split off the data URL prefix (e.g., "data:image/jpeg;base64,")
            base64_string = base64_string.split(',', 1)[1]

        # Decode the base64 string
        image_data = base64.b64decode(base64_string)

        # Convert to PIL Image
        pil_image = Image.open(BytesIO(image_data))

        # Convert to RGB if needed (face_recognition expects RGB)
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')

        # Convert to numpy array
        return np.array(pil_image)

    except Exception as e:
        logger.error(f"Error decoding base64 image: {str(e)}", exc_info=True)
        return None

def encode_face(image: np.ndarray) -> Tuple[Optional[np.ndarray], Optional[List]]:
    """
    Detect and encode a face in the given image.

    Args:
        image: Numpy array of the image in RGB format.

    Returns:
        Tuple containing:
            - face_encoding: 128-dimensional encoding of the face, or None if no face found.
            - face_location: Coordinates of the face in the image, or None if no face found.
    """
    try:
        # Find all face locations in the image
        face_locations = face_recognition.face_locations(image)

        # Check if we found at least one face
        if not face_locations:
            logger.warning("No faces found in the image")
            return None, None

        # Check if there's more than one face
        if len(face_locations) > 1:
            logger.warning(f"Multiple faces detected ({len(face_locations)}). Using only the first one.")

        # Use the first face found
        face_location = face_locations[0]

        # Generate the face encoding
        face_encodings = face_recognition.face_encodings(image, [face_location])

        if not face_encodings:
            logger.warning("Could not generate face encoding despite detecting a face")
            return None, None

        # Return the encoding and location
        return face_encodings[0], face_location

    except Exception as e:
        logger.error(f"Error encoding face: {str(e)}", exc_info=True)
        return None, None

def is_valid_face_image(image: np.ndarray) -> bool:
    """
    Check if the image contains a valid face.

    Args:
        image: Numpy array of the image.

    Returns:
        bool: True if a valid face was found, False otherwise.
    """
    try:
        face_locations = face_recognition.face_locations(image)
        return len(face_locations) > 0
    except Exception:
        return False
