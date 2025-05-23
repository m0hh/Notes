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
            <Ionicons name="arrow-back" size={22} color="#6366f1" />
          </TouchableOpacity>
        )}
        
        <Text style={styles.folderTitle}>
          {getCurrentFolderName()}
        </Text>
        
        <TouchableOpacity 
          style={styles.createButton} 
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={22} color="#6366f1" />
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
                  <Ionicons name="folder" size={30} color="#6366f1" />
                  <Text style={styles.folderName} numberOfLines={1}>
                    {folder.name}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.folderOptions}
                  onPress={() => toggleSubfolderMenu(folder.id)}
                >
                  <Ionicons name="ellipsis-vertical" size={16} color="#9ca3af" />
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
                      <Ionicons name="trash" size={18} color="#ef4444" />
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
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No recordings in this folder</Text>
          </View>
        ) : (
          <ScrollView>
            {getCurrentFolderRecordings().map(recording => (
              <TouchableOpacity
                key={recording.id}
                style={styles.recordingItem}
                onPress={() => onSelectRecording(recording)}
                onLongPress={() => handleRecordingOptions(recording)}
              >
                <Ionicons name="musical-notes-outline" size={24} color="#6366f1" />
                <View style={styles.recordingInfo}>
                  <Text style={styles.recordingName}>{recording.name || `Recording ${recording.id}`}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.recordingOptionsButton}
                  onPress={() => handleRecordingOptions(recording)}
                >
                  <Ionicons name="ellipsis-vertical" size={18} color="#9ca3af" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
      
      {currentFolderId !== null && (
        <View style={styles.qaSection}>
          <Text style={styles.sectionTitle}>Ask a question about this folder</Text>
          <TextInput
            style={styles.textInputQa}
            placeholder="Type your question here..."
            value={queryText}
            onChangeText={setQueryText}
          />
          <Button title="Ask" onPress={handleAskQuery} disabled={isLoadingQuery} />
          {isLoadingQuery && <ActivityIndicator size="large" color="#6366f1" style={styles.loadingIndicator} />}
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
        </View>
      )}
      
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create New Folder</Text>
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
                autoFocus
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]} 
                  onPress={() => {
                    setShowCreateModal(false);
                    setNewFolderName('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.createModalButton]} 
                  onPress={handleCreateFolder}
                >
                  <Text style={styles.createModalButtonText}>Create</Text>
                </TouchableOpacity>
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
    backgroundColor: '#f9fafb',
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  folderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
  },
  createButton: {
    padding: 8,
  },
  subfolderSection: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4b5563',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  folderRow: {
    paddingHorizontal: 12,
  },
  folderCard: {
    position: 'relative',
    width: 100,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  folderCardContent: {
    alignItems: 'center',
    padding: 12,
  },
  folderName: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 4,
    textAlign: 'center',
  },
  folderOptions: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
  },
  folderMenu: {
    position: 'absolute',
    top: 24,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 100,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  menuItemTextDelete: {
    marginLeft: 8,
    fontSize: 14,
    color: '#ef4444',
  },
  recordingsSection: {
    flex: 1,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 16,
    color: '#6b7280',
  },
  recordingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  recordingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recordingName: {
    fontSize: 16,
    color: '#374151',
  },
  recordingOptionsButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  createModalButton: {
    backgroundColor: '#6366f1',
  },
  createModalButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#4b5563',
    fontSize: 16,
  },
  folderSelectionList: {
    maxHeight: 250,
    marginBottom: 16,
  },
  folderSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedFolderItem: {
    backgroundColor: '#ede9fe',
  },
  folderSelectionInfo: {
    marginLeft: 12,
  },
  folderSelectionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  folderSelectionPath: {
    fontSize: 12,
    color: '#6b7280',
  },
  qaSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
  },
  textInputQa: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  loadingIndicator: {
    marginTop: 10,
  },
  answerContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#eef2ff',
    borderRadius: 8,
  },
  answerTitle: {
    fontWeight: 'bold',
    color: '#4338ca',
    marginBottom: 4,
  },
  answerText: {
    fontSize: 15,
    color: '#3730a3',
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  errorTitle: {
    fontWeight: 'bold',
    color: '#b91c1c',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 15,
    color: '#991b1b',
  },
});