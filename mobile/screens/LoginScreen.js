import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ImageBackground,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient';
import { customTheme } from '../theme';
import { GradientButton, SecondaryButton } from '../components/CommonComponents';

export default function LoginScreen({ navigation }) {
  const { 
    login, 
    register, 
    loading, 
    error, 
    loginWithGoogle, 
    loginWithApple, 
    isGoogleAuthAvailable, 
    isAppleAuthAvailable 
  } = useContext(AuthContext);
  
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    
    if (!email) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Email is invalid';
    
    if (!password) errors.password = 'Password is required';
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters';
    
    if (!isLogin) {
      if (!name) errors.name = 'Name is required';
      
      if (!confirmPassword) errors.confirmPassword = 'Please confirm your password';
      else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    if (isLogin) {
      const success = await login(email, password);
      if (success) {
        // Login successful - navigation will be handled by App.js
      }
    } else {
      const success = await register(name, email, password);
      if (success) {
        setIsLogin(true);
        setName('');
        setPassword('');
        setConfirmPassword('');
        // Show message that registration was successful
      }
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormErrors({});
  };

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      Alert.alert('Error', 'Google sign in failed. Please try again.');
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await loginWithApple();
    } catch (error) {
      Alert.alert('Error', 'Apple sign in failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: customTheme.colors.background }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <LinearGradient
            colors={[customTheme.colors.primary, customTheme.colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoContainer}
          >
            <View style={styles.logoIconContainer}>
              <Ionicons name="mic" size={40} color="white" />
            </View>
            <Text style={styles.appName}>NotesGPT</Text>
          </LinearGradient>
          
          <View style={styles.formWrapper}>
            <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
            <Text style={styles.subtitle}>
              {isLogin 
                ? 'Log in to access your voice notes' 
                : 'Sign up to start recording and saving your voice notes'}
            </Text>
            
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            
            <View style={styles.formContainer}>
              {!isLogin && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={[styles.input, formErrors.name && styles.inputError]}
                    placeholder="Your name"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    placeholderTextColor={customTheme.colors.placeholder}
                  />
                  {formErrors.name && <Text style={styles.errorMessage}>{formErrors.name}</Text>}
                </View>
              )}
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, formErrors.email && styles.inputError]}
                  placeholder="your.email@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={customTheme.colors.placeholder}
                />
                {formErrors.email && <Text style={styles.errorMessage}>{formErrors.email}</Text>}
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={[styles.input, formErrors.password && styles.inputError]}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholderTextColor={customTheme.colors.placeholder}
                />
                {formErrors.password && <Text style={styles.errorMessage}>{formErrors.password}</Text>}
              </View>
              
              {!isLogin && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={[styles.input, formErrors.confirmPassword && styles.inputError]}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    placeholderTextColor={customTheme.colors.placeholder}
                  />
                  {formErrors.confirmPassword && (
                    <Text style={styles.errorMessage}>{formErrors.confirmPassword}</Text>
                  )}
                </View>
              )}
              
              <GradientButton
                title={isLogin ? 'Log In' : 'Sign Up'}
                onPress={handleSubmit}
                disabled={loading}
                style={styles.submitButton}
              />
              
              {isLogin && (
                <>
                  <View style={styles.orContainer}>
                    <View style={styles.orLine} />
                    <Text style={styles.orText}>OR</Text>
                    <View style={styles.orLine} />
                  </View>
                  
                  <View style={styles.socialButtonsContainer}>
                    {isGoogleAuthAvailable && (
                      <TouchableOpacity
                        style={styles.socialButton}
                        onPress={handleGoogleSignIn}
                        disabled={loading}
                      >
                        <AntDesign name="google" size={20} color="#DB4437" />
                        <Text style={styles.socialButtonText}>Sign in with Google</Text>
                      </TouchableOpacity>
                    )}
                    
                    {isAppleAuthAvailable && (
                      <TouchableOpacity
                        style={styles.socialButton}
                        onPress={handleAppleSignIn}
                        disabled={loading}
                      >
                        <AntDesign name="apple1" size={20} color="black" />
                        <Text style={styles.socialButtonText}>Sign in with Apple</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
              
              <TouchableOpacity style={styles.toggleContainer} onPress={toggleMode}>
                <Text style={styles.toggleText}>
                  {isLogin
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Log in'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: customTheme.colors.background,
  },
  logoContainer: {
    paddingTop: 60,
    paddingBottom: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  logoIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  formWrapper: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: customTheme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: customTheme.colors.textSecondary,
    marginBottom: 32,
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: customTheme.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: customTheme.colors.border,
    fontSize: 16,
    color: customTheme.colors.text,
  },
  inputError: {
    borderColor: customTheme.colors.error,
  },
  errorMessage: {
    color: customTheme.colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  submitButton: {
    marginTop: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    color: customTheme.colors.primary,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: customTheme.colors.errorContainer,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: customTheme.colors.error,
  },
  errorText: {
    color: customTheme.colors.error,
    fontSize: 14,
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: customTheme.colors.border,
  },
  orText: {
    marginHorizontal: 12,
    color: customTheme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  socialButtonsContainer: {
    marginBottom: 24,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: customTheme.colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    ...customTheme.elevation.small,
  },
  socialButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: customTheme.colors.text,
  },
});