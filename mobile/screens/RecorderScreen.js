"use client"

import { useState, useEffect, useContext } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from "react-native"
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from "expo-av"
import { Ionicons } from "@expo/vector-icons"
import { RecordingsContext } from "../context/RecordingsContext"
import { AuthContext } from "../context/AuthContext"
import { processAudioWithGemini } from "../app/api"
import FolderSelectorModal from "../components/FolderSelectorModal"
import { LinearGradient } from 'react-native-linear-gradient'
import { customTheme } from '../theme'
import { Header, ElevatedCard, GradientButton, SecondaryButton } from '../components/CommonComponents'

export default function RecorderScreen() {
  const [recording, setRecording] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [recordingUri, setRecordingUri] = useState(null)
  const [recordingDetails, setRecordingDetails] = useState({
    title: "",
    prompt: "",
    language: "english", // default language
    folderId: null // default folder is root
  })
  const [tempId, setTempId] = useState(null)
  const [showFolderSelector, setShowFolderSelector] = useState(false)

  const { 
    addRecording, 
    refreshRecordings,
    folders,
  } = useContext(RecordingsContext)
  const { isLoggedIn } = useContext(AuthContext)

  useEffect(() => {
    if (isLoggedIn) {
      refreshRecordings()
    }
  }, [isLoggedIn])

  useEffect(() => {
    let interval
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1)
      }, 1000)
    } else {
      setRecordingDuration(0)
    }
    return () => clearInterval(interval)
  }, [isRecording])

  useEffect(() => {
    return () => {
      if (recording) {
        stopRecording()
      }
    }
  }, [])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const startRecording = async () => {
    // Check if the user is logged in first
    if (!isLoggedIn) {
      Alert.alert(
        "Login Required",
        "You need to be logged in to record and process notes.",
        [{ text: "OK" }]
      )
      return
    }

    try {
      await Audio.requestPermissionsAsync()
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
      setRecording(recording)
      setIsRecording(true)
    } catch (err) {
      console.error("Failed to start recording", err)
      Alert.alert("Recording Error", "Failed to start recording. Please try again.")
    }
  }

  const stopRecording = async () => {
    if (!recording) return

    setIsRecording(false)
    console.log("[RecorderScreen] stopRecording: Recording stopped.");

    try {
      await recording.stopAndUnloadAsync()
      const uri = recording.getURI()
      setRecording(null)

      // Get current date and time for the default title
      const now = new Date()
      const defaultTitle = `Voice Note ${now.toLocaleString()}`
      
      // Set the URI and default title
      setRecordingUri(uri)
      setRecordingDetails({
        ...recordingDetails,
        title: defaultTitle,
        folderId: null // Reset to root folder
      })
      console.log("[RecorderScreen] stopRecording: Recording URI set, default title generated. Showing details modal.");
      
      // Generate a temporary ID for local tracking
      const newTempId = Date.now().toString()
      setTempId(newTempId)
      
      // Show the modal to collect recording details
      setShowModal(true)
    } catch (err) {
      console.error("Failed to stop recording", err)
      Alert.alert("Recording Error", "Failed to save recording. Please try again.")
    }
  }

  const handleSubmitRecording = () => {
    if (!recordingDetails.title.trim()) {
      Alert.alert("Required Field", "Please enter a title for your recording.")
      return
    }
    console.log(`[RecorderScreen] handleSubmitRecording: Submitting recording titled "${recordingDetails.title}" to folderId: ${recordingDetails.folderId}`);
    
    // Add to context with a temporary ID
    addRecording({
      id: tempId,
      uri: recordingUri,
      name: recordingDetails.title,
      timestamp: new Date().toISOString(),
      duration: recordingDuration,
      summary: "Processing...", // Will be updated after processing
      folder_id: recordingDetails.folderId
    })
    
    // Close the modal
    setShowModal(false)
    
    // Send to backend for processing
    sendToBackend(
      recordingUri, 
      recordingDetails.title, 
      tempId, 
      recordingDetails.prompt, 
      recordingDetails.language,
      recordingDetails.folderId
    )
  }

  const sendToBackend = async (uri, title, id, prompt = "", language = "english", folderId = null) => {
    setIsSending(true)
    console.log(`[RecorderScreen] sendToBackend: Sending recording to backend. Title: "${title}", FolderId: ${folderId}`);

    try {
      // Use the API function to process the audio with Gemini
      const response = await processAudioWithGemini(uri, title, prompt, language, folderId)

      // Update the recording with backend data
      if (response && response.note) {
        addRecording({
          id: response.note.id.toString(),
          uri: response.note.audio_file_path || uri,
          name: response.note.title,
          timestamp: response.note.created_at,
          duration: recordingDuration,
          transcript: response.note.transcript && response.note.transcript.Valid ? response.note.transcript.String : "",
          summary: response.note.summary && response.note.summary.Valid ? response.note.summary.String : "",
          updated_at: response.note.updated_at,
          user_id: response.note.user_id,
          folder_id: response.note.folder_id,
          fromBackend: true,
        })

        // Refresh the recordings list from backend
        refreshRecordings()
      }

      setIsSending(false)
    } catch (error) {
      console.error("Error sending recording to backend:", error)
      Alert.alert(
        "Processing Error",
        "Could not process your recording. It will be saved locally.",
        [{ text: "OK" }]
      )

      // Update the temporary recording with an error message
      addRecording({
        id: id,
        uri,
        name: title,
        timestamp: new Date().toISOString(),
        duration: recordingDuration,
        transcript: "Failed to process transcript.",
        summary: "Failed to process. Please try again later.",
        error: true,
        folder_id: folderId
      })

      setIsSending(false)
    }
  }

  const getFolderName = (folderId) => {
    if (folderId === null) return "Root Folder"
    const folder = folders.find(f => f.id === folderId)
    return folder ? folder.name : "Unknown folder"
  }

  const getFolderPath = (folderId) => {
    if (folderId === null) return "/"
    
    // Build the full path to the folder
    let path = []
    let currentId = folderId
    
    while (currentId !== null) {
      const folder = folders.find(f => f.id === currentId)
      if (!folder) break
      
      path.unshift(folder.name)
      currentId = folder.parent_id
    }
    
    return '/' + path.join('/')
  }

  const handleSelectFolder = (folderId) => {
    console.log(`[RecorderScreen] handleSelectFolder: Folder selected with ID: ${folderId}. Updating recordingDetails.`);
    setRecordingDetails({
      ...recordingDetails,
      folderId: folderId
    })
    setShowFolderSelector(false)
    console.log("[RecorderScreen] handleSelectFolder: FolderSelectorModal closed.");
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={customTheme.colors.background} />
      
      <Header title="Voice Notes" />
      
      <View style={styles.recorderContainer}>
        {isRecording ? (
          <ElevatedCard style={styles.recordingInfoCard}>
            <Text style={styles.recordingText}>Recording in progress...</Text>
            <Text style={styles.timerText}>{formatTime(recordingDuration)}</Text>
            <View style={styles.recordingIndicatorContainer}>
              <View style={styles.recordingIndicator} />
            </View>
          </ElevatedCard>
        ) : (
          <Text style={styles.instructionText}>
            {isLoggedIn
              ? "Tap the button below to start recording"
              : "Please log in to record voice notes"}
          </Text>
        )}
        
        <LinearGradient
          colors={isRecording 
            ? [customTheme.colors.error, customTheme.colors.error + '80'] 
            : [customTheme.colors.primary, customTheme.colors.primaryDark]}
          style={[
            styles.recordButtonGradient,
            !isLoggedIn ? styles.disabledButton : null,
          ]}
        >
          <TouchableOpacity
            style={styles.recordButton}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isSending || !isLoggedIn}
          >
            <Ionicons 
              name={isRecording ? "square" : "mic"} 
              size={32} 
              color="white" 
            />
          </TouchableOpacity>
        </LinearGradient>
        
        {isSending && (
          <ElevatedCard style={styles.sendingContainer}>
            <ActivityIndicator size="small" color={customTheme.colors.primary} />
            <Text style={styles.sendingText}>Processing with AI...</Text>
          </ElevatedCard>
        )}
      </View>

      {/* Recording Details Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Header 
              title="Recording Details" 
              containerStyle={styles.modalHeader}
              onBack={() => setShowModal(false)}
            />
            
            <ScrollView style={styles.modalScrollView}>
              <View style={styles.modalContent}>
                <Text style={styles.inputLabel}>Title <Text style={{color: customTheme.colors.error}}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={recordingDetails.title}
                  onChangeText={(text) => setRecordingDetails({...recordingDetails, title: text})}
                  placeholder="Enter recording title"
                  placeholderTextColor={customTheme.colors.placeholder}
                />
                
                <Text style={styles.inputLabel}>Save to Folder</Text>
                <TouchableOpacity 
                  style={styles.folderSelector}
                  onPress={() => {
                    console.log("[RecorderScreen] User tapped to select folder. Opening FolderSelectorModal.");
                    setShowFolderSelector(true);
                  }}
                >
                  <Ionicons 
                    name={recordingDetails.folderId ? "folder" : "folder-outline"} 
                    size={20} 
                    color={customTheme.colors.primary} 
                  />
                  <View style={styles.folderSelectorTextContainer}>
                    <Text style={styles.folderSelectorText}>
                      {getFolderName(recordingDetails.folderId)}
                    </Text>
                    <Text style={styles.folderPathText}>
                      {getFolderPath(recordingDetails.folderId)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={customTheme.colors.textSecondary} />
                </TouchableOpacity>
                
                <Text style={styles.inputLabel}>Summarization Prompt (optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={recordingDetails.prompt}
                  onChangeText={(text) => setRecordingDetails({...recordingDetails, prompt: text})}
                  placeholder="How would you like your audio to be summarized? Default is a summary with key points and main topics."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholderTextColor={customTheme.colors.placeholder}
                />
                
                <Text style={styles.inputLabel}>Summarization Language</Text>
                <View style={styles.languageButtons}>
                  <TouchableOpacity 
                    style={[
                      styles.languageButton, 
                      recordingDetails.language === 'english' && styles.selectedLanguage
                    ]}
                    onPress={() => setRecordingDetails({...recordingDetails, language: 'english'})}
                  >
                    <Text style={[
                      styles.languageButtonText,
                      recordingDetails.language === 'english' && styles.selectedLanguageText
                    ]}>English</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.languageButton, 
                      recordingDetails.language === 'arabic' && styles.selectedLanguage
                    ]}
                    onPress={() => setRecordingDetails({...recordingDetails, language: 'arabic'})}
                  >
                    <Text style={[
                      styles.languageButtonText,
                      recordingDetails.language === 'arabic' && styles.selectedLanguageText
                    ]}>Arabic</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.buttonContainer}>
                  <SecondaryButton 
                    title="Cancel"
                    onPress={() => setShowModal(false)}
                    style={styles.cancelButton}
                  />
                  <GradientButton 
                    title="Process Recording"
                    onPress={handleSubmitRecording}
                    style={styles.submitButton}
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Folder Selector Modal */}
      <FolderSelectorModal
        visible={showFolderSelector}
        onClose={() => {
          console.log("[RecorderScreen] FolderSelectorModal onClose triggered.");
          setShowFolderSelector(false);
        }}
        onSelectFolder={handleSelectFolder}
        title="Save Recording to Folder"
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: customTheme.colors.background,
  },
  recorderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  instructionText: {
    fontSize: 16,
    color: customTheme.colors.textSecondary,
    marginBottom: 40,
    textAlign: "center",
    maxWidth: '80%',
  },
  recordButtonGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    ...customTheme.elevation.medium,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: customTheme.colors.disabled,
    opacity: 0.6,
  },
  recordingInfoCard: {
    alignItems: "center",
    marginBottom: 40,
    padding: 24,
    width: '90%',
  },
  recordingText: {
    fontSize: 18,
    fontWeight: "bold",
    color: customTheme.colors.error,
    marginBottom: 10,
  },
  timerText: {
    fontSize: 42,
    fontWeight: "bold",
    color: customTheme.colors.text,
    marginBottom: 10,
  },
  recordingIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: customTheme.colors.error,
    opacity: 1,
    marginHorizontal: 4,
  },
  sendingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendingText: {
    marginLeft: 10,
    color: customTheme.colors.primary,
    fontSize: 14,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 24,
    width: "100%",
    maxHeight: "90%",
    ...customTheme.elevation.large,
    flexDirection: 'column',
    flexGrow: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    borderBottomWidth: 0,
    paddingVertical: 16,
    backgroundColor: "white",
  },
  modalScrollView: {
    flex: 1,
    width: '100%',
  },
  modalContent: {
    padding: 20,
    paddingTop: 0,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: customTheme.colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: customTheme.colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    backgroundColor: "white",
    fontSize: 16,
    color: customTheme.colors.text,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  submitButton: {
    flex: 1.5,
    marginLeft: 8,
  },
  languageButtons: {
    flexDirection: "row",
    marginBottom: 24,
  },
  languageButton: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: customTheme.colors.border,
    borderRadius: 12,
    alignItems: "center",
    marginRight: 12,
    backgroundColor: 'white',
  },
  selectedLanguage: {
    backgroundColor: customTheme.colors.primary,
    borderColor: customTheme.colors.primary,
  },
  languageButtonText: {
    fontWeight: "600",
    color: customTheme.colors.text,
  },
  selectedLanguageText: {
    color: "white",
  },
  folderSelector: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: customTheme.colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    backgroundColor: "white",
  },
  folderSelectorTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  folderSelectorText: {
    color: customTheme.colors.text,
    fontWeight: "500",
    fontSize: 16,
  },
  folderPathText: {
    color: customTheme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});
