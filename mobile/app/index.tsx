import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useConnectionStore } from '../store';
import { Colors, Layout } from '../constants';
import BigButton from '../components/common/BigButton';

export default function ConnectionScreen() {
  const { connected, connecting, setConnecting } = useConnectionStore();

  // Navigate to tabs when connected
  useEffect(() => {
    if (connected) {
      router.replace('/(tabs)/field-view');
    }
  }, [connected]);

  const handleConnect = async () => {
    setConnecting(true);

    // TODO: Implement actual MAVLink connection via MavlinkService
    // For now, simulate connection after 2 seconds
    setTimeout(() => {
      useConnectionStore.getState().setConnected(true);
    }, 2000);
  };

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

        {/* Connect Button */}
        <View style={styles.buttonContainer}>
          <BigButton
            label={connecting ? 'Connecting...' : 'Connect to Machine'}
            onPress={handleConnect}
            disabled={connecting}
            variant="primary"
          />
        </View>

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
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    marginBottom: Layout.spacing.xl,
  },
  version: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textDisabled,
    position: 'absolute',
    bottom: Layout.spacing.lg,
  },
});
