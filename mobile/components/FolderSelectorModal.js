import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecordingsContext } from '../context/RecordingsContext';
import { getFolders } from '../app/api';
import { customTheme } from '../theme';
import { GradientButton, SecondaryButton } from './CommonComponents';

const styles = StyleSheet.create({
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', // Changed from 'flex-end'
    alignItems: 'center',
    padding: 20, // Added padding around the modal container
  },
  modalContainer: { 
    width: '100%', // Will take full width of the padded overlay
    maxHeight: '95%', // Will take up to 95% height of the padded overlay
    backgroundColor: customTheme.colors.surface, 
    borderRadius: 24, // Applied to all corners
    padding: 20, // Existing internal padding
    ...customTheme.elevation.large,
    overflow: 'hidden', // Ensures content respects rounded borders
    display: 'flex', // Added
    flexDirection: 'column', // Added
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16,
  },
  modalTitleText: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: customTheme.colors.text,
  },
  closeButton: { 
    padding: 5 
  },
  breadcrumbsContainer: { 
    flexDirection: 'row', 
    marginBottom: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: customTheme.colors.border, 
    paddingBottom: 12,
  },
  breadcrumbItem: { 
    fontSize: 14, 
    color: customTheme.colors.primary, 
    marginRight: 5, 
    paddingVertical: 5,
  },
  breadcrumbSeparator: { 
    fontSize: 14, 
    color: customTheme.colors.textSecondary, 
    marginRight: 5, 
    paddingVertical: 5,
  },
  breadcrumbActive: { 
    fontSize: 14, 
    color: customTheme.colors.text, 
    fontWeight: 'bold', 
    marginRight: 5, 
    paddingVertical: 5,
  },
  folderListContainer: {
    flexGrow: 1, // Changed
    flexShrink: 1, // Added
    minHeight: 200,
    marginVertical: 12,
  },
  folderItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    paddingHorizontal: 8,
    borderBottomWidth: 1, 
    borderBottomColor: customTheme.colors.border,
  },
  folderItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: customTheme.colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  folderName: { 
    marginLeft: 10, 
    fontSize: 16, 
    color: customTheme.colors.text,
  },
  emptyList: { 
    alignItems: 'center', 
    paddingVertical: 24,
  },
  emptyText: { 
    fontSize: 16, 
    color: customTheme.colors.textSecondary,
  },
  actionsContainer: { 
    marginTop: 16, 
    borderTopWidth: 1, 
    borderTopColor: customTheme.colors.border, 
    paddingTop: 16,
    flexShrink: 0, // Added: Prevents this container from shrinking
  },
  createFolderContainer: { 
    marginTop: 10, 
    marginBottom: 10,
  },
  createFolderInput: { 
    borderWidth: 1, 
    borderColor: customTheme.colors.border, 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    marginBottom: 16, 
    fontSize: 16,
    backgroundColor: customTheme.colors.surface,
    color: customTheme.colors.text,
  },
  createFolderButtonRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
  },
  loadingOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(255,255,255,0.7)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 24, // Match modalContainer's borderRadius
    zIndex: 10,
  },
  listContentContainer: { 
    flexGrow: 1,
  }
});

