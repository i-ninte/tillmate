import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Layout } from '../../constants';

interface RelayButtonProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  isOn: boolean;
  isPending: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export default function RelayButton({
  label,
  icon,
  isOn,
  isPending,
  onToggle,
  disabled = false,
}: RelayButtonProps) {
  const backgroundColor = disabled
    ? Colors.surfaceLight
    : isOn
    ? Colors.primary
    : Colors.surface;

  const borderColor = isOn ? Colors.primary : Colors.border;

  return (
    <TouchableOpacity
      onPress={onToggle}
      disabled={disabled || isPending}
      style={[
        styles.button,
        { backgroundColor, borderColor },
        disabled && styles.disabled,
      ]}
      activeOpacity={0.7}
    >
      {isPending ? (
        <ActivityIndicator size="small" color={Colors.textPrimary} />
      ) : (
        <Ionicons
          name={icon}
          size={28}
          color={isOn ? Colors.textPrimary : Colors.textSecondary}
        />
      )}
      <Text
        style={[
          styles.label,
          { color: isOn ? Colors.textPrimary : Colors.textSecondary },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.state,
          { color: isOn ? Colors.textPrimary : Colors.textDisabled },
        ]}
      >
        {isOn ? 'ON' : 'OFF'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: Layout.relayButtonSize,
    height: Layout.relayButtonSize,
    borderRadius: Layout.radius.md,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: Layout.fontSize.xs,
    fontWeight: Layout.fontWeight.medium,
    marginTop: Layout.spacing.xs,
  },
  state: {
    fontSize: Layout.fontSize.xs,
    fontWeight: Layout.fontWeight.bold,
  },
});
