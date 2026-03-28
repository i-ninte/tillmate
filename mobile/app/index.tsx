import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useConnectionStore } from '../store';
import { Colors, Layout } from '../constants';
import BigButton from '../components/common/BigButton';
import { mavlinkService } from '../services/MavlinkService';
import { machinesApi } from '../api/machines';
import { settingsApi } from '../api/settings';

/**
 * Get or create a machine in the backend based on MAVLink system ID
 */
async function getOrCreateMachine(sysId: number, wifiSsid: string): Promise<number> {
  const serialNumber = `TM-${sysId.toString().padStart(3, '0')}`;

  try {
    // Try to find existing machine
    const machines = await machinesApi.list();
    const existing = machines.find((m) => m.serialNumber === serialNumber);

    if (existing) {
      console.log('[Connection] Found existing machine:', existing.id);
      return existing.id;
    }

    // Register new machine
    const newMachine = await machinesApi.create({
      serialNumber,
      displayName: `TillMate ${sysId}`,
      wifiSsid,
    });
    console.log('[Connection] Registered new machine:', newMachine.id);
    return newMachine.id;
  } catch (error) {
    console.warn('[Connection] Could not register machine with backend:', error);
    // Return sysId as fallback (works for local/offline use)
    return sysId;
  }
}

export default function ConnectionScreen() {
  const { connected, connecting, connectionError, simulationMode, targetIp, targetPort, setConnecting, setConnected, setConnectionError, setSimulationMode, setMachineId, setMachineSystemId } = useConnectionStore();
  const isRegistering = useRef(false);
  const [isLoadingSettings, setIsLoadingSettings] = React.useState(true);

  // Fetch simulation mode setting from backend on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const enabled = await settingsApi.getSimulationMode();
        setSimulationMode(enabled);
      } catch (error) {
        console.warn('[Connection] Could not fetch settings from backend');
        // Keep default simulation mode
      } finally {
        setIsLoadingSettings(false);
      }
    };
    fetchSettings();
  }, [setSimulationMode]);

  // Handler for toggling simulation mode - saves to backend
  const handleSimulationToggle = useCallback(async (enabled: boolean) => {
    setSimulationMode(enabled);
    try {
      await settingsApi.setSimulationMode(enabled);
    } catch (error) {
      console.warn('[Connection] Could not save simulation mode to backend');
    }
  }, [setSimulationMode]);

  // Set up MavlinkService callbacks
  useEffect(() => {
    mavlinkService.onConnection(async (isConnected) => {
      if (isConnected) {
        // Get machine system ID from heartbeat
        const sysId = mavlinkService.getMachineSystemId();
        setMachineSystemId(sysId);

        // Register with backend (avoid duplicate registrations)
        if (!isRegistering.current) {
          isRegistering.current = true;
          try {
            const machineId = await getOrCreateMachine(sysId, `TillMate_${sysId.toString().padStart(3, '0')}`);
            setMachineId(machineId);
          } finally {
            isRegistering.current = false;
          }
        }

        setConnected(true);
      } else {
        setMachineId(null);
        setConnected(false);
      }
    });

    mavlinkService.onErrorCallback((error) => {
      console.error('[Connection] Error:', error);
      setConnectionError(error.message);
    });

    // Clean up on unmount
    return () => {
      // Note: Service persists but callbacks could be cleared if needed
    };
  }, [setConnected, setConnectionError, setMachineId, setMachineSystemId]);

  // Navigate to tabs when connected
  useEffect(() => {
    if (connected) {
      router.replace('/(tabs)/field-view');
    }
  }, [connected]);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    setConnectionError(null);

    // Simulation mode or web: use mock connection with machineId = 1
    if (simulationMode || Platform.OS === 'web') {
      console.log('[Connection] Using simulation mode');
      setTimeout(() => {
        setMachineSystemId(1);
        setMachineId(1); // Default machine ID for simulation
        setConnected(true);
      }, 1000);
      return;
    }

    // Real connection via MAVLink/UDP
    mavlinkService.setTarget(targetIp, targetPort);
    const success = await mavlinkService.connect();

    if (!success) {
      setConnectionError('Could not connect to machine. Make sure you are on the machine\'s WiFi network.');
    }
  }, [simulationMode, targetIp, targetPort, setConnecting, setConnectionError, setConnected, setMachineId, setMachineSystemId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/logo.jpeg')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.title}>Connect to Machine</Text>
          <Text style={styles.subtitle}>
            1. Join your machine's WiFi network{'\n'}
            (e.g., TillMate_001){'\n\n'}
            2. Tap the button below to connect
          </Text>
        </View>

        {/* Connection Status */}
        {connecting && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.statusText}>Connecting to machine...</Text>
          </View>
        )}

        {/* Connection Error */}
        {connectionError && !connecting && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{connectionError}</Text>
          </View>
        )}

        {/* Connect Button */}
        <View style={styles.buttonContainer}>
          <BigButton
            label={connecting ? 'Connecting...' : (simulationMode ? 'Connect (Simulation)' : 'Connect to Machine')}
            onPress={handleConnect}
            disabled={connecting}
            variant="primary"
          />
        </View>

        {/* Simulation Mode Toggle */}
        <View style={styles.simulationToggle}>
          <Text style={styles.simulationLabel}>Simulation Mode</Text>
          <Switch
            value={simulationMode}
            onValueChange={handleSimulationToggle}
            trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
            thumbColor={simulationMode ? Colors.primary : Colors.textSecondary}
            disabled={isLoadingSettings}
          />
        </View>
        {simulationMode && (
          <Text style={styles.simulationHint}>
            Using simulated connection (machineId = 1)
          </Text>
        )}

        {/* Version */}
        <Text style={styles.version}>TillMate v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.screenPadding,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: Layout.spacing.xl,
  },
  logo: {
    width: 200,
    height: 200,
  },
  instructions: {
    alignItems: 'center',
    marginBottom: Layout.spacing.xl,
  },
  title: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: Layout.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Layout.spacing.md,
  },
  subtitle: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  statusText: {
    fontSize: Layout.fontSize.md,
    color: Colors.connecting,
    marginLeft: Layout.spacing.md,
  },
  errorContainer: {
    backgroundColor: Colors.danger + '20',
    padding: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    marginBottom: Layout.spacing.lg,
    maxWidth: 300,
  },
  errorText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.danger,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    marginBottom: Layout.spacing.lg,
  },
  simulationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.xs,
  },
  simulationLabel: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
  },
  simulationHint: {
    fontSize: Layout.fontSize.xs,
    color: Colors.textDisabled,
    marginBottom: Layout.spacing.lg,
  },
  version: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textDisabled,
    position: 'absolute',
    bottom: Layout.spacing.lg,
  },
});
