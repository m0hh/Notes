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
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const { login, register, loading, error } = useContext(AuthContext);
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

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.logoContainer}>
          <Ionicons name="mic" size={64} color="#6366f1" />
          <Text style={styles.appName}>NotesGPT</Text>
        </View>
        
        <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
        <Text style={styles.subtitle}>
          {isLogin 
            ? 'Log in to access your notes' 
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
              />
              {formErrors.confirmPassword && (
                <Text style={styles.errorMessage}>{formErrors.confirmPassword}</Text>
              )}
            </View>
          )}
          
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isLogin ? 'Log In' : 'Sign Up'}
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.toggleContainer} onPress={toggleMode}>
            <Text style={styles.toggleText}>
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Log in'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f9fafb',
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorMessage: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  toggleText: {
    color: '#6366f1',
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
  },
});