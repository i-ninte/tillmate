/**
 * Unit Conversion & Display Formatting
 * Farmer-facing values are formatted here so screens stay consistent.
 */

export type UnitSystem = 'metric' | 'imperial';

export function cmToInches(cm: number): number {
  return cm / 2.54;
}

export function inchesToCm(inches: number): number {
  return inches * 2.54;
}

export function metersToFeet(m: number): number {
  return m * 3.28084;
}

export function kmhToMph(kmh: number): number {
  return kmh * 0.621371;
}

export function m2ToAcres(m2: number): number {
  return m2 / 4046.856;
}

export function m2ToHectares(m2: number): number {
  return m2 / 10000;
}

/** e.g. 15 → "15 cm" or "5.9 in" */
export function formatDepth(depthCm: number | null | undefined, system: UnitSystem = 'metric'): string {
  if (depthCm == null) return '--';
  return system === 'metric'
    ? `${Math.round(depthCm)} cm`
    : `${cmToInches(depthCm).toFixed(1)} in`;
}

/** e.g. 5.5 → "5.5 km/h" or "3.4 mph" */
export function formatSpeed(speedKmh: number | null | undefined, system: UnitSystem = 'metric'): string {
  if (speedKmh == null) return '--';
  return system === 'metric'
    ? `${speedKmh.toFixed(1)} km/h`
    : `${kmhToMph(speedKmh).toFixed(1)} mph`;
}

/** e.g. 1.5 → "1.5 m" or "4.9 ft" */
export function formatWidth(widthM: number | null | undefined, system: UnitSystem = 'metric'): string {
  if (widthM == null) return '--';
  return system === 'metric'
    ? `${widthM.toFixed(1)} m`
    : `${metersToFeet(widthM).toFixed(1)} ft`;
}

/** Field area: hectares (metric) or acres (imperial), sensible rounding */
export function formatArea(areaM2: number | null | undefined, system: UnitSystem = 'metric'): string {
  if (areaM2 == null) return '--';
  if (system === 'metric') {
    const ha = m2ToHectares(areaM2);
    return ha >= 1 ? `${ha.toFixed(2)} ha` : `${Math.round(areaM2)} m²`;
  }
  const acres = m2ToAcres(areaM2);
  return `${acres.toFixed(2)} ac`;
}

/** Path length: km above 1000 m, otherwise meters */
export function formatDistance(distanceM: number | null | undefined, system: UnitSystem = 'metric'): string {
  if (distanceM == null) return '--';
  if (system === 'metric') {
    return distanceM >= 1000
      ? `${(distanceM / 1000).toFixed(2)} km`
      : `${Math.round(distanceM)} m`;
  }
  const feet = metersToFeet(distanceM);
  return feet >= 5280
    ? `${(feet / 5280).toFixed(2)} mi`
    : `${Math.round(feet)} ft`;
}

/** Seconds → "1h 05m" / "12m 30s" / "45s" for work-time estimates */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return '--';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${String(m % 60).padStart(2, '0')}m`;
}

/** Battery voltage → "48.2 V" */
export function formatVoltage(volts: number | null | undefined): string {
  if (volts == null) return '--';
  return `${volts.toFixed(1)} V`;
}

/** Temperature → "45°C" or "113°F" */
export function formatTemperature(celsius: number | null | undefined, system: UnitSystem = 'metric'): string {
  if (celsius == null) return '--';
  return system === 'metric'
    ? `${Math.round(celsius)}°C`
    : `${Math.round(celsius * 9 / 5 + 32)}°F`;
}
