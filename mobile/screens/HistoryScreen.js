"use client"
import { useContext, useState, useCallback } from "react"
import { 
  View, 
  Text, 
  StyleSheet, 
  StatusBar,
  RefreshControl,
  ScrollView
} from "react-native"
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons"
import { RecordingsContext } from "../context/RecordingsContext"
import { AuthContext } from "../context/AuthContext"
import FolderComponent from "../components/FolderComponent"
import { Header, EmptyState } from '../components/CommonComponents'
import { customTheme } from '../theme'

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={customTheme.colors.background} />
      <Header title="Your Notes" />
      
      {isLoggedIn ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing || loading} 
              onRefresh={onRefresh}
              colors={[customTheme.colors.primary]}
              tintColor={customTheme.colors.primary}
            />
          }
        >
          <FolderComponent 
            navigation={navigation}
            onSelectRecording={handleSelectRecording}
          />
        </ScrollView>
      ) : (
        <EmptyState
          icon="lock-closed"
          message="Please log in to view your notes"
          actionButton={null}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: customTheme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
});
