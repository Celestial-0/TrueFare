import React, { useState, memo } from "react";
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";

// The interface is updated to accept an optional `leftIcon` prop.
// `keyof typeof Ionicons.glyphMap` ensures you can only use valid Ionicon names.
interface ProfileInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  isRequired?: boolean;
  containerStyle?: any;
  inputStyle?: any;
  leftIcon?: keyof typeof Ionicons.glyphMap;
}

const ProfileInput = memo(({
  label,
  error,
  isRequired = false,
  editable = true,
  containerStyle,
  inputStyle,
  leftIcon,
  ...textInputProps
}: ProfileInputProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const [isFocused, setIsFocused] = useState(false);

  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
      width: '100%',
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    requiredText: {
      color: theme.danger,
      fontSize: 14,
      fontWeight: '500',
    },
    // This new container wraps the icon and the text input
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: editable ? theme.inputBackground : theme.disabledBackground,
      height: 52,
      borderRadius: 14,
      borderWidth: 1.5,
      paddingHorizontal: 15,
      // The border color is now dynamic based on focus, error, and edit state
      borderColor: error
        ? theme.danger
        : isFocused
        ? theme.tint
        : 'transparent',
    },
    icon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: editable ? theme.text : theme.disabledText,
    },
    errorText: {
      color: theme.danger,
      fontSize: 12,
      marginTop: 6,
      marginLeft: 4,
    },
  });

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelContainer}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        {isRequired && <ThemedText style={styles.requiredText}> *</ThemedText>}
      </View>

      <View style={styles.inputContainer}>
        {/* The icon is rendered here if the `leftIcon` prop is provided */}
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={22}
            style={styles.icon}
            // The icon color also changes with focus state
            color={isFocused ? theme.tint : theme.icon}
          />
        )}
        <TextInput
          style={[styles.input, inputStyle]}
          placeholderTextColor={theme.icon}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...textInputProps}
        />
      </View>

      {/* The error message is now wrapped in an Animated.View for a fade-in effect */}
      {error && (
        <Animated.View entering={FadeIn.duration(300)}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </Animated.View>
      )}
    </View>
  );
});

ProfileInput.displayName = 'ProfileInput';

export default ProfileInput;