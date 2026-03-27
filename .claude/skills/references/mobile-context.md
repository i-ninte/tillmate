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
| telemetryStore | COMPLETE | `/mobile/store/telemetryStore.ts` | All telemetry values |
| controlStore | COMPLETE | `/mobile/store/controlStore.ts` | `tiller`, `pump`, `depth` |
| missionStore | COMPLETE | `/mobile/store/missionStore.ts` | `fieldPlan`, `uploadState` |

### MAVLink Services
| Service | Status | Location | Purpose |
|---------|--------|----------|---------|
| MavlinkService | NOT_STARTED | `/mobile/services/MavlinkService.ts` | UDP socket singleton |
| MavlinkParser | NOT_STARTED | `/mobile/services/MavlinkParser.ts` | Bytes → messages |
| MavlinkSender | NOT_STARTED | `/mobile/services/MavlinkSender.ts` | Messages → bytes |
| missionCompiler | COMPLETE | `/mobile/services/missionCompiler.ts` | FieldPlan → MissionItems |
| missionUploader | COMPLETE | `/mobile/services/missionUploader.ts` | Upload handshake |
| telemetryLogger | NOT_STARTED | `/mobile/services/telemetryLogger.ts` | Batch log to backend |

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

### Mission Components
| Component | Status | Location |
|-----------|--------|----------|
| FieldMap | COMPLETE | `/mobile/components/mission/FieldMap.tsx` |
| WorkPointEditor | COMPLETE | `/mobile/components/mission/WorkPointEditor.tsx` |
| WorkPointMarker | COMPLETE | `/mobile/components/mission/WorkPointMarker.tsx` |

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
| units | NOT_STARTED | `/mobile/utils/units.ts` |

### Hooks
| Hook | Status | Location |
|------|--------|----------|
| useMavlinkService | NOT_STARTED | `/mobile/hooks/useMavlinkService.ts` |
| useInterval | NOT_STARTED | `/mobile/hooks/useInterval.ts` |
| useTelemetryThrottle | NOT_STARTED | `/mobile/hooks/useTelemetryThrottle.ts` |

### Constants
| File | Status | Location |
|------|--------|----------|
| colors.ts | COMPLETE | `/mobile/constants/colors.ts` |
| layout.ts | COMPLETE | `/mobile/constants/layout.ts` |

### Tests
| Test | Status | Location |
|------|--------|----------|
| MAVLink builder tests | COMPLETE | `/mobile/__tests__/mavlinkBuilders.test.ts` |
| Mission compiler tests | COMPLETE | `/mobile/__tests__/missionCompiler.test.ts` |
| Unit converter tests | NOT_STARTED | `/mobile/__tests__/units.test.ts` |

---

## Key Patterns & Conventions

### State Updates
- Zustand stores use the `create` function from zustand
- Telemetry updates via `useTelemetryStore.getState().update(partial)`
- Connection state triggers navigation

### MAVLink Flow (TO BE IMPLEMENTED)
1. `MavlinkService.connect()` opens UDP socket on port 14550
2. Incoming bytes → `MavlinkParser.parse()` → dispatch to stores
3. Commands built via `mavlinkBuilders.ts` → `MavlinkSender.send()`

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

---

## Known Issues / TODOs

- MAVLink UDP socket services not yet implemented (MavlinkService, MavlinkParser, MavlinkSender)
- Hooks not yet implemented (useMavlinkService, useInterval, useTelemetryThrottle)
- Telemetry logger not yet implemented
- Map only works on mobile (web shows placeholder list)
- Need to integrate mission compiler with actual MAVLink send when MavlinkService is ready

---

## Update Instructions

**After every code change, update this file:**

1. Change `NOT_STARTED` → `IN_PROGRESS` → `COMPLETE` in status columns
2. Add entry to "Recent Changes" table
3. Add any new files to the appropriate table
4. Update "Known Issues / TODOs" if needed
