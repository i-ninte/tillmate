import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../../constants';
import { useConnectionStore } from '../../store';
import { setApiBaseUrl } from '../../api/client';
import { machinesApi } from '../../api/machines';

export default function SettingsScreen() {
  const connected = useConnectionStore((s) => s.connected);
  const { targetIp, targetPort, setTarget, reset: resetConnection } = useConnectionStore();

  const [machineIp, setMachineIp] = useState(targetIp);
  const [machinePort, setMachinePort] = useState(targetPort.toString());
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000');
  const [autoConnect, setAutoConnect] = useState(true);
  const machineId = useConnectionStore((s) => s.machineId);
  const [implementWidth, setImplementWidth] = useState('');
  const [savingWidth, setSavingWidth] = useState(false);

  // Load the machine's implement width for editing
  useEffect(() => {
    (async () => {
      try {
        const machine = await machinesApi.get(machineId || 1);
        setImplementWidth(String(machine.implementWidthM ?? 1));
      } catch {
        // Backend may be offline — leave the field blank
      }
    })();
  }, [machineId]);

  const handleSaveImplementWidth = async () => {
    const width = parseFloat(implementWidth);
    if (isNaN(width) || width < 0.1 || width > 20) {
      Alert.alert('Invalid Width', 'Enter the implement width in meters (0.1 – 20).');
      return;
    }
    setSavingWidth(true);
    try {
      await machinesApi.update(machineId || 1, { implementWidthM: width });
      Alert.alert('Saved', 'Implement width saved. New field plans will use it.');
    } catch {
      Alert.alert('Error', 'Could not save. Is the backend server reachable?');
    } finally {
      setSavingWidth(false);
    }
  };

  // Redirect to connection screen if disconnected
  useEffect(() => {
    if (!connected) {
      router.replace('/');
    }
  }, [connected]);

  const handleSaveMachineSettings = () => {
    const port = parseInt(machinePort, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      Alert.alert('Invalid Port', 'Please enter a valid port number (1-65535)');
      return;
    }
    setTarget(machineIp, port);
    Alert.alert('Saved', 'Machine connection settings saved');
  };

  const handleSaveBackendUrl = () => {
    try {
      new URL(backendUrl);
      setApiBaseUrl(`${backendUrl}/api/v1`);
      Alert.alert('Saved', 'Backend URL updated');
    } catch {
      Alert.alert('Invalid URL', 'Please enter a valid URL');
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect',
      'Are you sure you want to disconnect from the machine?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            resetConnection();
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Machine Connection Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="wifi" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Machine Connection</Text>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Machine IP Address</Text>
            <TextInput
              style={styles.textInput}
              value={machineIp}
              onChangeText={setMachineIp}
              placeholder="192.168.2.1"
              placeholderTextColor={Colors.textDisabled}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>UDP Port</Text>
            <TextInput
              style={styles.textInput}
              value={machinePort}
              onChangeText={setMachinePort}
              placeholder="14550"
              placeholderTextColor={Colors.textDisabled}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Auto-reconnect</Text>
            <Switch
              value={autoConnect}
              onValueChange={setAutoConnect}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.textPrimary}
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveMachineSettings}>
            <Ionicons name="save-outline" size={20} color={Colors.textPrimary} />
            <Text style={styles.saveButtonText}>Save Connection Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Backend Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="server" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Backend Server</Text>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Backend URL</Text>
            <TextInput
              style={styles.textInput}
              value={backendUrl}
              onChangeText={setBackendUrl}
              placeholder="http://localhost:8000"
              placeholderTextColor={Colors.textDisabled}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveBackendUrl}>
            <Ionicons name="save-outline" size={20} color={Colors.textPrimary} />
            <Text style={styles.saveButtonText}>Save Backend URL</Text>
          </TouchableOpacity>
        </View>

        {/* Machine Setup */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="construct" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Machine Setup</Text>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Implement Width (m)</Text>
            <TextInput
              style={styles.textInput}
              value={implementWidth}
              onChangeText={setImplementWidth}
              placeholder="1.0"
              placeholderTextColor={Colors.textDisabled}
              keyboardType="decimal-pad"
            />
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveImplementWidth}
            disabled={savingWidth}
          >
            <Ionicons name="save-outline" size={20} color={Colors.textPrimary} />
            <Text style={styles.saveButtonText}>
              {savingWidth ? 'Saving...' : 'Save Machine Setup'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Machine Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Machine Info</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <View style={[styles.statusBadge, connected ? styles.statusConnected : styles.statusDisconnected]}>
              <Text style={styles.statusText}>
                {connected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Connection Type</Text>
            <Text style={styles.infoValue}>WiFi (MAVLink UDP)</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Protocol</Text>
            <Text style={styles.infoValue}>MAVLink 2.0</Text>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="leaf" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>About TillMate</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Build</Text>
            <Text style={styles.infoValue}>2026.03.27</Text>
          </View>
        </View>

        {/* Disconnect Button */}
        <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
          <Ionicons name="power" size={24} color={Colors.danger} />
          <Text style={styles.disconnectButtonText}>Disconnect from Machine</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  content: {
    flex: 1,
    padding: Layout.spacing.md,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
    paddingBottom: Layout.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Layout.spacing.sm,
  },
  settingLabel: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
    flex: 1,
  },
  textInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: Layout.radius.sm,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    fontSize: Layout.fontSize.md,
    color: Colors.textPrimary,
    minWidth: 150,
    textAlign: 'right',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.md,
    marginTop: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  saveButtonText: {
    fontSize: Layout.fontSize.md,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Layout.spacing.sm,
  },
  infoLabel: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: Layout.fontSize.md,
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.radius.round,
  },
  statusConnected: {
    backgroundColor: Colors.success,
  },
  statusDisconnected: {
    backgroundColor: Colors.danger,
  },
  statusText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.md,
    borderWidth: 1,
    borderColor: Colors.danger,
    gap: Layout.spacing.sm,
  },
  disconnectButtonText: {
    fontSize: Layout.fontSize.md,
    color: Colors.danger,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 50,
  },
});
