# Reference 10 — UI Design Rules

## Design Principles

1. **Farmer-first**: No technical jargon. No raw numbers the farmer can't act on.
2. **Outdoor readability**: High contrast, large text, visible in direct sunlight.
3. **Glove-friendly**: Minimum 72 dp touch targets everywhere. Emergency Stop: 88 dp.
4. **Minimal steps**: Drawing a path and starting a mission should take < 5 taps.
5. **Always safe**: Emergency Stop is always visible. Stale data shows `--`, never last known value.

---

## Color System

```typescript
// constants/colors.ts
export const Colors = {
  // Backgrounds
  background:     '#0d0d0d',   // near-black — max contrast outdoors
  surface:        '#1a1a1a',
  surfaceRaised:  '#242424',

  // Brand
  primary:        '#FF6F00',   // AgriMachine orange
  primaryLight:   '#FFA040',

  // Semantic
  success:        '#2e7d32',   // GPS fix, tiller ON, pump ON
  warning:        '#F9A825',   // battery mid, manual mode
  danger:         '#e65100',   // high temp, battery low
  critical:       '#c62828',   // no GPS, battery critical
  estop:          '#b71c1c',   // emergency stop button

  // Text
  textPrimary:    '#ffffff',
  textSecondary:  '#9e9e9e',
  textDisabled:   '#555555',

  // Dashboard tiles (default)
  tileDefault:    '#2a2a2a',
};
```

---

## Typography

| Use | Size | Weight |
|---|---|---|
| Dashboard tile value | 20 sp | Bold |
| Dashboard tile label | 11 sp | Regular |
| Control button state (ON/OFF) | 22 sp | Bold |
| Control button label | 13 sp | Regular |
| Screen title | 20 sp | Bold |
| Body text | 15 sp | Regular |
| Emergency Stop label | 24 sp | Bold |

Font family: System default (`System` on iOS, `Roboto` on Android). No custom fonts — load time matters in the field.

---

## Vocabulary — Enforce in Every Label and Alert

| Never Show | Always Show |
|---|---|
| Mission | Field Plan |
| Waypoint | Work Point |
| Vehicle | Machine |
| Arm / Disarm | Start Engine / Stop Engine |
| RTL | Return to Start |
| MAVLink | (never show) |
| COMMAND_LONG | (never show) |
| param1, param2 | (never show) |
| Error code -5 | "Lost connection to machine" |
| UDP port 14550 | (never show) |

---

## Screen Inventory

### 1. Connection Screen (`/`)

- Background: `#0d0d0d`
- AgriMachine logo / wordmark (top center)
- Subtext: "Make sure you're connected to your machine's WiFi"
- "Connect to Machine" button — primary orange, full width, 72 dp height
- Connecting state: spinner + "Connecting…"
- Error state: red banner "Could not connect. Check WiFi."

### 2. Field View (`/field-view`)

Stacked vertically:
1. `FarmDashboard` — scrollable horizontal strip at top
2. `MapView` (satellite, fills remaining space) — shows machine position, breadcrumb trail
3. `FarmControlPanel` — anchored to bottom

Navigation to Field Planner: floating FAB (pencil icon, bottom-right of map area). Label: "Plan Field".

"Connection Lost" banner: red, full width, overlays top of screen when heartbeat times out.

### 3. Field Planner (`/field-planner`)

- Full-screen satellite map
- Top bar: "Field Planner" title, "Save" button (right)
- Tap to add Work Points (orange markers)
- Polyline connects markers in order
- Bottom: "Send to Machine" large button
- Tapping a marker → WorkPointEditor bottom sheet slides up

---

## Component Design Rules

### BigButton

```tsx
interface BigButtonProps {
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  icon?: string;  // @expo/vector-icons name
}

// Style:
{
  height: 72,
  borderRadius: 12,
  paddingHorizontal: 24,
  backgroundColor: color ?? Colors.primary,
  opacity: disabled ? 0.4 : 1,
}
```

### StatusBadge

Small pill-shaped label for inline status indicators.

```tsx
// Usage: <StatusBadge label="GPS FIX" color={Colors.success} />
// Style: height 28, borderRadius 14, paddingHorizontal 12
// Text: 12 sp, bold, white
```

### ConnectionBanner

Displayed when `connected === false` during an active session.

```tsx
// Full-width, 48 dp height, red background (#c62828)
// Text: "⚠ Connection Lost — check WiFi" — white, 15 sp, centered
// Appears above all other content (absolute positioned, top: 0)
```

---

## Map Design Rules

- Map type: **satellite** (fields look like fields)
- Work Point markers: orange pin (`#FF6F00`)
- Work Points numbered: `W1`, `W2`, … in marker label
- Path polyline: orange (`#FF6F00`), 3 dp width, dashed where implement is raised
- Machine position: animated moving icon (tractor/machine emoji or custom marker)
- Breadcrumb trail: thin grey line of past positions

---

## Error Handling UX

All errors shown as non-blocking banners at the top of the screen, not modal alerts — modals require dismissal and the farmer may need both hands on the machine.

Exception: **Emergency Stop confirmation** — shown as `Alert.alert` with single "OK" button (blocking is intentional to confirm the stop was received).

| Error | Banner text |
|---|---|
| Connection lost | "⚠ Connection Lost — check WiFi" |
| Mission upload failed | "⚠ Could not send Field Plan to machine. Try again." |
| GPS not fixed | "⚠ No GPS fix — cannot start mission" |
| E-stop active | "⛔ Emergency Stop is active" |

---

## Accessibility

- All interactive elements have `accessibilityLabel` set
- Emergency Stop: `accessibilityRole="button"`, `accessibilityHint="Stops all machine operations immediately"`
- Minimum contrast ratio: 4.5:1 (WCAG AA) for all text on tile backgrounds
- Large text mode: support Dynamic Type on iOS / font scale on Android — test at 1.3× scale