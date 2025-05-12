package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

// OpenAIEmbeddingRequest defines the structure for the request to OpenAI's embedding API.
type OpenAIEmbeddingRequest struct {
	Input string `json:"input"`
	Model string `json:"model"`
}

// OpenAIEmbeddingData defines the structure for a single embedding object in the response.
type OpenAIEmbeddingData struct {
	Object    string    `json:"object"`
	Embedding []float32 `json:"embedding"`
	Index     int       `json:"index"`
}

// OpenAIEmbeddingResponse defines the structure for the response from OpenAI's embedding API.
type OpenAIEmbeddingResponse struct {
	Object string                `json:"object"`
	Data   []OpenAIEmbeddingData `json:"data"`
	Model  string                `json:"model"`
	Usage  struct {
		PromptTokens int `json:"prompt_tokens"`
		TotalTokens  int `json:"total_tokens"`
	} `json:"usage"`
}

// OpenAICompletionRequest defines the structure for the request to OpenAI's completion API.
type OpenAICompletionRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	Temperature float64   `json:"temperature"`
	MaxTokens   int       `json:"max_tokens"`
}

// Message represents a message in the OpenAI chat completion API
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// OpenAICompletionResponse defines the structure for the response from OpenAI's completion API.
type OpenAICompletionResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int    `json:"created"`
	Choices []struct {
		Index   int `json:"index"`
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

// AskOpenAI sends a prompt to the OpenAI API and returns the completion response.
func AskOpenAI(prompt string, apiKey string) (string, error) {
	requestBody := OpenAICompletionRequest{
		Model: "gpt-3.5-turbo",
		Messages: []Message{
			{
				Role:    "system",
				Content: "You are a helpful assistant that provides information based on the given context.",
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
		Temperature: 0.7,
		MaxTokens:   1000,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request body: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to make request to OpenAI API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("OpenAI API request failed with status code: %d", resp.StatusCode)
	}

	var completionResponse OpenAICompletionResponse
	if err := json.NewDecoder(resp.Body).Decode(&completionResponse); err != nil {
		return "", fmt.Errorf("failed to decode OpenAI API response: %w", err)
	}

	if len(completionResponse.Choices) == 0 {
		return "", fmt.Errorf("no completion data received from OpenAI API")
	}

	return completionResponse.Choices[0].Message.Content, nil
}

// GenerateOpenAIEmbedding generates an embedding for the given text using the OpenAI API.
func GenerateOpenAIEmbedding(text string, apiKey string) ([]float32, error) {
	requestBody := OpenAIEmbeddingRequest{
		Input: text,
		Model: "text-embedding-ada-002",
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request body: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.openai.com/v1/embeddings", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request to OpenAI API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Consider reading the response body for more detailed error information from OpenAI
		return nil, fmt.Errorf("OpenAI API request failed with status code: %d", resp.StatusCode)
	}

	var embeddingResponse OpenAIEmbeddingResponse
	if err := json.NewDecoder(resp.Body).Decode(&embeddingResponse); err != nil {
		return nil, fmt.Errorf("failed to decode OpenAI API response: %w", err)
	}

	if len(embeddingResponse.Data) == 0 {
		return nil, fmt.Errorf("no embedding data received from OpenAI API")
	}

	return embeddingResponse.Data[0].Embedding, nil
}
