// A modern audio player component for the NotesGPT app
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'react-native-linear-gradient';
import { Audio } from 'expo-av';
import { customTheme } from '../theme';

export const AudioPlayer = ({ 
  uri, 
  onPlaybackStatusUpdate,
  sound,
  setSound,
  isPlaying, 
  setIsPlaying 
}) => {
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const progressAnim = new Animated.Value(0);

  useEffect(() => {
    // Clean up when component unmounts
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  // Animate progress bar
  useEffect(() => {
    if (duration > 0) {
      progressAnim.setValue(position / duration);
    }
  }, [position, duration]);

  // Format time to display as MM:SS
  const formatTime = (milliseconds) => {
    if (!milliseconds) return '00:00';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlaybackStatus = (status) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis);
      setIsPlaying(status.isPlaying);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
    
    // Pass status to parent if needed
    if (onPlaybackStatusUpdate) {
      onPlaybackStatusUpdate(status);
    }
  };

  const playSound = async () => {
    try {
      setLoading(true);
      
      // If sound is already loaded
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          await sound.playAsync();
        }
        setLoading(false);
        return;
      }

      // Load and play the sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        handlePlaybackStatus
      );
      
      setSound(newSound);
      setLoading(false);
    } catch (error) {
      console.error('Error playing sound:', error);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[customTheme.colors.primary + '20', customTheme.colors.accent + '10']}
        style={styles.playerContainer}
      >
        <TouchableOpacity
          style={styles.playButton}
          onPress={playSound}
          disabled={loading}
        >
          <LinearGradient
            colors={[customTheme.colors.primary, customTheme.colors.accent]}
            style={styles.playButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={24}
                color="white"
              />
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: customTheme.spacing.m,
  },
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    ...customTheme.elevation.small,
  },
  playButton: {
    marginRight: 16,
  },
  playButtonGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...customTheme.elevation.small,
  },
  progressContainer: {
    flex: 1,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: customTheme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: customTheme.colors.primary,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: customTheme.colors.textSecondary,
  },
});
