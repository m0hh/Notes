// A modern animated avatar component
import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'react-native-linear-gradient';
import { customTheme } from '../theme';

export const AnimatedAvatar = ({ 
  size = 100,
  icon = 'person',
  iconSize = 60,
  iconColor = 'white',
  colors = [customTheme.colors.primary, customTheme.colors.accent],
}) => {
  // Animation values
  const rotateAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(1);

  useEffect(() => {
    // Create rotating animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
    
    // Create subtle pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Interpolate rotation value
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  return (
    <Animated.View
      style={[
        styles.avatarContainer,
        { 
          width: size, 
          height: size,
          borderRadius: size / 2,
          transform: [
            { scale: scaleAnim },
          ] 
        },
      ]}
    >
      <Animated.View
        style={[
          styles.gradientContainer,
          { 
            width: size, 
            height: size,
            borderRadius: size / 2,
            transform: [{ rotate }] 
          },
        ]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient,
            { 
              width: size, 
              height: size,
              borderRadius: size / 2 
            },
          ]}
        />
      </Animated.View>
      
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={iconSize} color={iconColor} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    ...customTheme.elevation.medium,
  },
  gradientContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  iconContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
