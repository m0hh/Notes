"use client"
import { useEffect, useState, useContext } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert
} from "react-native"
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from "expo-av"
import { Ionicons } from "@expo/vector-icons"
import { getNote } from "../app/api"
import { AuthContext } from "../context/AuthContext"
import { customTheme } from '../theme'
import { Header, ElevatedCard } from '../components/CommonComponents'
import { AudioPlayer } from '../components/AudioPlayer'

export default function SingleNoteScreen({ route, navigation }) {
  const { noteId } = route.params
  const [note, setNote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sound, setSound] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const { isLoggedIn } = useContext(AuthContext)

  useEffect(() => {
    fetchNote()
  }, [noteId])

  useEffect(() => {
    // Clean up sound when unmounting
    return () => {
      if (sound) {
        sound.unloadAsync()
      }
    }
  }, [sound])

  const fetchNote = async () => {
    if (!isLoggedIn) {
      navigation.goBack()
      return
    }

    setLoading(true)
    try {
      const response = await getNote(noteId)
      if (response && response.note) {
        setNote({
          id: response.note.id.toString(),
          title: response.note.title,
          uri: response.note.audio_file_path,
          timestamp: response.note.created_at,
          transcript: response.note.transcript && response.note.transcript.Valid 
            ? response.note.transcript.String : "",
          summary: response.note.summary && response.note.summary.Valid 
            ? response.note.summary.String : "",
          updated_at: response.note.updated_at,
          user_id: response.note.user_id,
        })
      }
    } catch (err) {
      console.error("Failed to fetch note:", err)
      setError("Failed to load note details. Please try again.")
      Alert.alert("Error", "Failed to load note details.")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString()
  }

  const playSound = async (uri) => {
    try {
      // If sound is already loaded
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync()
          setIsPlaying(false)
        } else {
          await sound.playAsync()
          setIsPlaying(true)
        }
        return
      }

      // Otherwise load and play
      const { sound: newSound } = await Audio.Sound.createAsync({ uri })
      setSound(newSound)
      
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false)
        }
      })
      
      await newSound.playAsync()
      setIsPlaying(true)
    } catch (error) {
      console.error("Error playing sound:", error)
      Alert.alert("Playback Error", "Unable to play this recording.")
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header 
          title="Note Details" 
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={customTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading note details...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error || !note) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header 
          title="Note Details" 
          onBack={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={customTheme.colors.error} />
          <Text style={styles.errorText}>{error || "Note not found"}</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={fetchNote}
          >
            <Text style={styles.refreshButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={customTheme.colors.background} />
      <Header 
        title="Note Details" 
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <ElevatedCard style={styles.noteCard}>
          <View style={styles.noteHeader}>
            <Text style={styles.noteTitle}>{note.title}</Text>
            <Text style={styles.noteDate}>{formatDate(note.timestamp)}</Text>
          </View>

          <AudioPlayer 
            uri={note.uri}
            sound={sound}
            setSound={setSound}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            onPlaybackStatusUpdate={(status) => {
              if (status.didJustFinish) {
                setIsPlaying(false);
              }
            }}
          />

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Transcript</Text>
            <View style={styles.contentBox}>
              {note.transcript ? (
                <Text style={styles.contentText}>{note.transcript}</Text>
              ) : (
                <Text style={styles.contentText}>Transcript not available.</Text>
              )}
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>AI Summary</Text>
            <View style={styles.contentBox}>
              {note.summary ? (
                <Text style={styles.contentText}>{note.summary}</Text>
              ) : (
                <Text style={styles.contentText}>Summary not available.</Text>
              )}
            </View>
          </View>
        </ElevatedCard>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: customTheme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: customTheme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: customTheme.colors.error,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: customTheme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  refreshButtonText: {
    color: "white",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  noteCard: {
    marginBottom: 16,
  },
  noteHeader: {
    marginBottom: 16,
  },
  noteTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: customTheme.colors.text,
    marginBottom: 4,
  },
  noteDate: {
    fontSize: 14,
    color: customTheme.colors.textSecondary,
  },
  audioPlayerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: customTheme.colors.surfaceVariant,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  playButtonContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: customTheme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    ...customTheme.elevation.small,
  },
  playText: {
    fontSize: 16,
    color: customTheme.colors.textSecondary,
    fontWeight: "500",
  },
  sectionContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: customTheme.colors.text,
    marginBottom: 8,
  },
  contentBox: {
    backgroundColor: customTheme.colors.surfaceVariant,
    borderRadius: 12,
    padding: 16,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: customTheme.colors.text,
  },
})