import React, { memo } from "react";
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface ProfileInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  isRequired?: boolean;
  containerStyle?: any;
  inputStyle?: any;
}

const ProfileInput = memo(({
  label,
  error,
  isRequired = false,
  editable = true,
  containerStyle,
  inputStyle,
  ...textInputProps
}: ProfileInputProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const styles = StyleSheet.create({
    container: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: "500",
      marginBottom: 8,
      color: theme.text,
    },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      minHeight: 48,
      borderColor: error ? theme.error : theme.inputBorder,
      backgroundColor: editable ? theme.background : theme.inputBackground,
      color: editable ? theme.text : theme.disabledText,
    },
    errorText: {
      color: theme.error,
      fontSize: 14,
      marginTop: 4,
    },
    requiredText: {
      color: theme.error,
    },
  });

  return (
    <View 
      style={[styles.container, containerStyle]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${label}${isRequired ? ' required' : ''} input field`}
    >
      <ThemedText style={styles.label}>
        {label}
        {isRequired && <ThemedText style={styles.requiredText}> *</ThemedText>}
      </ThemedText>
      
      <TextInput
        style={[styles.input, inputStyle]}
        placeholderTextColor={theme.disabledText + "80"}
        editable={editable}
        accessibilityLabel={`${label} input`}
        accessibilityState={{
          disabled: !editable,
        }}
        {...textInputProps}
      />
      
      {error && (
        <ThemedText 
          style={styles.errorText}
          accessibilityRole="alert"
          accessibilityLabel={`Error: ${error}`}
        >
          {error}
        </ThemedText>
      )}
    </View>
  );
});

ProfileInput.displayName = 'ProfileInput';

export default ProfileInput;
