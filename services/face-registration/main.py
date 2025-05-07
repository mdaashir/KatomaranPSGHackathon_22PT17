import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Import routes
from routes.register import router as register_router
from routes.recognize import router as recognize_router
from routes.faces import router as faces_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("face_recognition_service.log")
    ]
)

logger = logging.getLogger(__name__)

# Create data directory if it doesn't exist
os.makedirs("data", exist_ok=True)

app = FastAPI(
    title="Face Recognition API",
    description="API for face registration and recognition",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(register_router, tags=["registration"])
app.include_router(recognize_router, tags=["recognition"])
app.include_router(faces_router, tags=["face-management"])

@app.get("/")
async def root():
    return {"message": "Face Recognition API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Face Recognition API server")
    uvicorn.run("main:app", host="0.0.0.0", port=5001, reload=True)
