"""
Pytest configuration and fixtures for backend tests.
"""

import asyncio
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from database import Base, get_db
from main import app
from config import settings

# Use SQLite for testing (in-memory)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
TEST_DATABASE_URL_SYNC = "sqlite:///:memory:"

# Create test engines
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
)

test_sync_engine = create_engine(
    TEST_DATABASE_URL_SYNC,
    echo=False,
)

TestAsyncSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for each test."""
    # Create tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestAsyncSessionLocal() as session:
        yield session

    # Drop tables after test
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create an async HTTP client for testing endpoints."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        follow_redirects=True,
    ) as client:
        yield client

    app.dependency_overrides.clear()


# Sample test data fixtures

@pytest.fixture
def sample_machine_data() -> dict:
    """Sample machine registration data."""
    return {
        "serial_number": "TM-001",
        "display_name": "Test Machine 1",
        "wifi_ssid": "TillMate_001",
        "actuator_min_mm": 0,
        "actuator_max_mm": 200,
        "battery_warn_v": 44.0,
        "battery_critical_v": 42.0,
    }


@pytest.fixture
def sample_field_plan_data() -> dict:
    """Sample field plan data."""
    return {
        "machine_id": 1,
        "name": "Test Field Plan",
        "notes": "A test plan",
        "work_points": [
            {
                "seq": 0,
                "lat": 37.7749,
                "lon": -122.4194,
                "implement_lowered": True,
                "tiller_on": True,
                "pump_on": False,
                "label": "Point 1",
            },
            {
                "seq": 1,
                "lat": 37.7750,
                "lon": -122.4195,
                "implement_lowered": True,
                "tiller_on": True,
                "pump_on": True,
                "label": "Point 2",
            },
        ],
    }


@pytest.fixture
def sample_telemetry_data() -> list[dict]:
    """Sample telemetry log entries."""
    return [
        {
            "machine_id": 1,
            "session_id": "test-session-001",
            "recorded_at": "2026-03-27T10:00:00",
            "battery_voltage_v": 48.5,
            "battery_pct": 85,
            "gps_fixed": True,
            "lat": 37.7749,
            "lon": -122.4194,
            "speed_kmh": 5.5,
            "pixhawk_temp_c": 45.0,
            "machine_temp_c": 38.0,
            "implement_depth_cm": 15.0,
            "estop_active": False,
            "mode": "AUTO",
        },
        {
            "machine_id": 1,
            "session_id": "test-session-001",
            "recorded_at": "2026-03-27T10:00:01",
            "battery_voltage_v": 48.4,
            "battery_pct": 84,
            "gps_fixed": True,
            "lat": 37.7750,
            "lon": -122.4195,
            "speed_kmh": 5.6,
            "pixhawk_temp_c": 45.5,
            "machine_temp_c": 38.5,
            "implement_depth_cm": 15.5,
            "estop_active": False,
            "mode": "AUTO",
        },
    ]