export default function FolderSelectorModal({
  visible,
  onClose,
  onSelectFolder,
  title: modalTitleText = "Select Folder"
}) {
  const { addFolder: contextAddFolder, loading: contextIsLoading } = useContext(RecordingsContext); // Keep context for addFolder and main loading state

  const [currentModalFolderId, setCurrentModalFolderId] = useState(null);
  const [modalFolderPath, setModalFolderPath] = useState([]);
  const [showCreateFolderInput, setShowCreateFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [modalDisplayedFolders, setModalDisplayedFolders] = useState([]);
  const [isModalFetchingFolders, setIsModalFetchingFolders] = useState(false);

  useEffect(() => {
    if (visible) {
      console.log("[FolderSelectorModal] Modal became visible. Initializing state.");
      // Reset states and set currentModalFolderId to null to trigger root folder fetch
      setCurrentModalFolderId(null); 
      setModalFolderPath([]);
      setShowCreateFolderInput(false);
      setNewFolderName('');
      setModalDisplayedFolders([]); // Clear previous folders
    } else {
      console.log("[FolderSelectorModal] Modal became hidden.");
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      const fetchFoldersForModal = async () => {
        console.log(`[FolderSelectorModal] Fetching folders for modal's currentFolderId: ${currentModalFolderId}`);
        setIsModalFetchingFolders(true);
        try {
          const data = await getFolders(currentModalFolderId); // Use direct API call
          if (data && data.folders) {
            setModalDisplayedFolders(data.folders);
            console.log(`[FolderSelectorModal] Fetched ${data.folders.length} folders for modal view.`);
          } else {
            setModalDisplayedFolders([]);
            console.log("[FolderSelectorModal] Fetched 0 folders or no data.folders array for modal view.");
          }
        } catch (error) {
          console.error("[FolderSelectorModal] Error fetching folders for modal:", error);
          setModalDisplayedFolders([]);
          Alert.alert("Error", "Could not load folders for modal.");
        } finally {
          setIsModalFetchingFolders(false);
        }
      };
      fetchFoldersForModal();
    }
  }, [visible, currentModalFolderId]); // Re-fetch when modal becomes visible or its internal folderId changes

  const navigateModalToFolder = (folderId, folderName) => {
    console.log(`[FolderSelectorModal] navigateModalToFolder: Attempting to navigate to folderId: ${folderId}, Name: ${folderName}`);
    setShowCreateFolderInput(false);
    setNewFolderName('');
    // currentModalFolderId will be set, triggering useEffect to fetch new folders
    setCurrentModalFolderId(folderId); 

    if (folderId === null) {
      console.log("[FolderSelectorModal] navigateModalToFolder: Navigated to Root in modal.");
      setModalFolderPath([]);
    } else {
      const existingIndex = modalFolderPath.findIndex(item => item.id === folderId);
      if (existingIndex !== -1) {
        const newPath = modalFolderPath.slice(0, existingIndex + 1);
        console.log("[FolderSelectorModal] navigateModalToFolder: Navigated up/to existing in path. New modal path:", newPath);
        setModalFolderPath(newPath);
      } else {
        const nameToUse = folderName || modalDisplayedFolders.find(f => f.id === folderId)?.name || 'Folder';
        const newPathEntry = { id: folderId, name: nameToUse };
        setModalFolderPath(prev => {
          const updatedPath = [...prev, newPathEntry];
          console.log("[FolderSelectorModal] navigateModalToFolder: Navigated to new subfolder. New modal path:", updatedPath);
          return updatedPath;
        });
      }
    }
  };

  const handleModalCreateFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert("Error", "Folder name cannot be empty.");
      return;
    }
    console.log(`[FolderSelectorModal] handleModalCreateFolder: Attempting to create folder "${newFolderName}" in parentId: ${currentModalFolderId}`);
    setIsCreatingFolder(true);
    try {
      const createdFolder = await contextAddFolder(newFolderName.trim(), currentModalFolderId); 
      if (createdFolder) {
        console.log(`[FolderSelectorModal] handleModalCreateFolder: Successfully created folder:`, createdFolder);
        setNewFolderName('');
        setShowCreateFolderInput(false);
        // Refresh the current modal view by re-fetching its folders
        setIsModalFetchingFolders(true);
        try {
            const data = await getFolders(currentModalFolderId);
            if (data && data.folders) {
                setModalDisplayedFolders(data.folders);
            } else {
                setModalDisplayedFolders([]);
            }
        } catch (error) {
            console.error("[FolderSelectorModal] Error re-fetching folders after creation:", error);
        } finally {
            setIsModalFetchingFolders(false);
        }
      } else {
        console.log("[FolderSelectorModal] handleModalCreateFolder: Failed to create folder (API returned no folder).");
        Alert.alert("Error", "Failed to create folder. It might already exist or a server error occurred.");
      }
    } catch (error) {
      console.error("[FolderSelectorModal] Error creating folder in modal:", error);
      Alert.alert("Error", `Could not create folder: ${error.message || "Please try again."}`);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const getCurrentModalFolderName = () => {
    if (currentModalFolderId === null) return "Root";
    const currentFolderInPath = modalFolderPath[modalFolderPath.length - 1];
    return currentFolderInPath ? currentFolderInPath.name : "Selected Folder";
  };

  const renderBreadcrumbTrail = () => {
    const trail = [{ id: null, name: "Root" }, ...modalFolderPath];
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.breadcrumbsContainer}>
        {trail.map((folder, index) => (
          <React.Fragment key={folder.id || 'root-crumb'}>
            <TouchableOpacity onPress={() => navigateModalToFolder(folder.id, folder.name)}>
              <Text style={[styles.breadcrumbItem, index === trail.length - 1 && styles.breadcrumbActive]}>
                {folder.name}
              </Text>
            </TouchableOpacity>
            {index < trail.length - 1 && <Text style={styles.breadcrumbSeparator}>/</Text>}
          </React.Fragment>
        ))}
      </ScrollView>
    );
  };
  
  const handleSelectThisFolder = () => {
    console.log(`[FolderSelectorModal] handleSelectThisFolder: User selected folder with modal's current ID: ${currentModalFolderId} (Name: ${getCurrentModalFolderName()}). Calling onSelectFolder and onClose.`);
    onSelectFolder(currentModalFolderId);
    onClose();
  };

  const isLoading = contextIsLoading || isCreatingFolder || isModalFetchingFolders;
  const isLoadingForList = isModalFetchingFolders;

  // Condition for the main blocking overlay. Show it when creating a folder,
  // but not if the list is already showing its own loading indicator for fetching.
  const showBlockingOverlay = isCreatingFolder && !isModalFetchingFolders;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.modalTitleText}>{modalTitleText}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-circle" size={28} color={customTheme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {renderBreadcrumbTrail()}

          <View style={styles.folderListContainer}>
            {isLoadingForList && !isCreatingFolder ? (
              <ActivityIndicator size="large" color={customTheme.colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={modalDisplayedFolders}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.folderItem} onPress={() => navigateModalToFolder(item.id, item.name)}>
                    <View style={styles.folderItemIconContainer}>
                      <Ionicons name="folder" size={24} color={customTheme.colors.primary} />
                    </View>
                    <Text style={styles.folderName}>{String(item.name)}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={() => {
                  if (!showCreateFolderInput && !isLoadingForList) { 
                    return (
                      <View style={styles.emptyList}>
                        <Text style={styles.emptyText}>No subfolders here.</Text>
                      </View>
                    );
                  }
                  return null;
                }}
                contentContainerStyle={styles.listContentContainer}
              />
            )}
          </View>
          <View style={styles.actionsContainer}>
            {!showCreateFolderInput && (
              <>
                <GradientButton 
                  title={`Select This Folder (${getCurrentModalFolderName()})`}
                  onPress={handleSelectThisFolder}
                  disabled={isLoading}
                  icon="checkmark-circle"
                />

                <SecondaryButton 
                  title="Create New Folder Here"
                  onPress={() => setShowCreateFolderInput(true)}
                  disabled={isLoading}
                  icon="add-circle"
                  style={{marginTop: 12}}
                />
              </>
            )}

            {showCreateFolderInput && (
              <View style={styles.createFolderContainer}>
                <TextInput
                  style={styles.createFolderInput}
                  placeholder="New folder name"
                  value={newFolderName}
                  onChangeText={setNewFolderName}
                  placeholderTextColor={customTheme.colors.placeholder}
                  autoFocus={true}
                />
                <View style={styles.createFolderButtonRow}>
                   <SecondaryButton 
                     title="Cancel"
                     onPress={() => {setShowCreateFolderInput(false); setNewFolderName('');}} 
                     disabled={isCreatingFolder}
                     style={{flex: 1, marginRight: 8}}
                   />
                   <GradientButton 
                     title="Create"
                     onPress={handleModalCreateFolder} 
                     disabled={isCreatingFolder || !newFolderName.trim()}
                     style={{flex: 1, marginLeft: 8}}
                   />
                </View>
              </View>
            )}
          </View>
          {showBlockingOverlay ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={customTheme.colors.primary} />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}