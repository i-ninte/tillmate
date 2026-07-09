/**
 * Tests for unit conversion and formatting helpers
 */

import {
  cmToInches,
  inchesToCm,
  metersToFeet,
  kmhToMph,
  m2ToAcres,
  m2ToHectares,
  formatDepth,
  formatSpeed,
  formatWidth,
  formatArea,
  formatDistance,
  formatDuration,
  formatVoltage,
  formatTemperature,
} from '../utils/units';

describe('conversions', () => {
  test('cm ↔ inches round-trip', () => {
    expect(cmToInches(2.54)).toBeCloseTo(1, 5);
    expect(inchesToCm(cmToInches(15))).toBeCloseTo(15, 5);
  });

  test('meters to feet', () => {
    expect(metersToFeet(1)).toBeCloseTo(3.28084, 4);
  });

  test('kmh to mph', () => {
    expect(kmhToMph(100)).toBeCloseTo(62.14, 1);
  });

  test('area conversions', () => {
    expect(m2ToHectares(10000)).toBe(1);
    expect(m2ToAcres(4046.856)).toBeCloseTo(1, 4);
  });
});

describe('formatting', () => {
  test('formatDepth metric and imperial', () => {
    expect(formatDepth(15)).toBe('15 cm');
    expect(formatDepth(15, 'imperial')).toBe('5.9 in');
    expect(formatDepth(null)).toBe('--');
  });

  test('formatSpeed', () => {
    expect(formatSpeed(5.5)).toBe('5.5 km/h');
    expect(formatSpeed(5.5, 'imperial')).toBe('3.4 mph');
    expect(formatSpeed(undefined)).toBe('--');
  });

  test('formatWidth', () => {
    expect(formatWidth(1.5)).toBe('1.5 m');
    expect(formatWidth(1.5, 'imperial')).toBe('4.9 ft');
  });

  test('formatArea picks sensible units', () => {
    expect(formatArea(500)).toBe('500 m²');
    expect(formatArea(25000)).toBe('2.50 ha');
    expect(formatArea(4046.856, 'imperial')).toBe('1.00 ac');
  });

  test('formatDistance switches to km/mi', () => {
    expect(formatDistance(750)).toBe('750 m');
    expect(formatDistance(1500)).toBe('1.50 km');
    expect(formatDistance(2000, 'imperial')).toBe('1.24 mi');
    expect(formatDistance(30, 'imperial')).toBe('98 ft');
  });

  test('formatDuration ranges', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(150)).toBe('2m 30s');
    expect(formatDuration(3900)).toBe('1h 05m');
    expect(formatDuration(null)).toBe('--');
  });

  test('formatVoltage and formatTemperature', () => {
    expect(formatVoltage(48.24)).toBe('48.2 V');
    expect(formatTemperature(45)).toBe('45°C');
    expect(formatTemperature(45, 'imperial')).toBe('113°F');
  });
});
