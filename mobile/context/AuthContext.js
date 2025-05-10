import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser, registerUser, logoutUser, activateAccount } from '../app/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is logged in on app start
    const checkLoggedIn = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          // If we have a token, we can consider the user logged in
          // In a real app, you might want to validate the token with the backend
          setUser({ token });
        }
      } catch (error) {
        console.error("Failed to check login status", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkLoggedIn();
  }, []);

  // Login function
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      // Assuming loginUser now returns the user object on success
      const userData = await loginUser(email, password); 
      setUser(userData); // Set user state upon successful login
      // Token is already stored by loginUser
    } catch (error) {
      if (error instanceof AuthenticationError) {
        // If login itself fails with 401 (e.g., wrong password), 
        // or if another API call triggered this via apiRequest's 401 check.
        // Ensure user state is cleared. The token is already cleared by apiRequest.
        setUser(null); 
        setError("Authentication failed. Please check credentials or log in again.");
      } else {
        setError(error.message || 'Login failed');
      }
      setUser(null); // Ensure user is null on any login error
    } finally {
      setLoading(false);
    }
  };
  
  // Register function
  const register = async (name, email, password) => {
    setError(null);
    setLoading(true);
    
    try {
      await registerUser(name, email, password);
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Logout function
  const logout = async () => {
    setError(null);
    setLoading(true);
    
    try {
      await logoutUser();
      setUser(null);
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Activate account function
  const activate = async (token) => {
    setError(null);
    setLoading(true);
    
    try {
      await activateAccount(token);
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        activate,
        isLoggedIn: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};