package ai

import (
	"fmt"
)

// AIService provides a unified interface for AI services
type AIService struct {
	OpenAIAPIKey string
	GeminiAPIKey string
}

// NewAIService creates a new AI service instance
func NewAIService(openAIAPIKey, geminiAPIKey string) *AIService {
	return &AIService{
		OpenAIAPIKey: openAIAPIKey,
		GeminiAPIKey: geminiAPIKey,
	}
}

// GenerateOpenAIEmbedding generates an embedding for the given text using the OpenAI API
// This is a wrapper around the standalone function to make it a method of AIService
func (a *AIService) GenerateOpenAIEmbedding(text string) ([]float32, error) {
	if a.OpenAIAPIKey == "" {
		return nil, fmt.Errorf("OpenAI API key not provided")
	}
	return GenerateOpenAIEmbedding(text, a.OpenAIAPIKey)
}

// AskLLM sends a prompt to the Gemini API and returns the response
func (a *AIService) AskLLM(prompt string) (string, error) {
	// Check if Gemini API key is available
	if a.GeminiAPIKey == "" {
		return "", fmt.Errorf("Gemini API key not provided")
	}

	// Create a Gemini service instance
	geminiService := NewGeminiService(a.GeminiAPIKey)

	// Call the Gemini API for text completion
	return geminiService.AskGemini(prompt)
}
