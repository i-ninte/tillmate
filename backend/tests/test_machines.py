"""
Tests for the machines API endpoints.
"""

import pytest
from httpx import AsyncClient


class TestMachinesAPI:
    """Test suite for /api/v1/machines endpoints."""

    @pytest.mark.asyncio
    async def test_create_machine(self, client: AsyncClient, sample_machine_data: dict):
        """Test creating a new machine."""
        response = await client.post("/api/v1/machines", json=sample_machine_data)

        assert response.status_code == 200
        data = response.json()
        assert data["serial_number"] == sample_machine_data["serial_number"]
        assert data["display_name"] == sample_machine_data["display_name"]
        assert data["wifi_ssid"] == sample_machine_data["wifi_ssid"]
        assert "id" in data
        assert "created_at" in data

    @pytest.mark.asyncio
    async def test_create_machine_duplicate_serial(
        self, client: AsyncClient, sample_machine_data: dict
    ):
        """Test creating a machine with duplicate serial number."""
        # Create first machine
        await client.post("/api/v1/machines", json=sample_machine_data)

        # Try to create duplicate
        response = await client.post("/api/v1/machines", json=sample_machine_data)
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_list_machines(self, client: AsyncClient, sample_machine_data: dict):
        """Test listing all machines."""
        # Create a machine first
        await client.post("/api/v1/machines", json=sample_machine_data)

        response = await client.get("/api/v1/machines")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    @pytest.mark.asyncio
    async def test_get_machine_by_id(
        self, client: AsyncClient, sample_machine_data: dict
    ):
        """Test getting a machine by ID."""
        # Create a machine
        create_response = await client.post(
            "/api/v1/machines", json=sample_machine_data
        )
        machine_id = create_response.json()["id"]

        # Get the machine
        response = await client.get(f"/api/v1/machines/{machine_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == machine_id
        assert data["serial_number"] == sample_machine_data["serial_number"]

    @pytest.mark.asyncio
    async def test_get_machine_not_found(self, client: AsyncClient):
        """Test getting a non-existent machine."""
        response = await client.get("/api/v1/machines/9999")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_machine(self, client: AsyncClient, sample_machine_data: dict):
        """Test updating a machine."""
        # Create a machine
        create_response = await client.post(
            "/api/v1/machines", json=sample_machine_data
        )
        machine_id = create_response.json()["id"]

        # Update the machine
        update_data = {"display_name": "Updated Machine Name"}
        response = await client.patch(
            f"/api/v1/machines/{machine_id}", json=update_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["display_name"] == "Updated Machine Name"
        # Serial number should remain unchanged
        assert data["serial_number"] == sample_machine_data["serial_number"]

    @pytest.mark.asyncio
    async def test_delete_machine(self, client: AsyncClient, sample_machine_data: dict):
        """Test deleting a machine."""
        # Create a machine
        create_response = await client.post(
            "/api/v1/machines", json=sample_machine_data
        )
        machine_id = create_response.json()["id"]

        # Delete the machine
        response = await client.delete(f"/api/v1/machines/{machine_id}")
        assert response.status_code == 204

        # Verify it's deleted
        get_response = await client.get(f"/api/v1/machines/{machine_id}")
        assert get_response.status_code == 404
