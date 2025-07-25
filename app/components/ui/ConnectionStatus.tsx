import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useApp } from '../../contexts/AppContext';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';

interface ConnectionStatusProps {
  showIcon?: boolean;
  isConnected?: boolean;
  lastUpdateTime?: Date;
  retryCount?: number;
  onRetry?: () => void;
  pendingEmissions?: number;
  showDetails?: boolean;
}

export default function ConnectionStatus({ 
  showIcon = true,
  isConnected,
  lastUpdateTime,
  retryCount = 0,
  onRetry,
  pendingEmissions = 0,
  showDetails = false
}: ConnectionStatusProps) {
  const { state } = useApp();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // Use passed props or fall back to app state
  const connectionStatus = isConnected !== undefined ? 
    (isConnected ? 'connected' : (retryCount > 0 ? 'connecting' : 'disconnected')) :
    state.connectionStatus;

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return '#4CAF50'; // Green
      case 'connecting':
        return '#FF9800'; // Orange
      case 'disconnected':
        return '#757575'; // Gray
      case 'error':
        return '#F44336'; // Red
      default:
        return theme.text;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Real-time Updates Active';
      case 'connecting':
        return retryCount > 0 ? `Reconnecting (${retryCount}/3)` : 'Connecting...';
      case 'disconnected':
        return 'Connection Lost';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return '🟢';
      case 'connecting':
        return '🟡';
      case 'disconnected':
        return '🔴';
      case 'error':
        return '❌';
      default:
        return '⚪';
    }
  };

  const getDetailText = () => {
    if (connectionStatus === 'connected' && lastUpdateTime) {
      return `Last update: ${lastUpdateTime.toLocaleTimeString()}`;
    }
    if (connectionStatus === 'connecting' && retryCount > 0) {
      return `Attempting to reconnect...`;
    }
    if (pendingEmissions > 0) {
      return `${pendingEmissions} updates queued`;
    }
    return 'Pull to refresh for latest data';
  };

  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: connectionStatus === 'connected' ? '#d4edda' : '#f8d7da',
        borderColor: getStatusColor()
      }
    ]}>
      <View style={styles.mainRow}>
        {showIcon && (
          <Text style={styles.icon}>{getStatusIcon()}</Text>
        )}
        <Text style={[styles.text, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>
      
      {showDetails && (
        <Text style={[styles.detailText, { color: getStatusColor() }]}>
          {getDetailText()}
        </Text>
      )}

      {connectionStatus !== 'connected' && onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 12,
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
