// API client for connecting to the NotesGPT backend
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configure the base URL for your API
// Change this to your actual backend URL when deploying
const API_BASE_URL = "http://10.0.2.2:4000"; // For Android emulator pointing to localhost
// const API_BASE_URL = "http://localhost:4000"; // For iOS simulator

// Helper function to get the authentication token
const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem("authToken");
  } catch (error) {
    console.error("Failed to get auth token", error);
    return null;
  }
};

// Custom Error for Authentication Failure
class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthenticationError";
  }
}

// Generic API request function with centralized authentication and error handling
const apiRequest = async (endpoint, options = {}) => {
  try {
    const token = await getAuthToken();
    
    // Determine Content-Type based on body type
    let contentType;
    if (options.body instanceof FormData) {
      // Let fetch set the Content-Type for FormData
      contentType = undefined; 
    } else if (typeof options.body === 'string') {
      // Assume JSON for string bodies
      contentType = "application/json";
    } else {
      contentType = options.headers?.["Content-Type"] || "application/json";
    }

    const headers = {
      ...options.headers,
      ...(contentType && { "Content-Type": contentType }), // Add Content-Type only if defined
    };
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Check for authentication errors first
    if (response.status === 401) {
      // Attempt to clear the potentially invalid token
      await logoutUser(); 
      // Throw a specific error to signal logout requirement
      throw new AuthenticationError("Authentication required. Please log in again.");
    }
    
    // Try parsing JSON, but handle cases where there might be no body or non-JSON body
    let data = null;
    const responseContentType = response.headers.get("content-type");
    if (responseContentType && responseContentType.includes("application/json")) {
      data = await response.json();
    } else {
      // Handle non-JSON responses if necessary, or just check status
      // For now, we'll primarily rely on the status code for non-JSON
    }

    // Check if the request was successful (excluding 401 which is handled above)
    if (!response.ok) {
      // Use error from JSON data if available, otherwise use status text
      const errorMessage = data?.error || response.statusText || "Something went wrong";
      throw new Error(errorMessage);
    }
    
    // Return data if parsing was successful, otherwise could return response or null
    return data; 
  } catch (error) {
    // Log specific errors differently if needed
    if (error instanceof AuthenticationError) {
      console.warn(`Authentication Error: ${error.message}`); 
    } else {
      console.error(`API request failed: ${error}`);
    }
    // Re-throw the error to be handled by the caller
    throw error;
  }
};

// Authentication API calls
export const loginUser = async (email, password) => {
  const data = await apiRequest("/v1/tokens/authentication", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  
  // Store the token only on successful login
  if (data?.authentication_token?.token) {
     await AsyncStorage.setItem("authToken", data.authentication_token.token);
     // Return the user data, not the whole token object if not needed upstream
     return data.user; 
  } else {
    // Handle cases where login API might succeed (2xx) but not return a token
    throw new Error("Login successful but no token received.");
  }
};

export const registerUser = async (name, email, password) => {
  // Assuming the register endpoint returns the user object upon success
  return await apiRequest("/v1/users", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
};

export const socialAuthLogin = async (socialData) => {
  const data = await apiRequest("/v1/tokens/social", {
    method: "POST",
    body: JSON.stringify(socialData),
  });
  
  // Store the token only on successful login
  if (data?.authentication_token?.token) {
     await AsyncStorage.setItem("authToken", data.authentication_token.token);
     // Return the user data, not the whole token object if not needed upstream
     return data.user; 
  } else {
    // Handle cases where login API might succeed (2xx) but not return a token
    throw new Error("Social login successful but no token received.");
  }
};

export const activateAccount = async (token) => {
  // Assuming the activate endpoint returns the user object upon success
  return await apiRequest("/v1/users/activated", {
    method: "PUT",
    body: JSON.stringify({ token }),
  });
};

// Logout function - only clears the token locally
export const logoutUser = async () => {
  try {
    await AsyncStorage.removeItem("authToken");
    console.log("Auth token removed.");
  } catch (error) {
    console.error("Failed to remove auth token during logout", error);
  }
};

// Notes API calls
export const createNote = async (title, content) => {
  return await apiRequest("/v1/notes", {
    method: "POST",
    body: JSON.stringify({ title, content }),
  });
};

export const getNotes = async (page = 1, pageSize = 20, folderId = null) => {
  let endpoint = `/v1/notes?page=${page}&page_size=${pageSize}`;
  
  // Add folder filtering if folderId is provided
  if (folderId !== null) {
    endpoint += `&folder_id=${folderId}`;
  }
  
  return await apiRequest(endpoint);
};

export const getNote = async (id) => {
  return await apiRequest(`/v1/notes/${id}`);
};

export const deleteNote = async (id) => {
  return await apiRequest(`/v1/notes/${id}`, {
    method: "DELETE",
  });
};

export const moveNote = async (noteId, folderId) => {
  return await apiRequest(`/v1/notes/${noteId}/move`, {
    method: "PUT",
    body: JSON.stringify({ folder_id: folderId }),
  });
};

// Folder API calls
export const createFolder = async (name, parentId = null) => {
  const payload = { name };
  if (parentId) {
    payload.parent_id = parentId;
  }
  
  return await apiRequest("/v1/folders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const getFolders = async (parentId = null) => {
  let endpoint = "/v1/folders";
  
  // Add parent folder filtering if parentId is provided
  if (parentId !== null) {
    endpoint += `?parent_id=${parentId}`;
  }
  
  return await apiRequest(endpoint);
};

export const getFolder = async (id) => {
  return await apiRequest(`/v1/folders/${id}`);
};

export const updateFolder = async (id, data) => {
  return await apiRequest(`/v1/folders/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

export const deleteFolder = async (id) => {
  return await apiRequest(`/v1/folders/${id}`, {
    method: "DELETE",
  });
};

// New function to query a folder
export const queryFolder = async (folderId, queryText) => {
  // The authToken is handled by the generic apiRequest function
  return await apiRequest(`/v1/folders/${folderId}/query`, {
    method: "POST",
    body: JSON.stringify({ query: queryText }),
  });
};

// Function to upload audio and process with Gemini
export const processAudioWithGemini = async (audioUri, title = "Voice Note", prompt = "", language = "english", folderId = null) => {
  // Create form data
  const formData = new FormData();
  const filename = audioUri.split("/").pop();
  
  formData.append("audio", {
    uri: audioUri,
    name: filename,
    type: "audio/mp3", // Adjust based on your recording format
  });
  
  formData.append("title", title);
  
  // Add custom prompt if provided
  if (prompt.trim()) {
    formData.append("prompt", prompt);
  }
  
  // Add language preference
  formData.append("language", language);

  // Add folder ID if provided
  if (folderId !== null) {
    formData.append("folder_id", folderId);
  }
  
  // Use the centralized apiRequest function
  return await apiRequest("/v1/process/notes/gemini", {
    method: "POST",
    body: formData, 
    // No need to set Content-Type or Authorization header here, apiRequest handles it
  });
};

// Export the error class if needed elsewhere
export { AuthenticationError };