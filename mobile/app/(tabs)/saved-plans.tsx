import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Layout } from '../../constants';
import { useMissionStore, useConnectionStore } from '../../store';
import { FieldPlanSummary } from '../../types';
import { missionsApi } from '../../api';

export default function SavedPlansScreen() {
  const connected = useConnectionStore((s) => s.connected);
  const { setCurrentPlan, savedPlans, setSavedPlans } = useMissionStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to connection screen if disconnected
  useEffect(() => {
    if (!connected) {
      router.replace('/');
    }
  }, [connected]);

  // Fetch saved plans on mount
  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const plans = await missionsApi.listSummaries();
      setSavedPlans(plans);
    } catch (err: any) {
      setError(err.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadPlan = async (plan: FieldPlanSummary) => {
    try {
      const fullPlan = await missionsApi.get(plan.id);
      setCurrentPlan(fullPlan);
      Alert.alert('Plan Loaded', `"${plan.name}" has been loaded.`, [
        {
          text: 'Go to Planner',
          onPress: () => router.push('/(tabs)/field-planner'),
        },
        { text: 'OK' },
      ]);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load plan');
    }
  };

  const handleDeletePlan = (plan: FieldPlanSummary) => {
    Alert.alert(
      'Delete Plan',
      `Are you sure you want to delete "${plan.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await missionsApi.delete(plan.id);
              fetchPlans();
            } catch (err: any) {
              Alert.alert('Error', 'Failed to delete plan');
            }
          },
        },
      ]
    );
  };

  const renderPlanItem = ({ item }: { item: FieldPlanSummary }) => (
    <TouchableOpacity
      style={styles.planCard}
      onPress={() => handleLoadPlan(item)}
    >
      <View style={styles.planIcon}>
        <Ionicons name="map" size={32} color={Colors.primary} />
      </View>
      <View style={styles.planInfo}>
        <Text style={styles.planName}>{item.name}</Text>
        <Text style={styles.planMeta}>
          {item.workPointCount} work point{item.workPointCount !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.planDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.planActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLoadPlan(item)}
        >
          <Ionicons name="download-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeletePlan(item)}
        >
          <Ionicons name="trash-outline" size={24} color={Colors.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="folder-open-outline" size={64} color={Colors.textDisabled} />
      <Text style={styles.emptyTitle}>No Saved Plans</Text>
      <Text style={styles.emptyText}>
        Create a field plan and save it to see it here.
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => router.push('/(tabs)/field-planner')}
      >
        <Ionicons name="add-circle" size={20} color={Colors.textPrimary} />
        <Text style={styles.createButtonText}>Create New Plan</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Plans</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchPlans}>
          <Ionicons name="refresh" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPlans}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={savedPlans}
          renderItem={renderPlanItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
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
  refreshButton: {
    padding: Layout.spacing.sm,
  },
  listContent: {
    padding: Layout.spacing.md,
    flexGrow: 1,
  },
  planCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.md,
    alignItems: 'center',
  },
  planIcon: {
    width: 56,
    height: 56,
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.md,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: Layout.fontSize.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  planMeta: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textSecondary,
  },
  planDate: {
    fontSize: Layout.fontSize.xs,
    color: Colors.textDisabled,
    marginTop: 2,
  },
  planActions: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
  },
  actionButton: {
    padding: Layout.spacing.sm,
  },
  separator: {
    height: Layout.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Layout.spacing.md,
  },
  loadingText: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
    gap: Layout.spacing.md,
  },
  errorText: {
    fontSize: Layout.fontSize.md,
    color: Colors.danger,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
  },
  retryButtonText: {
    fontSize: Layout.fontSize.md,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  emptyTitle: {
    fontSize: Layout.fontSize.xl,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Layout.spacing.lg,
    marginBottom: Layout.spacing.sm,
  },
  emptyText: {
    fontSize: Layout.fontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Layout.spacing.lg,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    gap: Layout.spacing.sm,
  },
  createButtonText: {
    fontSize: Layout.fontSize.md,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
});
