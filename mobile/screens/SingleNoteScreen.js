"use client"
import { useEffect, useState, useContext } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert
} from "react-native"
import { Audio } from "expo-av"
import { Ionicons } from "@expo/vector-icons"
import { getNote } from "../app/api"
import { AuthContext } from "../context/AuthContext"

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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading note details...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error || !note) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Note Details</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Note Details</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.noteCard}>
          <View style={styles.noteHeader}>
            <Text style={styles.noteTitle}>{note.title}</Text>
            <Text style={styles.noteDate}>{formatDate(note.timestamp)}</Text>
          </View>

          <View style={styles.audioPlayerContainer}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => playSound(note.uri)}
            >
              <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#6366f1" />
            </TouchableOpacity>
            <Text style={styles.playText}>{isPlaying ? "Pause Audio" : "Play Audio"}</Text>
          </View>

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
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: "white",
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  noteCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  noteHeader: {
    marginBottom: 16,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  noteDate: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  audioPlayerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  playText: {
    fontSize: 16,
    color: "#4b5563",
  },
  sectionContainer: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 8,
  },
  contentBox: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 16,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#1f2937",
  },
})