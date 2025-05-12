package ai

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
)

// GeminiService handles direct audio processing using Gemini Pro 1.5
type GeminiService struct {
	APIKey string
}

// NewGeminiService creates a new Gemini service instance
func NewGeminiService(apiKey string) *GeminiService {
	return &GeminiService{
		APIKey: apiKey,
	}
}

// GeminiRequest represents the request structure for Gemini API
type GeminiRequest struct {
	Contents []Content `json:"contents"`
}

// Content represents a content part in the Gemini request
type Content struct {
	Parts []Part `json:"parts"`
}

// Part represents different parts of content that can be text or inline data
type Part struct {
	Text       string      `json:"text,omitempty"`
	InlineData *InlineData `json:"inline_data,omitempty"`
}

// InlineData represents binary data to be sent to Gemini
type InlineData struct {
	MimeType string `json:"mime_type"`
	Data     string `json:"data"` // base64 encoded data
}

// GeminiResponse represents the response from Gemini API
type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
		FinishReason string `json:"finish_reason"`
	} `json:"candidates"`
}

// AskGemini sends a text prompt to Gemini and returns the response
func (g *GeminiService) AskGemini(prompt string) (string, error) {
	// Create a new HTTP request
	url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent"

	// Use the Gemini JSON API format for text-only request
	jsonRequest := GeminiRequest{
		Contents: []Content{
			{
				Parts: []Part{
					{
						Text: prompt,
					},
				},
			},
		},
	}

	jsonData, err := json.Marshal(jsonRequest)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create the HTTP request
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")

	// Add API key as query parameter
	q := req.URL.Query()
	q.Add("key", g.APIKey)
	req.URL.RawQuery = q.Encode()

	// Send the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Check for errors
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("API error (status code %d): %s", resp.StatusCode, string(body))
	}

	// Parse the response
	var result GeminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	// Extract the text
	if len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no response generated")
	}

	return result.Candidates[0].Content.Parts[0].Text, nil
}

// ProcessAudioFile sends an audio file directly to Gemini Pro 1.5 for processing
// and returns the summary or transcript as specified in the prompt
func (g *GeminiService) ProcessAudioFile(audioFilePath, prompt string) (string, error) {
	// Check if file exists
	if _, err := os.Stat(audioFilePath); os.IsNotExist(err) {
		return "", fmt.Errorf("audio file does not exist: %w", err)
	}

	// Determine content type based on file extension
	ext := filepath.Ext(audioFilePath)
	var contentType string
	switch ext {
	case ".mp3":
		contentType = "audio/mpeg"
	case ".wav":
		contentType = "audio/wav"
	case ".ogg":
		contentType = "audio/ogg"
	case ".m4a":
		contentType = "audio/mp4"
	default:
		contentType = "audio/mpeg" // Default
	}

	// Create a new HTTP request
	url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent"

	// Open the audio file
	file, err := os.Open(audioFilePath)
	if err != nil {
		return "", fmt.Errorf("failed to open audio file: %w", err)
	}
	defer file.Close()

	// Read file content
	fileContent, err := io.ReadAll(file)
	if err != nil {
		return "", fmt.Errorf("failed to read file content: %w", err)
	}

	// Use the Gemini JSON API format
	jsonRequest := GeminiRequest{
		Contents: []Content{
			{
				Parts: []Part{
					{
						Text: prompt,
					},
					{
						InlineData: &InlineData{
							MimeType: contentType,
							Data:     base64.StdEncoding.EncodeToString(fileContent),
						},
					},
				},
			},
		},
	}

	jsonData, err := json.Marshal(jsonRequest)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create the HTTP request
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")

	// Add API key as query parameter
	q := req.URL.Query()
	q.Add("key", g.APIKey)
	req.URL.RawQuery = q.Encode()

	// Send the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Check for errors
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("API error (status code %d): %s", resp.StatusCode, string(body))
	}

	// Parse the response
	var result GeminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	// Extract the summary
	if len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no response generated")
	}

	return result.Candidates[0].Content.Parts[0].Text, nil
}
