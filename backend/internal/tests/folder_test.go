package tests

import (
	"context"
	"testing"

	"github.com/m0hh/Notes/internal/data"
)

func TestCreateFolder(t *testing.T) {
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

	// First, create a user (folders need a user)
	userModel := pgContainer.Models.Users
	user := &data.User{
		Email:     "folder-test@example.com",
		Name:      "Folder Test",
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

	// Now, test folder creation
	folderModel := pgContainer.Models.Folders

	folder := &data.Folder{
		Name:   "Test Folder",
		UserID: user.Id,
	}

	// Insert the folder
	err = folderModel.Insert(folder)
	if err != nil {
		t.Fatalf("Failed to insert folder: %v", err)
	}

	// Retrieve the folder by ID
	retrievedFolder, err := folderModel.Get(folder.ID)
	if err != nil {
		t.Fatalf("Failed to get folder by ID: %v", err)
	}

	// Verify folder fields
	if retrievedFolder.Name != folder.Name {
		t.Errorf("Expected name %s, got %s", folder.Name, retrievedFolder.Name)
	}

	if retrievedFolder.UserID != user.Id {
		t.Errorf("Expected user ID %d, got %d", user.Id, retrievedFolder.UserID)
	}
}

func TestAddNoteToFolder(t *testing.T) {
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
		Email:     "folder-notes-test@example.com",
		Name:      "Folder Notes",
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

	// Create a test folder
	folderModel := pgContainer.Models.Folders
	folder := &data.Folder{
		Name:   "Notes Folder",
		UserID: user.Id,
	}

	err = folderModel.Insert(folder)
	if err != nil {
		t.Fatalf("Failed to insert folder: %v", err)
	}

	// Create a test note
	noteModel := pgContainer.Models.Notes
	note := &data.Note{
		Title:         "Folder Test Note",
		AudioFilePath: "/test/folder-file.mp3",
		UserID:        user.Id,
		FolderID:      &folder.ID, // Set the folder ID directly
	}

	// Create transcript and summary as sql.NullString
	note.Transcript.String = "Test transcript for folder"
	note.Transcript.Valid = true
	note.Summary.String = "Test summary for folder"
	note.Summary.Valid = true

	err = noteModel.Insert(note)
	if err != nil {
		t.Fatalf("Failed to insert note: %v", err)
	}

	// Get notes in the folder using GetByFolder method instead
	filters := data.Filters{
		Page:         1,
		PageSize:     10,
		Sort:         "id",
		SortSafelist: []string{"id", "title", "created_at"},
	}

	folderIDPointer := &folder.ID
	folderNotes, err := noteModel.GetByFolder(user.Id, folderIDPointer, filters)
	if err != nil {
		t.Fatalf("Failed to get notes in folder: %v", err)
	}

	// Verify that the note is in the folder
	if len(folderNotes) != 1 {
		t.Fatalf("Expected 1 note in folder, got %d", len(folderNotes))
	}

	if folderNotes[0].ID != note.ID {
		t.Errorf("Expected note ID %d, got %d", note.ID, folderNotes[0].ID)
	}

	if folderNotes[0].Title != note.Title {
		t.Errorf("Expected note title %s, got %s", note.Title, folderNotes[0].Title)
	}
}
