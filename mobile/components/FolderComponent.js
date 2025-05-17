import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  Button,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecordingsContext } from '../context/RecordingsContext';
import FolderSelectorModal from './FolderSelectorModal';
import * as api from '../app/api';
import { customTheme } from '../theme';
import { ElevatedCard, GradientButton, SecondaryButton, FolderCard, NoteCard, EmptyState } from './CommonComponents';

export default function FolderComponent({ 
  navigation,
  onSelectRecording, 
  selectedFolderId = null,
  onNavigateToFolder = null
}) {
  const { 
    folders, 
    recordings, 
    addFolder, 
    removeFolder, 
    moveRecording,
    currentFolderId,
    folderPath,
    refreshRecordings,
    navigateToFolder
  } = useContext(RecordingsContext);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMoveFolderSelectorModal, setShowMoveFolderSelectorModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [targetFolderId, setTargetFolderId] = useState(null);
  const [showSubfolderMenu, setShowSubfolderMenu] = useState({});
  
  const [queryText, setQueryText] = useState('');
  const [isLoadingQuery, setIsLoadingQuery] = useState(false);
  const [queryAnswer, setQueryAnswer] = useState(null);
  const [queryError, setQueryError] = useState(null);

  console.log("[FolderComponent] Initializing. currentFolderId:", currentFolderId, "folderPath:", JSON.stringify(folderPath));
  
  const getCurrentFolderRecordings = () => {
    const recordingsInFolder = recordings.filter(
      (r) => r.folder_id === currentFolderId || (currentFolderId === null && r.folder_id == null)
    );
    console.log("[FolderComponent] getCurrentFolderRecordings for currentFolderId:", currentFolderId, "found:", recordingsInFolder.length);
    return recordingsInFolder;
  };
  
  const getCurrentSubfolders = () => {
    const subfolders = folders.filter(
      (f) => f.parent_id === currentFolderId || (currentFolderId === null && f.parent_id == null)
    );
    console.log("[FolderComponent] getCurrentSubfolders for currentFolderId:", currentFolderId, "found:", subfolders.length);
    return subfolders;
  };
  
  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      console.log("[FolderComponent] handleCreateFolder: creating folder named:", newFolderName, "in currentFolderId:", currentFolderId);
      await addFolder(newFolderName, currentFolderId);
      setNewFolderName('');
      setShowCreateModal(false);
    }
  };
  
  const handleFolderPress = (folderId, folderName) => {
    console.log("[FolderComponent] handleFolderPress: navigating to folderId:", folderId, "folderName:", folderName);
    navigateToFolder(folderId, folderName);
  };

  const handleFolderNavigation = (folderId, folderName) => {
    console.log(`[FolderComponent] User initiated navigation to folder: ${folderName} (ID: ${folderId})`);
    navigateToFolder(folderId, folderName);
  };
  
  const handleBackPress = () => {
    console.log("[FolderComponent] handleBackPress called. Current folderPath:", JSON.stringify(folderPath));
    if (folderPath.length > 0) {
      if (folderPath.length === 1) {
        console.log("[FolderComponent] handleBackPress: Navigating to root from top-level folder:", folderPath[0].name);
        navigateToFolder(null);
      } else {
        const parentInPath = folderPath[folderPath.length - 2];
        console.log("[FolderComponent] handleBackPress: Navigating to parent folder:", parentInPath.name);
        navigateToFolder(parentInPath.id, parentInPath.name);
      }
    } else {
      console.log("[FolderComponent] handleBackPress: Already at root or unexpected state. Ensuring navigation to root.");
      navigateToFolder(null);
    }
  };
  
  const confirmDeleteFolder = (folderId, folderName) => {
    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete "${folderName}"? This action cannot be undone. Recordings might be lost if not handled by backend.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => handleDeleteFolder(folderId) 
        }
      ]
    );
  };
  
  const handleDeleteFolder = async (folderId) => {
    try {
      await removeFolder(folderId); 
    } catch (error) {
      console.error('Error deleting folder in component', error);
      Alert.alert('Error', 'Could not delete folder');
    }
  };
  
  const handleRecordingOptions = (recording) => {
    setSelectedRecording(recording);
    Alert.alert(
      'Recording Options',
      'What would you like to do with this recording?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Move to Another Folder', 
          onPress: () => {
            setShowMoveFolderSelectorModal(true);
            console.log("[FolderComponent] Showing FolderSelectorModal for move operation.");
          } 
        },
      ]
    );
  };
  
  const handleMoveRecording = async (destinationFolderId) => {
    if (selectedRecording) {
      console.log("[FolderComponent] handleMoveRecording: moving recordingId:", selectedRecording.id, "to targetFolderId:", destinationFolderId);
      await moveRecording(selectedRecording.id, destinationFolderId);
      setShowMoveFolderSelectorModal(false);
      setSelectedRecording(null);
      refreshRecordings();
    }
  };

  const handleSelectFolderForMove = (folderId) => {
    console.log(`[FolderComponent] handleSelectFolderForMove: Folder selected with ID: ${folderId}.`);
    setShowMoveFolderSelectorModal(false);
    if (selectedRecording) {
      handleMoveRecording(folderId);
    } else {
      console.warn("[FolderComponent] handleSelectFolderForMove: selectedRecording is null. Cannot move.");
      Alert.alert("Error", "No recording selected to move.");
    }
  };
  
  const toggleSubfolderMenu = (folderId) => {
    setShowSubfolderMenu(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };
  
  const getCurrentFolderName = () => {
    if (currentFolderId === null) {
      console.log("[FolderComponent] getCurrentFolderName: At root.");
      return "Root";
    }
    const currentFolder = folders.find(f => f.id === currentFolderId);
    const name = currentFolder ? currentFolder.name : (folderPath.length > 0 ? folderPath[folderPath.length -1].name : "Folder");
    console.log("[FolderComponent] getCurrentFolderName: currentFolderId:", currentFolderId, "resolved name:", name);
    return name;
  };

  const handleAskQuery = async () => {
    if (!queryText.trim() || !currentFolderId) {
      setQueryError("Missing information to ask a question.");
      return;
    }
    setIsLoadingQuery(true);
    setQueryAnswer(null);
    setQueryError(null);
    try {
      const result = await api.queryFolder(currentFolderId, queryText);
      setQueryAnswer(result.answer || "No answer found.");
    } catch (error) {
      console.error("Error querying folder:", error);
      setQueryError(error.message || "Failed to get an answer.");
    } finally {
      setIsLoadingQuery(false);
    }
  };

  useEffect(() => {
    console.log("[FolderComponent] useEffect - folders, recordings, or currentFolderId changed. currentFolderId:", currentFolderId);
    console.log("[FolderComponent] Current subfolders:", getCurrentSubfolders().length, "Current recordings:", getCurrentFolderRecordings().length);
  }, [folders, recordings, currentFolderId]);

  return (
    <View style={styles.container}>
      <View style={styles.folderHeader}>
        {((onNavigateToFolder && selectedFolderId !== null) || 
          (!onNavigateToFolder && folderPath.length > 0)) && (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={22} color={customTheme.colors.primary} />
          </TouchableOpacity>
        )}
        
        <Text style={styles.folderTitle}>
          {getCurrentFolderName()}
        </Text>
        
        <TouchableOpacity 
          style={styles.createButton} 
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add-circle" size={24} color={customTheme.colors.primary} />
        </TouchableOpacity>
      </View>
      
      {getCurrentSubfolders().length > 0 && (
        <View style={styles.subfolderSection}>
          <Text style={styles.sectionTitle}>Folders</Text>
          <ScrollView 
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.folderRow}
          >
            {getCurrentSubfolders().map(folder => (
              <View key={folder.id} style={styles.folderCard}>
                <TouchableOpacity 
                  style={styles.folderCardContent} 
                  onPress={() => handleFolderNavigation(folder.id, folder.name)}
                >
                  <View style={styles.folderIconContainer}>
                    <Ionicons name="folder" size={30} color={customTheme.colors.primary} />
                  </View>
                  <Text style={styles.folderName} numberOfLines={1}>
                    {folder.name}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.folderOptions}
                  onPress={() => toggleSubfolderMenu(folder.id)}
                >
                  <Ionicons name="ellipsis-vertical" size={16} color={customTheme.colors.textSecondary} />
                </TouchableOpacity>
                
                {showSubfolderMenu[folder.id] && (
                  <View style={styles.folderMenu}>
                    <TouchableOpacity 
                      style={styles.menuItem}
                      onPress={() => {
                        toggleSubfolderMenu(folder.id);
                        confirmDeleteFolder(folder.id, folder.name);
                      }}
                    >
                      <Ionicons name="trash" size={18} color={customTheme.colors.error} />
                      <Text style={styles.menuItemTextDelete}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}
      
      <View style={styles.recordingsSection}>
        <Text style={styles.sectionTitle}>
          Recordings {getCurrentFolderRecordings().length > 0 ? `(${getCurrentFolderRecordings().length})` : ''}
        </Text>
        {getCurrentFolderRecordings().length === 0 ? (
          <EmptyState 
            icon="document-text-outline"
            message="No recordings in this folder"
          />
        ) : (
          <ScrollView>
            {getCurrentFolderRecordings().map(recording => (
              <ElevatedCard
                key={recording.id}
                style={styles.recordingItem}
              >
                <TouchableOpacity
                  onPress={() => onSelectRecording(recording)}
                  style={styles.recordingItemContent}
                >
                  <View style={styles.recordingIconContainer}>
                    <Ionicons name="musical-notes-outline" size={24} color={customTheme.colors.primary} />
                  </View>
                  <View style={styles.recordingInfo}>
                    <Text style={styles.recordingName}>{recording.name || `Recording ${recording.id}`}</Text>
                    <Text style={styles.recordingDate}>
                      {new Date(recording.timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.recordingOptionsButton}
                    onPress={() => handleRecordingOptions(recording)}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color={customTheme.colors.textSecondary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              </ElevatedCard>
            ))}
          </ScrollView>
        )}
      </View>
      
      {currentFolderId !== null && (
        <View style={styles.qaSection}>
          <ElevatedCard style={styles.qaCard}>
            <Text style={styles.qaSectionTitle}>Ask a question about this folder</Text>
            <TextInput
              style={styles.textInputQa}
              placeholder="Type your question here..."
              value={queryText}
              onChangeText={setQueryText}
              placeholderTextColor={customTheme.colors.placeholder}
            />
            <GradientButton 
              title="Ask AI" 
              onPress={handleAskQuery} 
              disabled={isLoadingQuery}
              icon="chatbubble-outline"
            />
            {isLoadingQuery && <ActivityIndicator size="large" color={customTheme.colors.primary} style={styles.loadingIndicator} />}
            {queryAnswer && !isLoadingQuery && (
              <View style={styles.answerContainer}>
                <Text style={styles.answerTitle}>Answer:</Text>
                <Text style={styles.answerText}>{queryAnswer}</Text>
              </View>
            )}
            {queryError && !isLoadingQuery && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Error:</Text>
                <Text style={styles.errorText}>{queryError}</Text>
              </View>
            )}
          </ElevatedCard>
        </View>
      )}
      
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Folder</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton} 
                onPress={() => {
                  setShowCreateModal(false);
                  setNewFolderName('');
                }}
              >
                <Ionicons name="close" size={24} color={customTheme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>
                {(onNavigateToFolder ? selectedFolderId : currentFolderId) === null
                  ? "Create folder in Root"
                  : `Create folder in ${getCurrentFolderName()}`}
              </Text>
              
              <TextInput
                style={styles.textInput}
                value={newFolderName}
                onChangeText={setNewFolderName}
                placeholder="Folder name"
                placeholderTextColor={customTheme.colors.placeholder}
                autoFocus
              />
              
              <View style={styles.modalButtons}>
                <SecondaryButton 
                  title="Cancel"
                  onPress={() => {
                    setShowCreateModal(false);
                    setNewFolderName('');
                  }}
                  style={styles.cancelButton}
                />
                
                <GradientButton 
                  title="Create"
                  onPress={handleCreateFolder}
                  style={styles.createModalButton}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
      
      <FolderSelectorModal
        visible={showMoveFolderSelectorModal}
        onClose={() => {
          console.log("[FolderComponent] FolderSelectorModal (for move) onClose triggered.");
          setShowMoveFolderSelectorModal(false);
          setSelectedRecording(null);
        }}
        onSelectFolder={handleSelectFolderForMove}
        title="Move Recording To..."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: customTheme.colors.background,
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: customTheme.colors.border,
  },
  backButton: {
    padding: 8,
  },
  folderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: customTheme.colors.text,
    marginLeft: 8,
  },
  createButton: {
    padding: 8,
  },
  subfolderSection: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: customTheme.colors.text,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  folderRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  folderCard: {
    position: 'relative',
    width: 120,
    marginRight: 12,
    borderRadius: 16,
    backgroundColor: customTheme.colors.surface,
    ...customTheme.elevation.small,
  },
  folderCardContent: {
    alignItems: 'center',
    padding: 16,
  },
  folderIconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: customTheme.colors.surfaceVariant,
    borderRadius: 30,
  },
  folderName: {
    fontSize: 14,
    color: customTheme.colors.text,
    textAlign: 'center',
  },
  folderOptions: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  folderMenu: {
    position: 'absolute',
    top: 24,
    right: 0,
    backgroundColor: customTheme.colors.surface,
    borderRadius: 12,
    padding: 4,
    ...customTheme.elevation.medium,
    zIndex: 100,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  menuItemTextDelete: {
    marginLeft: 8,
    fontSize: 14,
    color: customTheme.colors.error,
  },
  recordingsSection: {
    flex: 1,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  recordingItem: {
    marginBottom: 12,
  },
  recordingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  recordingIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: customTheme.colors.surfaceVariant,
    marginRight: 12,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingName: {
    fontSize: 16,
    color: customTheme.colors.text,
    fontWeight: '500',
  },
  recordingDate: {
    fontSize: 12,
    color: customTheme.colors.textSecondary,
    marginTop: 4,
  },
  recordingOptionsButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    backgroundColor: customTheme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...customTheme.elevation.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: customTheme.colors.border,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: customTheme.colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: customTheme.colors.textSecondary,
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: customTheme.colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: customTheme.colors.surface,
    color: customTheme.colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  createModalButton: {
    flex: 1,
    marginLeft: 8,
  },
  qaSection: {
    padding: 16,
  },
  qaCard: {
    padding: 16,
  },
  qaSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: customTheme.colors.text,
    marginBottom: 16,
  },
  textInputQa: {
    borderWidth: 1,
    borderColor: customTheme.colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: 'white',
    color: customTheme.colors.text,
  },
  loadingIndicator: {
    marginVertical: 16,
  },
  answerContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: customTheme.colors.primaryContainer,
    borderRadius: 12,
  },
  answerTitle: {
    fontWeight: 'bold',
    color: customTheme.colors.primary,
    marginBottom: 8,
  },
  answerText: {
    fontSize: 15,
    color: customTheme.colors.text,
    lineHeight: 22,
  },
  errorContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: customTheme.colors.errorContainer,
    borderRadius: 12,
  },
  errorTitle: {
    fontWeight: 'bold',
    color: customTheme.colors.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: customTheme.colors.error,
  },
});