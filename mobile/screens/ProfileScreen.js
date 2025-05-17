import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { customTheme } from '../theme';
import { LinearGradient } from 'react-native-linear-gradient';
import { Header, SecondaryButton } from '../components/CommonComponents';
import { AnimatedAvatar } from '../components/AnimatedAvatar';
import { SettingsItem } from '../components/SettingsItem';

export default function ProfileScreen() {
  const { user, logout } = useContext(AuthContext);

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={customTheme.colors.background} />
      <Header title="Profile" />

      <ScrollView style={styles.scrollView}>
        <View style={styles.profileContainer}>
          <AnimatedAvatar 
            size={100}
            icon="person"
            iconSize={60}
            colors={[customTheme.colors.primary, customTheme.colors.accent]}
          />
          <Text style={styles.emailText}>{user?.email || 'user@example.com'}</Text>
        </View>

        <View style={styles.settingsContainer}>
          <View style={styles.settingSection}>
            <Text style={styles.sectionTitle}>Account Settings</Text>
            
            <SettingsItem 
              icon="key-outline"
              title="Change Password"
              onPress={() => {}}
            />
            
            <SettingsItem 
              icon="notifications-outline"
              title="Notifications"
              subtitle="Manage your notification preferences"
              onPress={() => {}}
            />
          </View>

          <View style={styles.settingSection}>
            <Text style={styles.sectionTitle}>About</Text>
            
            <SettingsItem 
              icon="information-circle-outline"
              title="About NotesGPT"
              onPress={() => {}}
            />
            
            <SettingsItem 
              icon="help-circle-outline"
              title="Help & Support"
              subtitle="Get assistance with using the app"
              onPress={() => {}}
            />
          </View>

          <SettingsItem 
            icon="log-out-outline"
            title="Log Out"
            danger={true}
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: customTheme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  profileContainer: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: customTheme.colors.border,
  },
  emailText: {
    fontSize: 16,
    color: customTheme.colors.textSecondary,
    marginTop: 16,
  },
  settingsContainer: {
    flex: 1,
    padding: 20,
  },
  settingSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: customTheme.colors.text,
    marginBottom: 12,
  },
});