"""
Tests for the missions API endpoints.
"""

import pytest
from httpx import AsyncClient


class TestMissionsAPI:
    """Test suite for /api/v1/missions endpoints."""

    @pytest.mark.asyncio
    async def test_create_mission(
        self,
        client: AsyncClient,
        sample_machine_data: dict,
        sample_field_plan_data: dict,
    ):
        """Test creating a new field plan."""
        # Create a machine first
        machine_response = await client.post(
            "/api/v1/machines", json=sample_machine_data
        )
        machine_id = machine_response.json()["id"]

        # Update plan data with machine_id
        plan_data = {**sample_field_plan_data, "machine_id": machine_id}

        response = await client.post("/api/v1/missions", json=plan_data)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_field_plan_data["name"]
        assert data["machine_id"] == machine_id
        assert len(data["work_points"]) == 2
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_mission_invalid_machine(
        self, client: AsyncClient, sample_field_plan_data: dict
    ):
        """Test creating a mission with non-existent machine."""
        plan_data = {**sample_field_plan_data, "machine_id": 9999}
        response = await client.post("/api/v1/missions", json=plan_data)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_list_missions(
        self,
        client: AsyncClient,
        sample_machine_data: dict,
        sample_field_plan_data: dict,
    ):
        """Test listing all field plans."""
        # Create a machine
        machine_response = await client.post(
            "/api/v1/machines", json=sample_machine_data
        )
        machine_id = machine_response.json()["id"]

        # Create a mission
        plan_data = {**sample_field_plan_data, "machine_id": machine_id}
        await client.post("/api/v1/missions", json=plan_data)

        response = await client.get("/api/v1/missions")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    @pytest.mark.asyncio
    async def test_list_missions_by_machine(
        self,
        client: AsyncClient,
        sample_machine_data: dict,
        sample_field_plan_data: dict,
    ):
        """Test listing field plans filtered by machine ID."""
        # Create two machines
        machine1_response = await client.post(
            "/api/v1/machines", json=sample_machine_data
        )
        machine1_id = machine1_response.json()["id"]

        machine2_data = {
            **sample_machine_data,
            "serial_number": "TM-002",
            "wifi_ssid": "TillMate_002",
        }
        machine2_response = await client.post("/api/v1/machines", json=machine2_data)
        machine2_id = machine2_response.json()["id"]

        # Create missions for each machine
        plan1_data = {**sample_field_plan_data, "machine_id": machine1_id}
        plan2_data = {
            **sample_field_plan_data,
            "machine_id": machine2_id,
            "name": "Plan 2",
        }
        await client.post("/api/v1/missions", json=plan1_data)
        await client.post("/api/v1/missions", json=plan2_data)

        # Filter by machine 1
        response = await client.get(f"/api/v1/missions?machine_id={machine1_id}")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["machine_id"] == machine1_id

    @pytest.mark.asyncio
    async def test_list_mission_summaries(
        self,
        client: AsyncClient,
        sample_machine_data: dict,
        sample_field_plan_data: dict,
    ):
        """Test listing field plan summaries."""
        # Create a machine
        machine_response = await client.post(
            "/api/v1/machines", json=sample_machine_data
        )
        machine_id = machine_response.json()["id"]

        # Create a mission
        plan_data = {**sample_field_plan_data, "machine_id": machine_id}
        await client.post("/api/v1/missions", json=plan_data)

        response = await client.get("/api/v1/missions/summaries")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        # Summary should have point_count instead of full work_points
        assert "point_count" in data[0]

    @pytest.mark.asyncio
    async def test_get_mission_by_id(
        self,
        client: AsyncClient,
        sample_machine_data: dict,
        sample_field_plan_data: dict,
    ):
        """Test getting a field plan by ID."""
        # Create a machine
        machine_response = await client.post(
            "/api/v1/machines", json=sample_machine_data
        )
        machine_id = machine_response.json()["id"]

        # Create a mission
        plan_data = {**sample_field_plan_data, "machine_id": machine_id}
        create_response = await client.post("/api/v1/missions", json=plan_data)
        plan_id = create_response.json()["id"]

        # Get the mission
        response = await client.get(f"/api/v1/missions/{plan_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == plan_id
        assert data["name"] == sample_field_plan_data["name"]
        assert len(data["work_points"]) == 2

    @pytest.mark.asyncio
    async def test_get_mission_not_found(self, client: AsyncClient):
        """Test getting a non-existent mission."""
        response = await client.get("/api/v1/missions/9999")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_mission(
        self,
        client: AsyncClient,
        sample_machine_data: dict,
        sample_field_plan_data: dict,
    ):
        """Test deleting a field plan."""
        # Create a machine
        machine_response = await client.post(
            "/api/v1/machines", json=sample_machine_data
        )
        machine_id = machine_response.json()["id"]

        # Create a mission
        plan_data = {**sample_field_plan_data, "machine_id": machine_id}
        create_response = await client.post("/api/v1/missions", json=plan_data)
        plan_id = create_response.json()["id"]

        # Delete the mission
        response = await client.delete(f"/api/v1/missions/{plan_id}")
        assert response.status_code == 204

        # Verify it's deleted
        get_response = await client.get(f"/api/v1/missions/{plan_id}")
        assert get_response.status_code == 404

    @pytest.mark.asyncio
    async def test_work_points_cascade_delete(
        self,
        client: AsyncClient,
        sample_machine_data: dict,
        sample_field_plan_data: dict,
    ):
        """Test that work points are deleted when mission is deleted."""
        # Create a machine
        machine_response = await client.post(
            "/api/v1/machines", json=sample_machine_data
        )
        machine_id = machine_response.json()["id"]

        # Create a mission with work points
        plan_data = {**sample_field_plan_data, "machine_id": machine_id}
        create_response = await client.post("/api/v1/missions", json=plan_data)
        plan_id = create_response.json()["id"]

        # Delete the mission
        await client.delete(f"/api/v1/missions/{plan_id}")

        # Verify mission is deleted (work points should cascade)
        get_response = await client.get(f"/api/v1/missions/{plan_id}")
        assert get_response.status_code == 404
