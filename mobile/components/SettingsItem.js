// SettingsItem component for ProfileScreen
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { customTheme } from '../theme';

export const SettingsItem = ({
  icon,
  title,
  subtitle,
  onPress,
  showChevron = true,
  rightComponent,
  iconColor = customTheme.colors.primary,
  danger = false,
}) => (
  <TouchableOpacity 
    style={styles.settingItem} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.settingIconContainer, danger && styles.dangerIconContainer]}>
      <Ionicons 
        name={icon} 
        size={22} 
        color={danger ? customTheme.colors.error : iconColor} 
      />
    </View>
    
    <View style={styles.settingTextContainer}>
      <Text style={[styles.settingTitle, danger && styles.dangerText]}>
        {title}
      </Text>
      {subtitle && (
        <Text style={styles.settingSubtitle}>
          {subtitle}
        </Text>
      )}
    </View>
    
    {rightComponent ? (
      rightComponent
    ) : showChevron ? (
      <Ionicons 
        name="chevron-forward" 
        size={20} 
        color={danger ? customTheme.colors.error : customTheme.colors.textSecondary} 
      />
    ) : null}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: customTheme.colors.border,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: customTheme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dangerIconContainer: {
    backgroundColor: customTheme.colors.errorContainer,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: customTheme.colors.text,
  },
  settingSubtitle: {
    fontSize: 12,
    color: customTheme.colors.textSecondary,
    marginTop: 2,
  },
  dangerText: {
    color: customTheme.colors.error,
  },
});
