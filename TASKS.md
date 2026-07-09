# TillMate — Remaining Implementation Tasks

Ordered by increasing priority (implemented bottom-up in this order; P0 = most critical).
Each task is tested (jest / pytest / tsc) before being checked off.

## P5 — Polish
- [x] `mobile/utils/units.ts` — metric/imperial conversions + formatting, with unit tests

## P4 — Wiring gaps
- [x] `mobile/services/telemetryLogger.ts` — batch telemetry/command logs to backend (endpoints already exist), with tests
- [x] Hooks: `useInterval`, `useTelemetryThrottle`, `useMavlinkService` (connect lifecycle + store dispatch in one place)

## P3 — UX completeness
- [x] Load a saved plan from Saved Plans back into the Field Planner for re-use/re-send
- [x] Machine settings UI: implement width per machine (backend field exists), used as planner default
- [x] Real-time depth feedback: show actual depth (STM32 `IMPL_DEPTH`) next to target on control panel

## P2 — Mission integrity
- [x] Implement `downloadMission()` (read back mission after upload to verify), with handshake tests

## P1 — Execution monitoring
- [x] Parse `MISSION_CURRENT` (42) + `MISSION_ITEM_REACHED` (46); track live mission progress in store
- [x] Field View: show "Working point X of N" + highlight current work point + breadcrumb trail

## P0 — Mission run controls (completes the farmer loop)
- [x] Start Working (arm + MISSION_START), Pause (HOLD), Resume (AUTO), Return to Start (RTL) builders + service commands
- [x] Mission controls UI on Field View, guarded: disabled without GPS fix or with E-stop active
- [x] Safety pass: E-stop visible on operational screens, telemetry `--` on disconnect

## Not automatable here (user/hardware needed)
- [ ] Bench test against real Pixhawk + DroneBridge ESP32 (connection, telemetry, upload, run) per `11-testing-guide.md`
- [x] ~~Google Maps API key for Android production builds~~ — replaced with MapLibre + ESRI/OSM tiles (no API key needed)
- [x] ~~Real map rendering on web (currently list fallback)~~ — web now renders MapLibre via `react-map-gl`
