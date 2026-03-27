import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Layout } from '../../constants';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantColors: Record<BadgeVariant, string> = {
  success: Colors.success,
  warning: Colors.warning,
  danger: Colors.danger,
  info: Colors.tileGps,
  neutral: Colors.surfaceLight,
};

export default function StatusBadge({
  label,
  variant = 'neutral',
}: StatusBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: variantColors[variant] }]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.radius.sm,
  },
  label: {
    fontSize: Layout.fontSize.xs,
    fontWeight: Layout.fontWeight.medium,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
  },
});
