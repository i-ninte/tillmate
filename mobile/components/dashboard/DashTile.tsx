import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../../constants';

interface DashTileProps {
  label: string;
  value: string | number | null;
  unit?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  warning?: boolean;
  critical?: boolean;
}

export default function DashTile({
  label,
  value,
  unit,
  icon,
  color = Colors.primary,
  warning = false,
  critical = false,
}: DashTileProps) {
  const displayValue = value === null ? '--' : value;
  const valueColor = critical
    ? Colors.danger
    : warning
    ? Colors.warning
    : Colors.textPrimary;

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color={Colors.textPrimary} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueContainer}>
        <Text style={[styles.value, { color: valueColor }]}>{displayValue}</Text>
        {unit && value !== null && (
          <Text style={styles.unit}>{unit}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: Layout.dashTileMinWidth,
    minHeight: Layout.dashTileMinHeight,
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: Layout.radius.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.xs,
  },
  label: {
    fontSize: Layout.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: Layout.fontSize.lg,
    fontWeight: Layout.fontWeight.bold,
  },
  unit: {
    fontSize: Layout.fontSize.xs,
    color: Colors.textSecondary,
    marginLeft: 2,
  },
});
