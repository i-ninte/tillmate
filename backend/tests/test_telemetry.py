"""
Tests for the telemetry API endpoints.
"""

import pytest
from httpx import AsyncClient


class TestTelemetryAPI:
    """Test suite for /api/v1/telemetry endpoints."""

    @pytest.mark.asyncio
    async def test_batch_insert_telemetry(
        self,
        client: AsyncClient,
        sample_machine_data: dict,
        sample_telemetry_data: list[dict],
    ):
        """Test batch inserting telemetry logs."""
        # Create a machine first
        machine_response = await client.post(
            "/api/v1/machines", json=sample_machine_data
        )
        machine_id = machine_response.json()["id"]

        # Update telemetry data with machine_id
        telemetry_data = [
            {**entry, "machine_id": machine_id} for entry in sample_telemetry_data
        ]

        response = await client.post("/api/v1/telemetry/logs", json=telemetry_data)

        assert response.status_code == 200
        data = response.json()
        assert data["inserted"] == 2

    @pytest.mark.asyncio
    async def test_get_telemetry_logs(
        self,
        client: AsyncClient,
        sample_machine_data: dict,
        sample_telemetry_data: list[dict],
    ):
        """Test getting telemetry logs by machine and session."""
        # Create a machine
        machine_response = await client.post(
            "/api/v1/machines", json=sample_machine_data
        )
        machine_id = machine_response.json()["id"]

        # Insert telemetry
        telemetry_data = [
            {**entry, "machine_id": machine_id} for entry in sample_telemetry_data
        ]
        await client.post("/api/v1/telemetry/logs", json=telemetry_data)

        # Get logs
        session_id = sample_telemetry_data[0]["session_id"]
        response = await client.get(
            f"/api/v1/telemetry/logs?machine_id={machine_id}&session_id={session_id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2

    @pytest.mark.asyncio
    async def test_get_telemetry_logs_empty(self, client: AsyncClient):
        """Test getting logs for non-existent machine/session."""
        response = await client.get(
            "/api/v1/telemetry/logs?machine_id=9999&session_id=none"
        )
        assert response.status_code == 200
        data = response.json()
        assert data == []

    @pytest.mark.asyncio
    async def test_batch_insert_commands(
        self,
        client: AsyncClient,
        sample_machine_data: dict,
    ):
        """Test batch inserting command logs."""
        # Create a machine
        machine_response = await client.post(
            "/api/v1/machines", json=sample_machine_data
        )
        machine_id = machine_response.json()["id"]

        # Insert commands
        command_data = [
            {
                "machine_id": machine_id,
                "session_id": "test-session-001",
                "sent_at": "2026-03-27T10:00:00",
                "command_id": 181,
                "command_name": "DO_SET_RELAY",
                "param1": 0,
                "param2": 1,
                "source": "realtime",
            },
            {
                "machine_id": machine_id,
                "session_id": "test-session-001",
                "sent_at": "2026-03-27T10:00:01",
                "command_id": 183,
                "command_name": "DO_SET_SERVO",
                "param1": 9,
                "param2": 1500,
                "source": "realtime",
            },
        ]

        response = await client.post("/api/v1/telemetry/commands", json=command_data)

        assert response.status_code == 200
        data = response.json()
        assert data["inserted"] == 2

    @pytest.mark.asyncio
    async def test_get_command_logs(
        self,
        client: AsyncClient,
        sample_machine_data: dict,
    ):
        """Test getting command logs by machine and session."""
        # Create a machine
        machine_response = await client.post(
            "/api/v1/machines", json=sample_machine_data
        )
        machine_id = machine_response.json()["id"]

        # Insert commands
        command_data = [
            {
                "machine_id": machine_id,
                "session_id": "test-session-002",
                "sent_at": "2026-03-27T10:00:00",
                "command_id": 181,
                "command_name": "DO_SET_RELAY",
                "param1": 0,
                "param2": 1,
                "source": "realtime",
            },
        ]
        await client.post("/api/v1/telemetry/commands", json=command_data)

        # Get commands
        response = await client.get(
            f"/api/v1/telemetry/commands?machine_id={machine_id}&session_id=test-session-002"
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["command_name"] == "DO_SET_RELAY"


class TestHealthEndpoints:
    """Test suite for health check endpoints."""

    @pytest.mark.asyncio
    async def test_health_check(self, client: AsyncClient):
        """Test the health check endpoint."""
        response = await client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_root_endpoint(self, client: AsyncClient):
        """Test the root endpoint."""
        response = await client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
