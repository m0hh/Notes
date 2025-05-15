// Social Authentication utilities
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';

// Register your web client here:
// https://console.cloud.google.com/
// Use environment variables or a secure method to store these values
// NEVER commit actual client IDs to a public repository
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 'YOUR_GOOGLE_ANDROID_CLIENT_ID';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'YOUR_GOOGLE_IOS_CLIENT_ID';

// Automatically initializes the WebBrowser
WebBrowser.maybeCompleteAuthSession();

// Hook for Google Authentication
export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    // Using Android client ID as the primary authentication method
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    // Keep iOS client ID for iOS users
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    // Only use webClientId for web users or as fallback
    webClientId: GOOGLE_CLIENT_ID,
    // Add this line for Expo client
    expoClientId: GOOGLE_CLIENT_ID, // You can use the same client ID as webClientId
    redirectUri: makeRedirectUri({
      useProxy: true,
      // scheme: 'notesgpt'
    }),
  });

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (response?.type === 'success') {
      setLoading(true);
      setError(null);
      const { authentication } = response;
      
      // Get user information using the access token
      fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${authentication.accessToken}` },
      })
        .then(response => response.json())
        .then(userInfo => {
          setUserData({
            provider: 'google',
            id_token: authentication.idToken,
            provider_user_id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture
          });
        })
        .catch(error => {
          console.error('Error fetching Google user data:', error);
          setError('Failed to get user information from Google');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [response]);

  return {
    signInWithGoogle: promptAsync,
    googleUserData: userData,
    googleLoading: loading,
    googleError: error,
    googleRequest: request
  };
};

// Function for Apple Authentication (only available on iOS)
export const useAppleAuth = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(
        available => setIsAvailable(available)
      );
    }
  }, []);

  const signInWithApple = async () => {
    try {
      setLoading(true);
      setError(null);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      // The credential object includes:
      // - user: the unique user ID (opaque string)
      // - fullName: the user's full name (might be null if not requested)
      // - email: the user's email (might be null if not requested)
      // - identityToken: a JWT token that can be used to verify the user on your server

      setUserData({
        provider: 'apple',
        id_token: credential.identityToken,
        provider_user_id: credential.user,
        email: credential.email || '', // Apple might not provide email on subsequent logins
        name: credential.fullName ? 
          `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim() : 
          'Apple User', // Apple might not provide name on subsequent logins
      });
      
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') {
        console.error('Error with Apple authentication:', error);
        setError('Apple authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    signInWithApple,
    appleUserData: userData,
    appleLoading: loading,
    appleError: error,
    isAppleAuthAvailable: isAvailable
  };
};
