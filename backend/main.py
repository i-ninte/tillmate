from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routers import machines, missions, telemetry


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("TillMate API starting...")
    yield
    # Shutdown
    print("TillMate API shutting down...")


# Create FastAPI app
app = FastAPI(
    title="TillMate API",
    description="Backend API for TillMate agricultural machine controller",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(
    machines.router,
    prefix=f"{settings.api_prefix}/machines",
    tags=["machines"],
)
app.include_router(
    missions.router,
    prefix=f"{settings.api_prefix}/missions",
    tags=["missions"],
)
app.include_router(
    telemetry.router,
    prefix=f"{settings.api_prefix}/telemetry",
    tags=["telemetry"],
)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "tillmate-api"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "TillMate API",
        "docs": "/docs",
        "version": "1.0.0",
    }
