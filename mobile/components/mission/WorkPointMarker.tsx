import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkPoint } from '../../types';
import { Colors, Layout } from '../../constants';

interface WorkPointMarkerProps {
  index: number;
  point: WorkPoint;
  isSelected: boolean;
}

export default function WorkPointMarker({
  index,
  point,
  isSelected,
}: WorkPointMarkerProps) {
  // Determine marker color based on actions
  const hasActions = point.implementLowered || point.tillerOn || point.pumpOn;
  const markerColor = isSelected
    ? Colors.warning
    : hasActions
    ? Colors.primary
    : Colors.earth;

  return (
    <View style={styles.container}>
      {/* Main marker circle */}
      <View
        style={[
          styles.marker,
          { backgroundColor: markerColor },
          isSelected && styles.markerSelected,
        ]}
      >
        <Text style={styles.indexText}>{index}</Text>
      </View>

      {/* Action indicators */}
      {hasActions && (
        <View style={styles.actionsContainer}>
          {point.implementLowered && (
            <View style={[styles.actionDot, { backgroundColor: Colors.earth }]}>
              <Ionicons name="arrow-down" size={8} color={Colors.textPrimary} />
            </View>
          )}
          {point.tillerOn && (
            <View style={[styles.actionDot, { backgroundColor: Colors.success }]}>
              <Ionicons name="cog" size={8} color={Colors.textPrimary} />
            </View>
          )}
          {point.pumpOn && (
            <View style={[styles.actionDot, { backgroundColor: Colors.tileGps }]}>
              <Ionicons name="water" size={8} color={Colors.textPrimary} />
            </View>
          )}
        </View>
      )}

      {/* Pointer triangle */}
      <View style={[styles.pointer, { borderTopColor: markerColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  marker: {
    width: Layout.workPointMarkerSize,
    height: Layout.workPointMarkerSize,
    borderRadius: Layout.workPointMarkerSize / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.textPrimary,
  },
  markerSelected: {
    borderWidth: 3,
    transform: [{ scale: 1.2 }],
  },
  indexText: {
    color: Colors.textPrimary,
    fontSize: Layout.fontSize.sm,
    fontWeight: Layout.fontWeight.bold,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 2,
  },
  actionDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
});
