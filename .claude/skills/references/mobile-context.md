# Mobile App — Codebase Context

> **Purpose:** This file provides Claude with instant context about the mobile codebase without rescanning. Update this file after every code change.

---

## Project Location

```
/mobile/                    # React Native (Expo) app root
```

---

## Implementation Status

### Core Setup
| Item | Status | Location |
|------|--------|----------|
| Expo project initialized | COMPLETE | `/mobile/` |
| TypeScript configured | COMPLETE | `/mobile/tsconfig.json` |
| Dependencies installed | COMPLETE | `/mobile/package.json` |
| App permissions | COMPLETE | `/mobile/app.json` |

### Navigation (Expo Router)
| Screen | Status | Location |
|--------|--------|----------|
| Root layout | COMPLETE | `/mobile/app/_layout.tsx` |
| Tabs layout | COMPLETE | `/mobile/app/(tabs)/_layout.tsx` |
| Connection screen | COMPLETE | `/mobile/app/index.tsx` |
| Field view screen (tab) | COMPLETE | `/mobile/app/(tabs)/field-view.tsx` |
| Field planner screen (tab) | COMPLETE | `/mobile/app/(tabs)/field-planner.tsx` |
| Saved plans screen (tab) | COMPLETE | `/mobile/app/(tabs)/saved-plans.tsx` |
| Settings screen (tab) | COMPLETE | `/mobile/app/(tabs)/settings.tsx` |

### Zustand Stores
| Store | Status | Location | Key State |
|-------|--------|----------|-----------|
| connectionStore | COMPLETE | `/mobile/store/connectionStore.ts` | `connected`, `lastHeartbeatMs` |
| telemetryStore | COMPLETE | `/mobile/store/telemetryStore.ts` | All telemetry values, `headlightsOn`, `satellites` |
| controlStore | COMPLETE | `/mobile/store/controlStore.ts` | `tiller`, `pump`, `headlights`, `depth` |
| missionStore | COMPLETE | `/mobile/store/missionStore.ts` | `fieldPlan`, `uploadState`, `returnToHome` |

### MAVLink Services
| Service | Status | Location | Purpose |
|---------|--------|----------|---------|
| MavlinkService | COMPLETE | `/mobile/services/MavlinkService.ts` | UDP socket singleton; telemetry, mission protocol send/waitForMessage |
| MAVLink parser/encoders | COMPLETE | `/mobile/utils/mavlinkParser.ts` | Bytes ↔ messages (heartbeat, mission protocol, commands, telemetry) |
| missionCompiler | COMPLETE | `/mobile/services/missionCompiler.ts` | FieldPlan → MissionItems (depth-aware servo PWM) |
| coveragePlanner | COMPLETE | `/mobile/services/coveragePlanner.ts` | Boundary polygon + implement width → serpentine coverage path |
| operations | COMPLETE | `/mobile/services/operations.ts` | Operation configs (tilling/weeding/spraying), depth→PWM, apply op to points |
| simulation | COMPLETE | `/mobile/services/simulation.ts` | Pure path-following math for route preview |
| missionUploader | COMPLETE | `/mobile/services/missionUploader.ts` | Upload handshake |
| telemetryLogger | COMPLETE | `/mobile/services/telemetryLogger.ts` | Batched telemetry/command logging with offline retry |

### Dashboard Components
| Component | Status | Location |
|-----------|--------|----------|
| FarmDashboard | COMPLETE | `/mobile/components/dashboard/FarmDashboard.tsx` |
| DashTile | COMPLETE | `/mobile/components/dashboard/DashTile.tsx` |

### Control Components
| Component | Status | Location |
|-----------|--------|----------|
| FarmControlPanel | COMPLETE | `/mobile/components/controls/FarmControlPanel.tsx` |
| DepthSlider | COMPLETE | `/mobile/components/controls/DepthSlider.tsx` |
| RelayButton | COMPLETE | `/mobile/components/controls/RelayButton.tsx` |
| EmergencyStopButton | COMPLETE | `/mobile/components/controls/EmergencyStopButton.tsx` |
| MissionRunControls | COMPLETE | `/mobile/components/controls/MissionRunControls.tsx` |

### Mission Components
| Component | Status | Location |
|-----------|--------|----------|
| FieldMap | COMPLETE | `/mobile/components/mission/FieldMap.tsx` |
| WorkPointEditor | COMPLETE | `/mobile/components/mission/WorkPointEditor.tsx` |
| WorkPointMarker | COMPLETE | `/mobile/components/mission/WorkPointMarker.tsx` |
| OperationPanel | COMPLETE | `/mobile/components/mission/OperationPanel.tsx` |

