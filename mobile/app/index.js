import 'react-native-gesture-handler';
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { View, ActivityIndicator } from 'react-native';
import { useContext } from 'react';
import { registerRootComponent } from 'expo';

import RecorderScreen from "../screens/RecorderScreen";
import HistoryScreen from "../screens/HistoryScreen";
import LoginScreen from "../screens/LoginScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SingleNoteScreen from "../screens/SingleNoteScreen"; // Import SingleNoteScreen

import { RecordingsProvider } from "../context/RecordingsContext";
import { AuthProvider, AuthContext } from "../context/AuthContext";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Main content of the app when logged in
//sss
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Recorder") {
            iconName = focused ? "mic" : "mic-outline";
          } else if (route.name === "History") {
            iconName = focused ? "list" : "list-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
      })}
    >
      <Tab.Screen name="Recorder" component={RecorderScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Main navigation structure
function AppNavigator() {
  const { user, loading } = useContext(AuthContext);

  // Show loading screen while checking authentication status
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {user ? (
        // User is signed in - Group main tabs and detail screen
        <>
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SingleNote" // Changed from SingleNoteScreen to SingleNote
            component={SingleNoteScreen}
            options={{ headerShown: false }} // Optional: Hide header if managed inside the screen
          />
        </>
      ) : (
        // User is not signed in
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}

// Main app component with providers
function App() {
  return (
    <AuthProvider>
      <RecordingsProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </RecordingsProvider>
    </AuthProvider>
  );
}

// Register the main component
registerRootComponent(App);
export default App;
