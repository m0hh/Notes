import React, { useState, useEffect, useContext, useMemo } from 'react'; // Added useMemo
import { Modal, View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RecordingsContext } from '../context/RecordingsContext';
import { getFolders } from '../app/api'; // Import getFolders

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '90%', maxHeight: '80%', backgroundColor: 'white', borderRadius: 10, padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitleText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  closeButton: { padding: 5 },
  breadcrumbsContainer: { flexDirection: 'row', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
  breadcrumbItem: { fontSize: 14, color: '#007AFF', marginRight: 5, paddingVertical: 5 },
  breadcrumbSeparator: { fontSize: 14, color: '#ccc', marginRight: 5, paddingVertical: 5 },
  breadcrumbActive: { fontSize: 14, color: '#333', fontWeight: 'bold', marginRight: 5, paddingVertical: 5 },
  folderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  folderName: { marginLeft: 10, fontSize: 16, color: '#333' },
  emptyList: { alignItems: 'center', paddingVertical: 20 },
  emptyText: { fontSize: 16, color: '#888' },
  actionsContainer: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
  actionButton: { backgroundColor: '#007AFF', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  actionButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  createFolderContainer: { marginTop: 10, marginBottom: 10 },
  createFolderInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10, fontSize:16 },
  createFolderButtonRow: { flexDirection: 'row', justifyContent: 'space-between'},
  createButton: { backgroundColor: '#4CAF50', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, flex: 0.48, alignItems: 'center'},
  cancelCreateButton: { backgroundColor: '#aaa', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, flex: 0.48, alignItems: 'center'},
  buttonText: { color: 'white', fontWeight: 'bold'},
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', borderRadius: 10, zIndex: 10 },
  listContentContainer: { flexGrow: 1 }
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

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.modalTitleText}>{modalTitleText}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-circle-outline" size={28} color="#555" />
            </TouchableOpacity>
          </View>

          {renderBreadcrumbTrail()}

          <View style={{ flexShrink: 1, minHeight: 100 }}>
            {isLoadingForList && !isCreatingFolder ? (
              <ActivityIndicator size="large" color="#007AFF" style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={modalDisplayedFolders}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.folderItem} onPress={() => navigateModalToFolder(item.id, item.name)}>
                    <Ionicons name="folder-outline" size={24} color="#007AFF" />
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
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleSelectThisFolder}
                  disabled={isLoading}
                >
                  <Text style={styles.actionButtonText}>
                    Select This Folder ({getCurrentModalFolderName()})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, {backgroundColor: '#34A853', marginTop: 10}]} 
                  onPress={() => setShowCreateFolderInput(true)}
                  disabled={isLoading}
                >
                  <Text style={styles.actionButtonText}>Create New Folder Here</Text>
                </TouchableOpacity>
              </>
            )}

            {showCreateFolderInput && (
              <View style={styles.createFolderContainer}>
                <TextInput
                  style={styles.createFolderInput}
                  placeholder="New folder name"
                  value={newFolderName}
                  onChangeText={setNewFolderName}
                  autoFocus={true}
                />
                <View style={styles.createFolderButtonRow}>
                   <TouchableOpacity style={styles.cancelCreateButton} onPress={() => {setShowCreateFolderInput(false); setNewFolderName('');}} disabled={isCreatingFolder}>
                     <Text style={styles.buttonText}>Cancel</Text>
                   </TouchableOpacity>
                   <TouchableOpacity style={styles.createButton} onPress={handleModalCreateFolder} disabled={isCreatingFolder || !newFolderName.trim()}>
                    {isCreatingFolder ? <ActivityIndicator color="#fff" size="small"/> : <Text style={styles.buttonText}>Create</Text>}
                   </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
          {(contextIsLoading || isCreatingFolder) && !isModalFetchingFolders ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}