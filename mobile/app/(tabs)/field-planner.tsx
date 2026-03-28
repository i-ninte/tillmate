import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMissionStore, useConnectionStore } from '../../store';
import { Colors, Layout } from '../../constants';
import { FieldMap } from '../../components/mission';
import BigButton from '../../components/common/BigButton';
import { missionsApi } from '../../api/missions';

// Only import WorkPointEditor on native (it uses BottomSheet which needs Reanimated)
const WorkPointEditor = Platform.OS !== 'web'
  ? require('../../components/mission/WorkPointEditor').default
  : null;

export default function FieldPlannerScreen() {
  const {
    workPoints,
    currentPlan,
    clearCurrentPlan,
    selectWorkPoint,
    selectedPointId,
    updateWorkPoint,
    removeWorkPoint,
    setReturnToHome,
  } = useMissionStore();
  const machineId = useConnectionStore((s) => s.machineId);
  const [isSending, setIsSending] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [planName, setPlanName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSendToMachine = async () => {
    if (workPoints.length === 0) {
      Alert.alert('No Work Points', 'Please add at least one work point to send.');
      return;
    }

    setIsSending(true);

    // TODO: Implement mission upload via missionUploader
    setTimeout(() => {
      setIsSending(false);
      Alert.alert('Success', 'Field plan sent to machine!');
    }, 2000);
  };

  const handleSavePlan = () => {
    if (workPoints.length === 0) {
      Alert.alert('No Work Points', 'Please add at least one work point to save.');
      return;
    }

    // Show name modal
    setPlanName(`Field Plan ${new Date().toLocaleDateString()}`);
    setShowNameModal(true);
  };

  const handleConfirmSave = async () => {
    if (!planName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for the field plan.');
      return;
    }

    setShowNameModal(false);
    setIsSaving(true);

    try {
      const homeLocation = workPoints.length > 0
        ? { lat: workPoints[0].lat, lon: workPoints[0].lon }
        : undefined;

      await missionsApi.create({
        machineId: machineId || 1, // Default machine if not connected
        name: planName.trim(),
        returnToHome: currentPlan?.returnToHome ?? true,
        homeLocation,
        workPoints: workPoints.map((wp, index) => ({
          seq: index,
          lat: wp.lat,
          lon: wp.lon,
          implementLowered: wp.implementLowered,
          tillerOn: wp.tillerOn,
          pumpOn: wp.pumpOn,
          label: wp.label || `Point ${index + 1}`,
        })),
      });

      clearCurrentPlan();
      Alert.alert('Success', 'Field plan saved successfully!');
    } catch (error) {
      console.error('Error saving field plan:', error);
      Alert.alert('Error', 'Failed to save field plan. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearPlan = () => {
    if (workPoints.length === 0) return;

    Alert.alert(
      'Clear Plan',
      'This will remove all work points. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => clearCurrentPlan(),
        },
      ]
    );
  };

  const handlePointSelect = useCallback((pointId: string) => {
    setShowEditor(true);
  }, []);

  const handleEditorClose = useCallback(() => {
    setShowEditor(false);
    selectWorkPoint(null);
  }, [selectWorkPoint]);

  // Get selected point for web editor
  const selectedPoint = workPoints.find((p) => p.id === selectedPointId);

  // Web modal editor (doesn't use Reanimated)
  const renderWebEditor = () => {
    if (!showEditor || !selectedPoint) return null;

    const pointIndex = workPoints.findIndex((p) => p.id === selectedPointId) + 1;

    return (
      <Modal
        visible={showEditor}
        transparent
        animationType="slide"
        onRequestClose={handleEditorClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Work Point {pointIndex}</Text>
              <TouchableOpacity onPress={handleEditorClose}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalCoords}>
              {selectedPoint.lat.toFixed(6)}, {selectedPoint.lon.toFixed(6)}
            </Text>

            <View style={styles.modalToggles}>
              <TouchableOpacity
                style={[styles.modalToggle, selectedPoint.implementLowered && styles.modalToggleActive]}
                onPress={() => updateWorkPoint(selectedPointId!, { implementLowered: !selectedPoint.implementLowered })}
              >
                <Ionicons name="arrow-down" size={24} color={selectedPoint.implementLowered ? Colors.textPrimary : Colors.textSecondary} />
                <Text style={[styles.modalToggleLabel, selectedPoint.implementLowered && styles.modalToggleLabelActive]}>Implement</Text>
                <Text style={[styles.modalToggleState, selectedPoint.implementLowered && styles.modalToggleStateActive]}>
                  {selectedPoint.implementLowered ? 'LOWERED' : 'RAISED'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalToggle, selectedPoint.tillerOn && styles.modalToggleActive]}
                onPress={() => updateWorkPoint(selectedPointId!, { tillerOn: !selectedPoint.tillerOn })}
              >
                <Ionicons name="cog" size={24} color={selectedPoint.tillerOn ? Colors.textPrimary : Colors.textSecondary} />
                <Text style={[styles.modalToggleLabel, selectedPoint.tillerOn && styles.modalToggleLabelActive]}>Tiller</Text>
                <Text style={[styles.modalToggleState, selectedPoint.tillerOn && styles.modalToggleStateActive]}>
                  {selectedPoint.tillerOn ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalToggle, selectedPoint.pumpOn && styles.modalToggleActive]}
                onPress={() => updateWorkPoint(selectedPointId!, { pumpOn: !selectedPoint.pumpOn })}
              >
                <Ionicons name="water" size={24} color={selectedPoint.pumpOn ? Colors.textPrimary : Colors.textSecondary} />
                <Text style={[styles.modalToggleLabel, selectedPoint.pumpOn && styles.modalToggleLabelActive]}>Pump</Text>
                <Text style={[styles.modalToggleState, selectedPoint.pumpOn && styles.modalToggleStateActive]}>
                  {selectedPoint.pumpOn ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalDelete}
              onPress={() => {
                removeWorkPoint(selectedPointId!);
                handleEditorClose();
              }}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.danger} />
              <Text style={styles.modalDeleteText}>Delete Point</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Field Planner</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleSavePlan}
            style={styles.headerButton}
            disabled={workPoints.length === 0 || isSaving}
          >
            <Ionicons
              name={isSaving ? 'hourglass-outline' : 'save-outline'}
              size={24}
              color={workPoints.length > 0 && !isSaving ? Colors.primary : Colors.textDisabled}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleClearPlan}
            style={styles.headerButton}
            disabled={workPoints.length === 0}
          >
            <Ionicons
              name="trash-outline"
              size={24}
              color={workPoints.length > 0 ? Colors.danger : Colors.textDisabled}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map Area */}
      <View style={styles.mapContainer}>
        <FieldMap
          editable={true}
          showPath={true}
          onPointSelect={handlePointSelect}
          initialRegion={{
            latitude: 37.7749,
            longitude: -122.4194,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        />
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <View style={styles.instructionRow}>
          <Ionicons name="finger-print" size={20} color={Colors.primary} />
          <Text style={styles.instructionText}>
            {Platform.OS === 'web' ? 'Click "Add Point" to add waypoints' : 'Tap map to add points'}
          </Text>
        </View>
        <View style={styles.instructionRow}>
          <Ionicons name="create-outline" size={20} color={Colors.primary} />
          <Text style={styles.instructionText}>
            {Platform.OS === 'web' ? 'Click point to edit' : 'Tap point to edit actions'}
          </Text>
        </View>
      </View>

      {/* Return to Home Toggle */}
      <TouchableOpacity
        style={styles.returnHomeToggle}
        onPress={() => setReturnToHome(!(currentPlan?.returnToHome ?? true))}
      >
        <Ionicons
          name={currentPlan?.returnToHome !== false ? 'home' : 'home-outline'}
          size={24}
          color={currentPlan?.returnToHome !== false ? Colors.primary : Colors.textSecondary}
        />
        <View style={styles.returnHomeInfo}>
          <Text style={styles.returnHomeLabel}>Return to Start</Text>
          <Text style={styles.returnHomeDescription}>
            Machine returns to starting point after completing route
          </Text>
        </View>
        <View style={[
          styles.returnHomeSwitch,
          currentPlan?.returnToHome !== false && styles.returnHomeSwitchActive,
        ]}>
          <Text style={[
            styles.returnHomeSwitchText,
            currentPlan?.returnToHome !== false && styles.returnHomeSwitchTextActive,
          ]}>
            {currentPlan?.returnToHome !== false ? 'ON' : 'OFF'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <BigButton
          label={isSending ? 'Sending...' : `Send to Machine (${workPoints.length} points)`}
          onPress={handleSendToMachine}
          disabled={workPoints.length === 0 || isSending}
          loading={isSending}
          variant="primary"
        />
      </View>

      {/* Work Point Editor */}
      {Platform.OS === 'web' ? (
        renderWebEditor()
      ) : (
        showEditor && selectedPointId && WorkPointEditor && (
          <WorkPointEditor onClose={handleEditorClose} />
        )
      )}

      {/* Plan Name Modal */}
      <Modal
        visible={showNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNameModal(false)}
      >
        <View style={styles.nameModalOverlay}>
          <View style={styles.nameModalContent}>
            <Text style={styles.nameModalTitle}>Save Field Plan</Text>
            <Text style={styles.nameModalSubtitle}>Enter a name for this plan</Text>
            <TextInput
              style={styles.nameInput}
              value={planName}
              onChangeText={setPlanName}
              placeholder="Field Plan Name"
              placeholderTextColor={Colors.textSecondary}
              autoFocus
            />
            <View style={styles.nameModalButtons}>
              <TouchableOpacity
                style={styles.nameModalCancel}
                onPress={() => setShowNameModal(false)}
              >
                <Text style={styles.nameModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.nameModalSave}
                onPress={handleConfirmSave}
              >
                <Text style={styles.nameModalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Layout.fontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
  },
  headerButton: {
    padding: Layout.spacing.sm,
    minWidth: 44,
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
    margin: Layout.spacing.sm,
  },
  instructions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Layout.spacing.xl,
    paddingVertical: Layout.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
  },
  instructionText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
  },
  actions: {
    paddingHorizontal: Layout.spacing.lg,
    paddingBottom: Layout.spacing.lg,
  },
  returnHomeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
    padding: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    gap: Layout.spacing.md,
  },
  returnHomeInfo: {
    flex: 1,
  },
  returnHomeLabel: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  returnHomeDescription: {
    fontSize: Layout.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  returnHomeSwitch: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  returnHomeSwitchActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  returnHomeSwitchText: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  returnHomeSwitchTextActive: {
    color: Colors.textPrimary,
  },
  // Web modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Layout.radius.xl,
    borderTopRightRadius: Layout.radius.xl,
    padding: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  modalTitle: {
    fontSize: Layout.fontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalCoords: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Layout.spacing.lg,
  },
  modalToggles: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.lg,
  },
  modalToggle: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  modalToggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modalToggleLabel: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Layout.spacing.xs,
  },
  modalToggleLabelActive: {
    color: Colors.textPrimary,
  },
  modalToggleState: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '700',
    color: Colors.textDisabled,
    marginTop: Layout.spacing.xs,
  },
  modalToggleStateActive: {
    color: Colors.textPrimary,
  },
  modalDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.md,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  modalDeleteText: {
    fontSize: Layout.fontSize.md,
    color: Colors.danger,
    marginLeft: Layout.spacing.sm,
  },
  // Name modal styles
  nameModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.lg,
  },
  nameModalContent: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  nameModalTitle: {
    fontSize: Layout.fontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Layout.spacing.xs,
  },
  nameModalSubtitle: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Layout.spacing.lg,
  },
  nameInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.md,
    fontSize: Layout.fontSize.md,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Layout.spacing.lg,
  },
  nameModalButtons: {
    flexDirection: 'row',
    gap: Layout.spacing.md,
  },
  nameModalCancel: {
    flex: 1,
    padding: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  nameModalCancelText: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
  },
  nameModalSave: {
    flex: 1,
    padding: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  nameModalSaveText: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