### Common Components
| Component | Status | Location |
|-----------|--------|----------|
| BigButton | COMPLETE | `/mobile/components/common/BigButton.tsx` |
| StatusBadge | COMPLETE | `/mobile/components/common/StatusBadge.tsx` |
| ConnectionBanner | COMPLETE | `/mobile/components/common/ConnectionBanner.tsx` |

### API Client
| Module | Status | Location |
|--------|--------|----------|
| client | COMPLETE | `/mobile/api/client.ts` |
| machines | COMPLETE | `/mobile/api/machines.ts` |
| missions | COMPLETE | `/mobile/api/missions.ts` |
| telemetry | COMPLETE | `/mobile/api/telemetry.ts` |

### Types
| Type File | Status | Location |
|-----------|--------|----------|
| mavlink.ts | COMPLETE | `/mobile/types/mavlink.ts` |
| mission.ts | COMPLETE | `/mobile/types/mission.ts` |

### Utils
| Util | Status | Location |
|------|--------|----------|
| mavlinkBuilders | COMPLETE | `/mobile/utils/mavlinkBuilders.ts` |
| mavlinkConstants | COMPLETE | `/mobile/utils/mavlinkConstants.ts` |
| units | COMPLETE | `/mobile/utils/units.ts` |

### Hooks
| Hook | Status | Location |
|------|--------|----------|
| useSimulation | COMPLETE | `/mobile/hooks/useSimulation.ts` |
| useMavlinkService | COMPLETE | `/mobile/hooks/useMavlinkService.ts` |
| useInterval | COMPLETE | `/mobile/hooks/useInterval.ts` |
| useTelemetryThrottle | COMPLETE | `/mobile/hooks/useTelemetryThrottle.ts` |

### Constants
| File | Status | Location |
|------|--------|----------|
| colors.ts | COMPLETE | `/mobile/constants/colors.ts` |
| layout.ts | COMPLETE | `/mobile/constants/layout.ts` |
| mapStyle.ts | COMPLETE | `/mobile/constants/mapStyle.ts` |

### Tests
| Test | Status | Location |
|------|--------|----------|
| MAVLink builder tests | COMPLETE | `/mobile/__tests__/mavlinkBuilders.test.ts` |
| Mission compiler tests | COMPLETE | `/mobile/__tests__/missionCompiler.test.ts` |
| Coverage planner tests | COMPLETE | `/mobile/__tests__/coveragePlanner.test.ts` |
| Operations tests | COMPLETE | `/mobile/__tests__/operations.test.ts` |
| Simulation tests | COMPLETE | `/mobile/__tests__/simulation.test.ts` |
| Mission upload/download tests | COMPLETE | `/mobile/__tests__/missionUpload.test.ts` |
| Telemetry logger tests | COMPLETE | `/mobile/__tests__/telemetryLogger.test.ts` |
| Execution progress tests | COMPLETE | `/mobile/__tests__/executionProgress.test.ts` |
| Mission run controls tests | COMPLETE | `/mobile/__tests__/missionRunControls.test.ts` |
| Unit converter tests | COMPLETE | `/mobile/__tests__/units.test.ts` |

---

## Key Patterns & Conventions

### State Updates
- Zustand stores use the `create` function from zustand
- Telemetry updates via `useTelemetryStore.getState().update(partial)`
- Connection state triggers navigation

### MAVLink Flow (IMPLEMENTED)
1. `mavlinkService.connect()` opens UDP socket on port 14551 (talks to DroneBridge on `:14550`)
2. Incoming bytes → `utils/mavlinkParser.parseBuffer` → `MavlinkService` dispatches:
   - Telemetry → `telemetryStore.update` + `telemetryLogger.logTelemetry`
   - Mission progress (MISSION_CURRENT / MISSION_ITEM_REACHED) → `missionStore.setExecutionProgress`
   - Mission protocol responses (REQUEST_INT, ACK, COUNT, ITEM_INT) → wake `waitForMessage` waiters
3. Commands built via `utils/mavlinkBuilders` → `mavlinkService.sendCommand` (or `sendMissionCount` / `sendMissionItemInt` / `sendMissionRequestList` for the mission protocol)
4. Mission upload/download: `services/missionUploader.uploadMission` + `downloadMission` + `verifyMissionMatches`

