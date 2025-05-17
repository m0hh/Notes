package tests

import (
	"context"
	"testing"

	"github.com/m0hh/Notes/internal/data"
)

func TestCreateNote(t *testing.T) {
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

	// First, create a user (notes need a user)
	userModel := pgContainer.Models.Users
	user := &data.User{
		Email:     "note-test@example.com",
		Name:      "Note Test",
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

	// Now, test note creation
	noteModel := pgContainer.Models.Notes

	note := &data.Note{
		Title:         "Test Note",
		AudioFilePath: "/test/file.mp3",
		UserID:        user.Id,
	}

	// Insert the note
	err = noteModel.Insert(note)
	if err != nil {
		t.Fatalf("Failed to insert note: %v", err)
	}

	// Retrieve the note by ID
	retrievedNote, err := noteModel.Get(note.ID)
	if err != nil {
		t.Fatalf("Failed to get note by ID: %v", err)
	}

	// Verify note fields
	if retrievedNote.Title != note.Title {
		t.Errorf("Expected title %s, got %s", note.Title, retrievedNote.Title)
	}

	if retrievedNote.UserID != user.Id {
		t.Errorf("Expected user ID %d, got %d", user.Id, retrievedNote.UserID)
	}
}

func TestGetAllUserNotes(t *testing.T) {
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
		Email:     "notes-list-test@example.com",
		Name:      "Notes List",
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

	// Create test notes
	noteModel := pgContainer.Models.Notes

	// Create 3 notes for the user
	notes := []*data.Note{
		{
			Title:         "First Note",
			AudioFilePath: "/test/file1.mp3",
			UserID:        user.Id,
		},
		{
			Title:         "Second Note",
			AudioFilePath: "/test/file2.mp3",
			UserID:        user.Id,
		},
		{
			Title:         "Third Note",
			AudioFilePath: "/test/file3.mp3",
			UserID:        user.Id,
		},
	}

	// Insert all notes
	for _, note := range notes {
		err = noteModel.Insert(note)
		if err != nil {
			t.Fatalf("Failed to insert note: %v", err)
		}
	}

	// Test pagination by getting the first 2 notes
	filters := data.Filters{
		Page:         1,
		PageSize:     2,
		Sort:         "id",
		SortSafelist: []string{"id", "title", "created_at"},
	}

	// Retrieve notes with pagination
	retrievedNotes, err := noteModel.GetAll(user.Id, filters)
	if err != nil {
		t.Fatalf("Failed to get all notes: %v", err)
	}

	if len(retrievedNotes) != 2 {
		t.Errorf("Expected 2 notes, got %d", len(retrievedNotes))
	}

	// Get the second page (should have 1 note)
	filters.Page = 2
	retrievedNotes, err = noteModel.GetAll(user.Id, filters)
	if err != nil {
		t.Fatalf("Failed to get second page of notes: %v", err)
	}

	if len(retrievedNotes) != 1 {
		t.Errorf("Expected 1 note on second page, got %d", len(retrievedNotes))
	}
}
