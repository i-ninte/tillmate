import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useMissionStore } from '../../store';
import { Colors, Layout } from '../../constants';

interface WorkPointEditorProps {
  onClose: () => void;
}

export default function WorkPointEditor({ onClose }: WorkPointEditorProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { workPoints, selectedPointId, updateWorkPoint, removeWorkPoint, selectWorkPoint } =
    useMissionStore();

  // Find the selected point
  const selectedPoint = useMemo(
    () => workPoints.find((p) => p.id === selectedPointId),
    [workPoints, selectedPointId]
  );

  // Snap points for bottom sheet
  const snapPoints = useMemo(() => ['40%'], []);

  // Handle close
  const handleClose = useCallback(() => {
    selectWorkPoint(null);
    onClose();
  }, [selectWorkPoint, onClose]);

  // Toggle implement lowered
  const toggleImplement = useCallback(() => {
    if (!selectedPointId) return;
    updateWorkPoint(selectedPointId, {
      implementLowered: !selectedPoint?.implementLowered,
    });
  }, [selectedPointId, selectedPoint, updateWorkPoint]);

  // Toggle tiller
  const toggleTiller = useCallback(() => {
    if (!selectedPointId) return;
    updateWorkPoint(selectedPointId, {
      tillerOn: !selectedPoint?.tillerOn,
    });
  }, [selectedPointId, selectedPoint, updateWorkPoint]);

  // Toggle pump
  const togglePump = useCallback(() => {
    if (!selectedPointId) return;
    updateWorkPoint(selectedPointId, {
      pumpOn: !selectedPoint?.pumpOn,
    });
  }, [selectedPointId, selectedPoint, updateWorkPoint]);

  // Delete point
  const handleDelete = useCallback(() => {
    if (!selectedPointId) return;
    removeWorkPoint(selectedPointId);
    handleClose();
  }, [selectedPointId, removeWorkPoint, handleClose]);

  if (!selectedPoint) return null;

  const pointIndex = workPoints.findIndex((p) => p.id === selectedPointId) + 1;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={handleClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Work Point {pointIndex}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Coordinates */}
        <Text style={styles.coordinates}>
          {selectedPoint.lat.toFixed(6)}, {selectedPoint.lon.toFixed(6)}
        </Text>

        {/* Action toggles */}
        <View style={styles.togglesContainer}>
          {/* Implement */}
          <TouchableOpacity
            style={[
              styles.toggleButton,
              selectedPoint.implementLowered && styles.toggleActive,
            ]}
            onPress={toggleImplement}
          >
            <Ionicons
              name="arrow-down"
              size={24}
              color={selectedPoint.implementLowered ? Colors.textPrimary : Colors.textSecondary}
            />
            <Text
              style={[
                styles.toggleLabel,
                selectedPoint.implementLowered && styles.toggleLabelActive,
              ]}
            >
              Implement
            </Text>
            <Text
              style={[
                styles.toggleState,
                selectedPoint.implementLowered && styles.toggleStateActive,
              ]}
            >
              {selectedPoint.implementLowered ? 'LOWERED' : 'RAISED'}
            </Text>
          </TouchableOpacity>

          {/* Tiller */}
          <TouchableOpacity
            style={[
              styles.toggleButton,
              selectedPoint.tillerOn && styles.toggleActive,
            ]}
            onPress={toggleTiller}
          >
            <Ionicons
              name="cog"
              size={24}
              color={selectedPoint.tillerOn ? Colors.textPrimary : Colors.textSecondary}
            />
            <Text
              style={[
                styles.toggleLabel,
                selectedPoint.tillerOn && styles.toggleLabelActive,
              ]}
            >
              Tiller
            </Text>
            <Text
              style={[
                styles.toggleState,
                selectedPoint.tillerOn && styles.toggleStateActive,
              ]}
            >
              {selectedPoint.tillerOn ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>

          {/* Pump */}
          <TouchableOpacity
            style={[
              styles.toggleButton,
              selectedPoint.pumpOn && styles.toggleActive,
            ]}
            onPress={togglePump}
          >
            <Ionicons
              name="water"
              size={24}
              color={selectedPoint.pumpOn ? Colors.textPrimary : Colors.textSecondary}
            />
            <Text
              style={[
                styles.toggleLabel,
                selectedPoint.pumpOn && styles.toggleLabelActive,
              ]}
            >
              Pump
            </Text>
            <Text
              style={[
                styles.toggleState,
                selectedPoint.pumpOn && styles.toggleStateActive,
              ]}
            >
              {selectedPoint.pumpOn ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Delete button */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={Colors.danger} />
          <Text style={styles.deleteText}>Delete Point</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: Colors.surface,
  },
  handleIndicator: {
    backgroundColor: Colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  title: {
    fontSize: Layout.fontSize.xl,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: Layout.spacing.xs,
  },
  coordinates: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Layout.spacing.lg,
  },
  togglesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.lg,
  },
  toggleButton: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleLabel: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Layout.spacing.xs,
  },
  toggleLabelActive: {
    color: Colors.textPrimary,
  },
  toggleState: {
    fontSize: Layout.fontSize.xs,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.textDisabled,
    marginTop: Layout.spacing.xs,
  },
  toggleStateActive: {
    color: Colors.textPrimary,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.md,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  deleteText: {
    fontSize: Layout.fontSize.md,
    color: Colors.danger,
    marginLeft: Layout.spacing.sm,
  },
});
