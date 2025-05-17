// Common components for the modernized UI
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Surface, Button as PaperButton, Card, Title, Paragraph } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'react-native-linear-gradient';
import { customTheme } from '../theme';

// Modern elevated container
export const ElevatedCard = ({ children, style, ...props }) => (
  <Surface 
    style={[styles.elevatedCard, style]} 
    elevation={4} 
    {...props}
  >
    {children}
  </Surface>
);

// Modern gradient button
export const GradientButton = ({ 
  onPress, 
  title, 
  colors = [customTheme.colors.primary, customTheme.colors.primaryDark], 
  icon,
  style,
  textStyle,
  disabled = false,
  ...props 
}) => (
  <TouchableOpacity 
    onPress={onPress} 
    disabled={disabled}
    style={[styles.gradientButtonContainer, disabled && styles.disabledButton, style]}
    {...props}
  >
    {!disabled ? (
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientButton}
      >
        {icon && <Ionicons name={icon} size={20} color="white" style={styles.buttonIcon} />}
        <Text style={[styles.gradientButtonText, textStyle]}>{title}</Text>
      </LinearGradient>
    ) : (
      <View style={styles.gradientButton}>
        {icon && <Ionicons name={icon} size={20} color="white" style={styles.buttonIcon} />}
        <Text style={[styles.gradientButtonText, textStyle]}>{title}</Text>
      </View>
    )}
  </TouchableOpacity>
);

// Secondary button
export const SecondaryButton = ({ 
  onPress, 
  title, 
  icon,
  style,
  textStyle,
  ...props 
}) => (
  <TouchableOpacity 
    onPress={onPress} 
    style={[styles.secondaryButton, style]}
    {...props}
  >
    {icon && <Ionicons name={icon} size={20} color={customTheme.colors.primary} style={styles.buttonIcon} />}
    <Text style={[styles.secondaryButtonText, textStyle]}>{title}</Text>
  </TouchableOpacity>
);

// Header with back button
export const Header = ({ 
  title, 
  onBack, 
  rightComponent,
  containerStyle 
}) => (
  <View style={[styles.header, containerStyle]}>
    {onBack && (
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={customTheme.colors.text} />
      </TouchableOpacity>
    )}
    <Text style={styles.headerTitle}>{title}</Text>
    {rightComponent && (
      <View style={styles.rightComponent}>{rightComponent}</View>
    )}
  </View>
);

// Note card used in list views
export const NoteCard = ({
  title,
  date,
  summary,
  onPress,
}) => (
  <Card 
    style={styles.noteCard}
    onPress={onPress}
  >
    <Card.Content>
      <Title style={styles.noteTitle}>{title}</Title>
      <Text style={styles.noteDate}>{date}</Text>
      <Text numberOfLines={2} style={styles.noteSummary}>
        {summary || "No summary available"}
      </Text>
    </Card.Content>
  </Card>
);

// Folder card used in list views
export const FolderCard = ({
  name,
  itemCount,
  onPress,
}) => (
  <Card 
    style={styles.folderCard}
    onPress={onPress}
  >
    <Card.Content style={styles.folderCardContent}>
      <Ionicons name="folder" size={24} color={customTheme.colors.primary} />
      <View style={styles.folderTextContainer}>
        <Title style={styles.folderTitle}>{name}</Title>
        <Text style={styles.folderItemCount}>
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={customTheme.colors.textSecondary} />
    </Card.Content>
  </Card>
);

// Empty state with icon and message
export const EmptyState = ({
  icon = "document-text-outline",
  message = "No items found",
  actionButton,
}) => (
  <View style={styles.emptyState}>
    <Ionicons name={icon} size={60} color={customTheme.colors.disabled} />
    <Text style={styles.emptyStateMessage}>{message}</Text>
    {actionButton}
  </View>
);

const styles = StyleSheet.create({
  // Elevated Card
  elevatedCard: {
    padding: customTheme.spacing.m,
    borderRadius: customTheme.borderRadius.m,
    backgroundColor: customTheme.colors.surface,
    marginVertical: customTheme.spacing.s,
    marginHorizontal: customTheme.spacing.s,
  },
  
  // Gradient Button
  gradientButtonContainer: {
    borderRadius: customTheme.borderRadius.m,
    overflow: 'hidden',
    marginVertical: customTheme.spacing.s,
  },
  gradientButton: {
    paddingVertical: customTheme.spacing.m,
    paddingHorizontal: customTheme.spacing.l,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
    backgroundColor: customTheme.colors.disabled,
  },
  gradientButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: customTheme.typography.fontSize.m,
  },
  
  // Secondary Button
  secondaryButton: {
    borderRadius: customTheme.borderRadius.m,
    borderWidth: 1,
    borderColor: customTheme.colors.primary,
    paddingVertical: customTheme.spacing.m,
    paddingHorizontal: customTheme.spacing.l,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginVertical: customTheme.spacing.s,
  },
  secondaryButtonText: {
    color: customTheme.colors.primary,
    fontWeight: '600',
    fontSize: customTheme.typography.fontSize.m,
  },
  
  // Button Icon
  buttonIcon: {
    marginRight: customTheme.spacing.s,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: customTheme.spacing.m,
    paddingHorizontal: customTheme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: customTheme.colors.border,
    backgroundColor: customTheme.colors.surface,
  },
  backButton: {
    marginRight: customTheme.spacing.m,
    padding: customTheme.spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: customTheme.typography.fontSize.l,
    fontWeight: 'bold',
    color: customTheme.colors.text,
  },
  rightComponent: {
    marginLeft: customTheme.spacing.m,
  },
  
  // Note Card
  noteCard: {
    marginVertical: customTheme.spacing.s,
    marginHorizontal: customTheme.spacing.m,
    borderRadius: customTheme.borderRadius.m,
    ...customTheme.elevation.small,
  },
  noteTitle: {
    fontSize: customTheme.typography.fontSize.l,
    fontWeight: 'bold',
    color: customTheme.colors.text,
    marginBottom: customTheme.spacing.xs,
  },
  noteDate: {
    fontSize: customTheme.typography.fontSize.xs,
    color: customTheme.colors.textSecondary,
    marginBottom: customTheme.spacing.s,
  },
  noteSummary: {
    fontSize: customTheme.typography.fontSize.s,
    color: customTheme.colors.textSecondary,
    lineHeight: 20,
  },
  
  // Folder Card
  folderCard: {
    marginVertical: customTheme.spacing.s,
    marginHorizontal: customTheme.spacing.m,
    borderRadius: customTheme.borderRadius.m,
    ...customTheme.elevation.small,
  },
  folderCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderTextContainer: {
    flex: 1,
    marginLeft: customTheme.spacing.m,
  },
  folderTitle: {
    fontSize: customTheme.typography.fontSize.m,
    fontWeight: 'bold',
    color: customTheme.colors.text,
  },
  folderItemCount: {
    fontSize: customTheme.typography.fontSize.xs,
    color: customTheme.colors.textSecondary,
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: customTheme.spacing.xl,
  },
  emptyStateMessage: {
    fontSize: customTheme.typography.fontSize.m,
    color: customTheme.colors.textSecondary,
    textAlign: 'center',
    marginTop: customTheme.spacing.m,
    marginBottom: customTheme.spacing.l,
  },
});