### Component Naming
- Dashboard: `*Dashboard.tsx`, `*Tile.tsx`
- Controls: `*Slider.tsx`, `*Button.tsx`
- Mission: `Field*.tsx`, `WorkPoint*.tsx`

### Color Scheme (from TillMate logo)
- Primary Green: `#4A7C23`
- Earth Brown: `#A67C3D`
- Dark: `#333333`
- Background: `#121212`

---

## Recent Changes

| Date | Change | Files Modified |
|------|--------|----------------|
| 2026-03-26 | Initial project setup | All files |
| 2026-03-26 | Created Expo project with TypeScript | package.json, app.json, tsconfig.json |
| 2026-03-26 | Created all Zustand stores | store/*.ts |
| 2026-03-26 | Created app navigation | app/_layout.tsx, app/*.tsx |
| 2026-03-26 | Created dashboard components | components/dashboard/*.tsx |
| 2026-03-26 | Created control components | components/controls/*.tsx |
| 2026-03-26 | Created common components | components/common/*.tsx |
| 2026-03-26 | Created TypeScript types | types/*.ts |
| 2026-03-26 | Created API client | api/*.ts |
| 2026-03-26 | Created constants | constants/*.ts |
| 2026-03-26 | Added mission map components | components/mission/*.tsx |
| 2026-03-26 | Updated field-planner with map | app/field-planner.tsx |
| 2026-03-26 | Fixed Expo Router entry point | package.json (main: expo-router/entry) |
| 2026-03-26 | Fixed react-native-maps web error | FieldMap.tsx (conditional import) |
| 2026-03-26 | Fixed Reanimated web error | field-planner.tsx (conditional WorkPointEditor import, Modal for web) |
| 2026-03-27 | Added tab navigation with 4 tabs | app/(tabs)/_layout.tsx, (tabs)/*.tsx |
| 2026-03-27 | Implemented mission compiler | services/missionCompiler.ts |
| 2026-03-27 | Implemented mission uploader | services/missionUploader.ts |
| 2026-03-27 | Created MAVLink utilities | utils/mavlinkBuilders.ts, mavlinkConstants.ts |
| 2026-03-27 | Added compact mode to FarmDashboard | components/dashboard/FarmDashboard.tsx, DashTile.tsx |
| 2026-03-27 | Added Saved Plans screen | app/(tabs)/saved-plans.tsx |
| 2026-03-27 | Added Settings screen | app/(tabs)/settings.tsx |
| 2026-03-27 | Updated API with proper type transformations | api/missions.ts |
| 2026-03-27 | Added unit tests | __tests__/missionCompiler.test.ts, mavlinkBuilders.test.ts |
| 2026-03-27 | Added expo-location for GPS permissions | app.json, package.json |
| 2026-03-27 | Fixed FieldMap to show real map (removed Google Maps requirement) | components/mission/FieldMap.tsx |
| 2026-03-27 | Added location permission handling to FieldMap | components/mission/FieldMap.tsx |
| 2026-03-27 | Added work point action prompt on add | components/mission/FieldMap.tsx |
| 2026-03-27 | Added GPS satellites count to dashboard | components/dashboard/FarmDashboard.tsx |
| 2026-03-27 | Added headlights control to telemetry and controls | store/telemetryStore.ts, store/controlStore.ts |
| 2026-03-27 | Added headlights relay channel | types/mavlink.ts |
| 2026-03-27 | Added headlights tile to dashboard | components/dashboard/FarmDashboard.tsx |
| 2026-03-27 | Added headlights toggle button to control panel | components/controls/FarmControlPanel.tsx |
| 2026-03-27 | Added Return to Home toggle to field planner | app/(tabs)/field-planner.tsx |
| 2026-03-27 | Added returnToHome to FieldPlan type and missionStore | types/mission.ts, store/missionStore.ts |
| 2026-03-27 | Added NAV_RETURN_TO_LAUNCH to mission compiler | services/missionCompiler.ts |
| 2026-03-27 | Added machine location marker to FieldMap | components/mission/FieldMap.tsx |
| 2026-03-27 | Added GPS status overlay to field-view | app/(tabs)/field-view.tsx |
| 2026-03-27 | Added headlights color to colors.ts | constants/colors.ts |
| 2026-03-28 | Added cross-platform location (web + native) | components/mission/FieldMap.tsx |
| 2026-03-28 | Updated API client for returnToHome, satellites, headlights | api/missions.ts |
| 2026-03-28 | Updated types for backend integration | types/mission.ts |
| 2026-03-28 | Added web location status display | components/mission/FieldMap.tsx |
| 2026-07-09 | Added jest test runner (jest 29 + ts-jest) | package.json |
| 2026-07-09 | QGC-style coverage planner (polygon → serpentine path) | services/coveragePlanner.ts, __tests__/coveragePlanner.test.ts |
| 2026-07-09 | Operation types (tilling/weeding/spraying) + depth→PWM | services/operations.ts, types/mission.ts, services/missionCompiler.ts, __tests__/operations.test.ts |
| 2026-07-09 | missionStore: setOperation/setDepthCm/setImplementWidth/setBoundary/generatePath | store/missionStore.ts |
| 2026-07-09 | FieldMap boundary-drawing mode (polygon, corner markers, undo) | components/mission/FieldMap.tsx |
| 2026-07-09 | OperationPanel (operation picker + depth/width steppers) | components/mission/OperationPanel.tsx |
| 2026-07-09 | Route simulation preview (play/stop, animated marker) | services/simulation.ts, hooks/useSimulation.ts, app/(tabs)/field-planner.tsx |
| 2026-07-09 | Field planner: Draw Field / Route Points modes + Generate Route | app/(tabs)/field-planner.tsx |
| 2026-07-09 | API round-trips operation/depth/width/boundary | api/missions.ts |
| 2026-07-09 | Mission protocol encoders/parsers (COUNT, CLEAR_ALL, ITEM_INT, REQUEST, ACK) | utils/mavlinkParser.ts, types/mavlink.ts |
| 2026-07-09 | MavlinkService implements MavlinkSender/Receiver (waitForMessage + mission sends) | services/MavlinkService.ts |
| 2026-07-09 | Send to Machine wired: compile → validate → uploadMission with live progress; simulation-mode fallback | app/(tabs)/field-planner.tsx, __tests__/missionUpload.test.ts |
| 2026-07-09 | units.ts conversions/formatting + tests | utils/units.ts, __tests__/units.test.ts |
| 2026-07-09 | telemetryLogger (batching, offline retry, session lifecycle) + tests | services/telemetryLogger.ts, __tests__/telemetryLogger.test.ts |
| 2026-07-09 | Hooks: useInterval, useTelemetryThrottle, useMavlinkService | hooks/*.ts |
| 2026-07-09 | machinesApi snake_case mapping + implementWidthM; settings UI for width; planner default from machine | api/machines.ts, app/(tabs)/settings.tsx, app/(tabs)/field-planner.tsx |
| 2026-07-09 | DepthSlider sends real DO_SET_SERVO on release | components/controls/DepthSlider.tsx |
| 2026-07-09 | downloadMission + verifyMissionMatches; post-upload read-back verify | services/missionUploader.ts, utils/mavlinkParser.ts, app/(tabs)/field-planner.tsx |
| 2026-07-09 | Execution monitoring: MISSION_CURRENT/ITEM_REACHED → store; Field View progress, active point highlight, breadcrumbs | services/MavlinkService.ts, store/missionStore.ts, app/(tabs)/field-view.tsx, components/mission/FieldMap.tsx |
| 2026-07-09 | Mission run controls (Start/Pause/Resume/RTL) with GPS/E-stop guards; Rover mode mapping fixed; E-stop on planner | components/controls/MissionRunControls.tsx, utils/mavlinkBuilders.ts, types/mavlink.ts, app/(tabs)/field-view.tsx, app/(tabs)/field-planner.tsx |
| 2026-07-09 | Migrated map layer from react-native-maps → MapLibre (ESRI satellite + OSM streets, no Google API key, real web map) | constants/mapStyle.ts, components/mission/FieldMap.tsx, app.json, package.json |
| 2026-07-09 | See TASKS.md in repo root for remaining hardware/user tasks | TASKS.md |

---

## Known Issues / TODOs

- Mission upload untested against real hardware (bench-test with Pixhawk + DroneBridge per 11-testing-guide.md)
- MapLibre migration untested against real device — verify satellite base loads on iOS/Android/web builds
- Need to add Google Maps API key for production (currently using Apple Maps on iOS)

---

## Update Instructions

**After every code change, update this file:**

1. Change `NOT_STARTED` → `IN_PROGRESS` → `COMPLETE` in status columns
2. Add entry to "Recent Changes" table
3. Add any new files to the appropriate table
4. Update "Known Issues / TODOs" if needed
