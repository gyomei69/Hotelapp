import React from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * AuthInput — Figma-accurate pill-shaped input with left icon.
 *
 * Props:
 *   icon        – Ionicons name (e.g. 'person-outline')
 *   placeholder – placeholder text
 *   value / onChangeText – controlled input
 *   secureTextEntry – password mode
 *   showToggle  – show eye toggle (password fields)
 *   showPassword / onTogglePassword – toggle state
 *   keyboardType, autoCapitalize, returnKeyType, onSubmitEditing, inputRef
 *   error       – boolean, shows red border
 */
const AuthInput = ({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  showToggle = false,
  showPassword = false,
  onTogglePassword,
  keyboardType = 'default',
  autoCapitalize = 'none',
  returnKeyType = 'next',
  onSubmitEditing,
  inputRef,
  error = false,
}) => {
  return (
    <View style={[styles.container, error && styles.containerError]}>
      <Ionicons
        name={icon}
        size={18}
        color="#8E8E93"
        style={styles.icon}
      />
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#B0B0B5"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry && !showPassword}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
      />
      {showToggle && (
        <TouchableOpacity onPress={onTogglePassword} style={styles.eyeBtn}>
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#8E8E93"
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 28,
    paddingHorizontal: 18,
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  containerError: {
    borderColor: '#EF4444',
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1B2036',
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 6,
  },
});

export default AuthInput;
