package tests

import (
	"context"
	"testing"
	"time"

	"github.com/m0hh/Notes/internal/data"
)

func TestTokenCreationAndValidation(t *testing.T) {
	// Create a PostgreSQL container
	pgContainer, err := NewPostgresContainer(t)
	if err != nil {
		t.Fatalf("Failed to create PostgreSQL container: %v", err)
	}

	// Defer container termination
	defer func() {
		if err := pgContainer.Terminate(context.Background()); err != nil {
			t.Fatalf("Failed to terminate container: %v", err)
		}
	}()

	// Create a test user
	userModel := pgContainer.Models.Users
	user := &data.User{
		Email:     "token-test@example.com",
		Name:      "Token Test",
		Activated: true,
		Role:      data.TraineeRole,
	}

	err = user.Password.Set("password123")
	if err != nil {
		t.Fatalf("Failed to set password: %v", err)
	}

	err = userModel.Insert(user)
	if err != nil {
		t.Fatalf("Failed to insert user: %v", err)
	}

	// Store the original user ID for comparison later
	originalUserId := user.Id

	// Test token creation and validation
	tokenModel := pgContainer.Models.Tokens

	// Create a new activation token for the user
	token, err := tokenModel.New(user.Id, 24*time.Hour, data.ScopeActivation)
	if err != nil {
		t.Fatalf("Failed to create token: %v", err)
	}

	// Check that the token is valid using GetForToken
	verifiedUser, err := userModel.GetForToken(data.ScopeActivation, token.Plaintext)
	if err != nil {
		t.Fatalf("Failed to verify token: %v", err)
	}

	// Check that the user ID is correct
	if verifiedUser.Id != originalUserId {
		t.Errorf("Expected user Id %d, got %d", originalUserId, verifiedUser.Id)
	}

	// Test token deletion
	err = tokenModel.DeleteAllforUser(data.ScopeActivation, user.Id)
	if err != nil {
		t.Fatalf("Failed to delete tokens: %v", err)
	}

	// Verify that the token is now invalid
	_, err = userModel.GetForToken(data.ScopeActivation, token.Plaintext)
	if err == nil {
		t.Errorf("Expected token to be invalid after deletion")
	}
}

func TestPasswordResetToken(t *testing.T) {
	// Create a PostgreSQL container
	pgContainer, err := NewPostgresContainer(t)
	if err != nil {
		t.Fatalf("Failed to create PostgreSQL container: %v", err)
	}

	// Defer container termination
	defer func() {
		if err := pgContainer.Terminate(context.Background()); err != nil {
			t.Fatalf("Failed to terminate container: %v", err)
		}
	}()

	// Create a test user
	userModel := pgContainer.Models.Users
	user := &data.User{
		Email:     "reset-test@example.com",
		Name:      "Reset Test",
		Activated: true,
		Role:      data.TraineeRole,
	}

	err = user.Password.Set("oldpassword")
	if err != nil {
		t.Fatalf("Failed to set password: %v", err)
	}

	err = userModel.Insert(user)
	if err != nil {
		t.Fatalf("Failed to insert user: %v", err)
	}

	// Store the original user ID for comparison later
	originalUserId := user.Id

	// Create a password reset token
	tokenModel := pgContainer.Models.Tokens
	token, err := tokenModel.New(user.Id, 1*time.Hour, data.ScopePasswordReset)
	if err != nil {
		t.Fatalf("Failed to create password reset token: %v", err)
	}

	// Test that a token with a different scope is invalid
	_, err = userModel.GetForToken(data.ScopeActivation, token.Plaintext)
	if err == nil {
		t.Errorf("Expected error when verifying token with wrong scope")
	}

	// Test that the token with the correct scope is valid
	validatedUser, err := userModel.GetForToken(data.ScopePasswordReset, token.Plaintext)
	if err != nil {
		t.Fatalf("Failed to verify token with correct scope: %v", err)
	}

	// Check that we got the correct user back
	if validatedUser.Id != originalUserId {
		t.Errorf("Expected user Id %d, got %d", originalUserId, validatedUser.Id)
	}

	// Test password reset
	newPassword := "newpassword123"
	err = user.Password.Set(newPassword)
	if err != nil {
		t.Fatalf("Failed to set new password: %v", err)
	}

	err = userModel.Update(user)
	if err != nil {
		t.Fatalf("Failed to update user with new password: %v", err)
	}

	// We'll skip authentication test since there's no direct Authenticate method in the UserModel
}
