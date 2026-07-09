/**
 * OperationPanel — farmer picks the field operation (tilling, weeding,
 * spraying), working depth, and implement width, then generates the path.
 * Changing the operation after generation re-applies it to all points.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Operation } from '../../types/mission';
import { OPERATIONS } from '../../services/operations';
import { Colors, Layout } from '../../constants';

const OPERATION_ICONS: Record<Operation, keyof typeof Ionicons.glyphMap> = {
  tilling: 'layers',
  weeding: 'leaf',
  spraying: 'water',
};

interface OperationPanelProps {
  operation?: Operation;
  depthCm?: number;
  implementWidthM?: number;
  onOperationChange: (op: Operation) => void;
  onDepthChange: (depthCm: number) => void;
  onWidthChange: (widthM: number) => void;
}

function Stepper({
  label,
  value,
  unit,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          style={styles.stepperButton}
          onPress={() => onChange(Math.max(min, Math.round((value - step) * 10) / 10))}
        >
          <Ionicons name="remove" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stepperValue}>
          {value} {unit}
        </Text>
        <TouchableOpacity
          style={styles.stepperButton}
          onPress={() => onChange(Math.min(max, Math.round((value + step) * 10) / 10))}
        >
          <Ionicons name="add" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function OperationPanel({
  operation,
  depthCm,
  implementWidthM,
  onOperationChange,
  onDepthChange,
  onWidthChange,
}: OperationPanelProps) {
  const cfg = operation ? OPERATIONS[operation] : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Operation</Text>
      <View style={styles.operationRow}>
        {(Object.keys(OPERATIONS) as Operation[]).map((op) => {
          const active = operation === op;
          return (
            <TouchableOpacity
              key={op}
              style={[styles.operationButton, active && styles.operationButtonActive]}
              onPress={() => onOperationChange(op)}
            >
              <Ionicons
                name={OPERATION_ICONS[op]}
                size={22}
                color={active ? Colors.textPrimary : Colors.textSecondary}
              />
              <Text style={[styles.operationLabel, active && styles.operationLabelActive]}>
                {OPERATIONS[op].label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {cfg?.needsDepth && (
        <Stepper
          label="Working depth"
          value={depthCm ?? cfg.defaultDepthCm}
          unit="cm"
          step={1}
          min={1}
          max={cfg.maxDepthCm}
          onChange={onDepthChange}
        />
      )}

      <Stepper
        label="Implement width"
        value={implementWidthM ?? 1}
        unit="m"
        step={0.1}
        min={0.3}
        max={10}
        onChange={onWidthChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    marginHorizontal: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
    padding: Layout.spacing.md,
    borderRadius: Layout.radius.md,
  },
  title: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Layout.spacing.sm,
  },
  operationRow: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.sm,
  },
  operationButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: Layout.radius.md,
    paddingVertical: Layout.spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 4,
  },
  operationButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  operationLabel: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
  },
  operationLabelActive: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Layout.spacing.xs,
  },
  stepperLabel: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
  },
  stepperButton: {
    backgroundColor: Colors.surfaceLight,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepperValue: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    minWidth: 64,
    textAlign: 'center',
  },
});
