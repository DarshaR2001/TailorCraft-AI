from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import ingestion, auth, tailor, export

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
app.include_router(export.router, prefix="/api/v1")

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "healthy", "service": "TailorCraft AI Backend"}
