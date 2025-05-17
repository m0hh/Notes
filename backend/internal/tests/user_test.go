package tests

import (
	"context"
	"testing"

	"github.com/m0hh/Notes/internal/data"
)

func TestCreateUser(t *testing.T) {
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

	// Test user creation
	userModel := pgContainer.Models.Users

	// Create a test user
	user := &data.User{
		Email:     "test@example.com",
		Name:      "Test User", // Note: This should match the User struct in your application
		Activated: true,
		Role:      data.TraineeRole,
	}

	// Set password
	err = user.Password.Set("password123")
	if err != nil {
		t.Fatalf("Failed to set password: %v", err)
	}

	// Insert the user
	err = userModel.Insert(user)
	if err != nil {
		t.Fatalf("Failed to insert user: %v", err)
	}

	// Retrieve the user by ID
	retrievedUser, err := userModel.Retrieve(user.Id)
	if err != nil {
		t.Fatalf("Failed to get user by ID: %v", err)
	}

	// Verify user fields
	if retrievedUser.Email != user.Email {
		t.Errorf("Expected email %s, got %s", user.Email, retrievedUser.Email)
	}

	if retrievedUser.Name != user.Name {
		t.Errorf("Expected name %s, got %s", user.Name, retrievedUser.Name)
	}

	if retrievedUser.Role != data.TraineeRole {
		t.Errorf("Expected role %s, got %s", data.TraineeRole, retrievedUser.Role)
	}
}

func TestGetUserByEmail(t *testing.T) {
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

	// Test user creation and retrieval by email
	userModel := pgContainer.Models.Users

	// Create a test user
	user := &data.User{
		Email:     "test-email@example.com",
		Name:      "Email Test User",
		Activated: true,
		Role:      data.TraineeRole,
	}

	// Set password
	err = user.Password.Set("password123")
	if err != nil {
		t.Fatalf("Failed to set password: %v", err)
	}

	// Insert the user
	err = userModel.Insert(user)
	if err != nil {
		t.Fatalf("Failed to insert user: %v", err)
	}

	// Retrieve the user by email
	retrievedUser, err := userModel.RetrieveByEmail(user.Email)
	if err != nil {
		t.Fatalf("Failed to get user by email: %v", err)
	}

	// Verify user fields
	if retrievedUser.Email != user.Email {
		t.Errorf("Expected email %s, got %s", user.Email, retrievedUser.Email)
	}

	if retrievedUser.Name != user.Name {
		t.Errorf("Expected name %s, got %s", user.Name, retrievedUser.Name)
	}
}
