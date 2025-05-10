"use client"
import { createContext, useState, useEffect, useContext } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { 
  getNotes, 
  deleteNote, 
  getFolders, 
  createFolder, 
  updateFolder, 
  deleteFolder, 
  moveNote 
} from "../app/api"
import { AuthContext } from "./AuthContext"

export const RecordingsContext = createContext()

export const RecordingsProvider = ({ children }) => {
  const [recordings, setRecordings] = useState([])
  const [folders, setFolders] = useState([])
  const [currentFolderId, setCurrentFolderId] = useState(null) // null means root
  const [folderPath, setFolderPath] = useState([]) // breadcrumb navigation
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { isLoggedIn } = useContext(AuthContext)

  // Load recordings and folders when user logs in or current folder changes
  useEffect(() => {
    console.log("[RecordingsContext] useEffect triggered. isLoggedIn:", isLoggedIn, "currentFolderId:", currentFolderId);
    if (isLoggedIn) {
      loadFoldersFromBackend(currentFolderId)
      loadRecordingsFromBackend(currentFolderId)
    } else {
      setFolders([]);
      setRecordings([]);
      setCurrentFolderId(null); // Explicitly reset on logout
      setFolderPath([]);      // Explicitly reset on logout
    }
  }, [isLoggedIn, currentFolderId])

  // Load folders from backend
  const loadFoldersFromBackend = async (parentId = null) => {
    setLoading(true)
    setError(null)
    console.log("[RecordingsContext] loadFoldersFromBackend called with parentId:", parentId);
    
    try {
      const data = await getFolders(parentId)
      console.log("[RecordingsContext] loadFoldersFromBackend received data:", data);
      if (data && data.folders) {
        setFolders(data.folders)
      }
    } catch (error) {
      console.error("Failed to load folders from backend", error)
      setError("Failed to load folders")
    } finally {
      setLoading(false)
    }
  }

  // Load recordings from backend
  const loadRecordingsFromBackend = async (folderId = null) => {
    setLoading(true)
    setError(null)
    console.log("[RecordingsContext] loadRecordingsFromBackend called with folderId:", folderId);
    
    try {
      const data = await getNotes(1, 100, folderId) // Using larger page size
      console.log("[RecordingsContext] loadRecordingsFromBackend received data:", data);
      if (data && data.notes) {
        // Format the backend notes into recording objects
        const formattedRecordings = data.notes.map(note => ({
          id: note.id.toString(),
          uri: note.audio_file_path || "",
          name: note.title,
          timestamp: note.created_at,
          transcript: note.transcript && note.transcript.Valid ? note.transcript.String : "",
          summary: note.summary && note.summary.Valid ? note.summary.String : "",
          updated_at: note.updated_at,
          user_id: note.user_id,
          folder_id: note.folder_id,
          fromBackend: true
        }))
        
        setRecordings(formattedRecordings)
      }
    } catch (error) {
      console.error("Failed to load recordings from backend", error)
      setError("Failed to load recordings")
      
      // Fall back to local storage if backend fails
      loadRecordingsFromLocal()
    } finally {
      setLoading(false)
    }
  }
  
  // Load recordings from local storage
  const loadRecordingsFromLocal = async () => {
    try {
      const storedRecordings = await AsyncStorage.getItem("recordings")
      if (storedRecordings) {
        setRecordings(JSON.parse(storedRecordings))
      }
    } catch (error) {
      console.error("Failed to load local recordings", error)
      setError("Failed to load local recordings")
    }
  }
  
  // Navigate to a folder
  const navigateToFolder = async (folderId, folderName = null) => {
    console.log(`[RecordingsContext] navigateToFolder (main view) called with folderId: ${folderId}, folderName: ${folderName}`);
    
    if (currentFolderId === folderId) {
      console.log(`[RecordingsContext] navigateToFolder: Already in folderId ${folderId}. No change.`);
      // If we are already in this folder, we might still want to refresh its content.
      // However, the useEffect for currentFolderId change handles loading.
      // If it's an explicit re-navigation to the same folder, ensure data is fresh.
      loadFoldersFromBackend(folderId);
      loadRecordingsFromBackend(folderId);
      return;
    }

    if (folderId === null) {
      // Navigating to Root
      setCurrentFolderId(null);
      setFolderPath([]);
    } else {
      // Navigating to a specific folder
      setCurrentFolderId(folderId); // Set this first
      
      // Update breadcrumb path
      // This logic assumes folderName is provided when folderId is not null
      if (folderName) {
        setFolderPath(prevPath => {
          const existingIndex = prevPath.findIndex(item => item.id === folderId);
          if (existingIndex !== -1) {
            // Navigating to a folder already in path (e.g., going up)
            return prevPath.slice(0, existingIndex + 1);
          } else {
            // Navigating to a new, deeper folder
            return [...prevPath, { id: folderId, name: folderName }];
          }
        });
      } else if (folderId !== null) {
        console.warn(`[RecordingsContext] Navigating to folderId ${folderId} without a folderName.`);
        const folderInList = folders.find(f => f.id === folderId);
        if (folderInList) {
             setFolderPath(prevPath => [...prevPath, {id: folderId, name: folderInList.name}]);
        }
      }
    }
  };
  
  // Create a new folder
  const addFolder = async (name, parentId) => { // Modified to accept parentId
    setLoading(true)
    setError(null)
    console.log(`[RecordingsContext] addFolder called with name: "${name}", parentId: ${parentId}`);
    
    try {
      const result = await createFolder(name, parentId) // Pass parentId to API
      
      if (result && result.folder) {
        console.log("[RecordingsContext] addFolder: Folder created successfully via API:", result.folder);
        // Refresh the folder list for the parent of the newly created folder,
        // or for the root if the new folder is at the root.
        loadFoldersFromBackend(parentId); // Refresh folders for the parent where new folder was added
      } else {
        console.warn("[RecordingsContext] addFolder: API call to create folder did not return a folder object or was unsuccessful.");
      }
      return result.folder // Return the created folder object or undefined
    } catch (error) {
      console.error("[RecordingsContext] Failed to create folder", error);
      setError("Failed to create folder")
      return null
    } finally {
      setLoading(false)
    }
  }
  
  // Rename a folder
  const renameFolder = async (folderId, newName) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await updateFolder(folderId, { name: newName })
      
      if (result && result.folder) {
        // Update the folder path if the renamed folder is in the path
        setFolderPath(prev => 
          prev.map(item => 
            item.id === folderId ? { ...item, name: newName } : item
          )
        )
        
        // Refresh the folder list
        loadFoldersFromBackend(currentFolderId)
      }
      return true
    } catch (error) {
      console.error("Failed to rename folder", error)
      setError("Failed to rename folder")
      return false
    } finally {
      setLoading(false)
    }
  }
  
  // Delete a folder
  const removeFolder = async (folderIdToDelete) => {
    setLoading(true);
    setError(null);
    console.log(`[RecordingsContext] removeFolder called for folderId: ${folderIdToDelete}. Current folderId: ${currentFolderId}, Path: ${JSON.stringify(folderPath)}`);

    try {
      await deleteFolder(folderIdToDelete);

      if (currentFolderId === folderIdToDelete) {
        if (folderPath.length > 1) {
          const parentFolder = folderPath[folderPath.length - 2];
          console.log(`[RecordingsContext] Deleted current folder. Navigating to parent: ${parentFolder.name} (ID: ${parentFolder.id})`);
          navigateToFolder(parentFolder.id, parentFolder.name);
        } else {
          console.log("[RecordingsContext] Deleted current folder (was top-level). Navigating to root.");
          navigateToFolder(null);
        }
      } else {
        console.log(`[RecordingsContext] Deleted a non-current folder. Refreshing folders for currentFolderId: ${currentFolderId}`);
        loadFoldersFromBackend(currentFolderId);
      }
      return true;
    } catch (error) {
      console.error("Failed to delete folder", error);
      setError("Failed to delete folder");
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Move a recording to a different folder
  const moveRecording = async (recordingId, targetFolderId) => {
    setLoading(true)
    setError(null)
    console.log("[RecordingsContext] moveRecording called with recordingId:", recordingId, "targetFolderId:", targetFolderId);
    
    try {
      await moveNote(recordingId, targetFolderId)
      
      // Refresh the recordings
      loadRecordingsFromBackend(currentFolderId)
      return true
    } catch (error) {
      console.error("Failed to move recording", error)
      setError("Failed to move recording")
      return false
    } finally {
      setLoading(false)
    }
  }

  // Add a new recording or update an existing one
  const addRecording = (recording) => {
    setRecordings((prevRecordings) => {
      // Check if this recording already exists (by ID)
      const existingIndex = prevRecordings.findIndex((r) => r.id === recording.id)
      
      if (existingIndex >= 0) {
        // Update existing recording
        const updatedRecordings = [...prevRecordings]
        updatedRecordings[existingIndex] = {
          ...updatedRecordings[existingIndex],
          ...recording,
        }
        return updatedRecordings
      } else {
        // Add new recording
        const newRecordings = [...prevRecordings, recording]
        return newRecordings
      }
    })
  }
  
  // Delete a recording
  const deleteRecording = async (id) => {
    try {
      const recordingToDelete = recordings.find(r => r.id === id)
      
      if (recordingToDelete && recordingToDelete.fromBackend) {
        // If it's a backend recording, delete it from the server
        await deleteNote(id)
      }
      
      // Remove from local state regardless of backend success
      setRecordings((prevRecordings) => {
        return prevRecordings.filter((recording) => recording.id !== id)
      })
      
      // Refresh recordings from backend
      loadRecordingsFromBackend(currentFolderId)
    } catch (error) {
      console.error("Error deleting recording:", error)
      setError("Failed to delete recording")
    }
  }
  
  // Refresh recordings from backend
  const refreshData = () => {
    console.log("[RecordingsContext] refreshData (refreshRecordings) called. isLoggedIn:", isLoggedIn, "currentFolderId:", currentFolderId);
    if (isLoggedIn) {
      loadFoldersFromBackend(currentFolderId);
      loadRecordingsFromBackend(currentFolderId);
    }
  };

  return (
    <RecordingsContext.Provider
      value={{
        recordings,
        folders,
        currentFolderId,
        folderPath,
        addRecording,
        deleteRecording,
        refreshRecordings: refreshData,
        navigateToFolder,
        addFolder,
        renameFolder,
        removeFolder,
        moveRecording,
        loading,
        error,
      }}
    >
      {children}
    </RecordingsContext.Provider>
  )
}
