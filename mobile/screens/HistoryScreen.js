"use client"
import { useContext, useState, useCallback } from "react"
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,  
  StatusBar,
  RefreshControl,
  ScrollView
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { RecordingsContext } from "../context/RecordingsContext"
import { AuthContext } from "../context/AuthContext"
import FolderComponent from "../components/FolderComponent"

export default function HistoryScreen({ navigation }) {
  const { 
    refreshRecordings,
    loading
  } = useContext(RecordingsContext)
  
  const { isLoggedIn } = useContext(AuthContext)
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    refreshRecordings()
    setTimeout(() => {
      setRefreshing(false)
    }, 1000)
  }, [])

  const handleSelectRecording = (recording) => {
    navigation.navigate("SingleNote", { noteId: recording.id })
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Folders</Text>
      </View>
      
      {isLoggedIn ? (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} />
          }
        >
          <FolderComponent 
            navigation={navigation}
            onSelectRecording={handleSelectRecording}
          />
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed" size={48} color="#d1d5db" />
          <Text style={styles.emptyStateText}>Please log in to view your recordings</Text>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
})
