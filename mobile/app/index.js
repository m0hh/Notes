import 'react-native-gesture-handler';
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { useContext } from 'react';
import { registerRootComponent } from 'expo';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RecorderScreen from "../screens/RecorderScreen";
import HistoryScreen from "../screens/HistoryScreen";
import LoginScreen from "../screens/LoginScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SingleNoteScreen from "../screens/SingleNoteScreen"; // Import SingleNoteScreen

import { RecordingsProvider } from "../context/RecordingsContext";
import { AuthProvider, AuthContext } from "../context/AuthContext";
import { theme, customTheme } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Main content of the app when logged in
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Recorder") {
            iconName = focused ? "mic" : "mic-outline";
          } else if (route.name === "History") {
            iconName = focused ? "folder" : "folder-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: customTheme.colors.primary,
        tabBarInactiveTintColor: customTheme.colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: 4,
        },
        tabBarStyle: {
          height: 60,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: customTheme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: customTheme.colors.border,
          ...customTheme.elevation.medium,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Recorder" 
        component={RecorderScreen} 
        options={{
          tabBarLabel: 'Record'
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{
          tabBarLabel: 'Notes'
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
}

// Main navigation structure
function AppNavigator() {
  const { user, loading } = useContext(AuthContext);

  // Show loading screen while checking authentication status
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: customTheme.colors.background }}>
        <ActivityIndicator size="large" color={customTheme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: customTheme.colors.background },
        cardStyleInterpolator: ({ current, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
              opacity: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
            overlayStyle: {
              opacity: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.4],
              }),
            },
          };
        },
      }}
    >
      {user ? (
        // User is signed in - Group main tabs and detail screen
        <>
          <Stack.Screen
            name="Main"
            component={MainTabs}
          />
          <Stack.Screen
            name="SingleNote"
            component={SingleNoteScreen}
          />
        </>
      ) : (
        // User is not signed in
        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />
      )}
    </Stack.Navigator>
  );
}

// Main app component with providers
function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar barStyle="dark-content" backgroundColor={customTheme.colors.surface} />
        <AuthProvider>
          <RecordingsProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </RecordingsProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

// Register the main component
registerRootComponent(App);
export default App;
