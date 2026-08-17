from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import ingestion, auth, tailor

app = FastAPI(
    title="TailorCraft AI API",
    description="Automated AI Resume & Cover Letter Customization System API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingestion.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(tailor.router, prefix="/api/v1")

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "healthy", "service": "TailorCraft AI Backend"}

@app.get("/", tags=["System"], include_in_schema=False)
async def root():
    return {
        "service": "TailorCraft AI API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }

