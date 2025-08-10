import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const Icon: any = MaterialCommunityIcons;

interface ActionRowProps {
  label: string;
  icon?: string;
  onPress: () => void;
}

const ActionRow: React.FC<ActionRowProps> = ({ label, icon, onPress }) => (
  <TouchableOpacity style={styles.container} onPress={onPress}>
        {icon && <Icon name={icon} size={24} style={styles.icon} />}
    <Text style={styles.label}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  icon: {
    marginRight: 15,
    color: '#555',
  },
  label: {
    fontSize: 16,
    color: '#333',
  },
});

export default ActionRow;
