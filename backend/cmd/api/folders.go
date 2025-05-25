package main

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"github.com/m0hh/Notes/internal/data"
	"github.com/m0hh/Notes/internal/validator"
	"github.com/pgvector/pgvector-go"
)

// createFolderHandler handles creation of new folders
func (app *application) createFolderHandler(w http.ResponseWriter, r *http.Request) {
	// Parse the request body
	var input struct {
		Name     string `json:"name"`
		ParentID *int64 `json:"parent_id,omitempty"`
	}

	err := app.ReadJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Get the user from context
	user := app.contextGetUser(r)
	if user.Id == 0 {
		app.authenticationRequiredResponse(w, r)
		return
	}

	// Validate the folder name
	v := validator.New()
	v.Check(input.Name != "", "name", "must be provided")
	v.Check(len(input.Name) <= 100, "name", "must not be more than 100 bytes long")

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	// If parentID is provided, verify that it exists and belongs to the user
	if input.ParentID != nil {
		parentFolder, err := app.models.Folders.Get(*input.ParentID)
		if err != nil {
			switch {
			case errors.Is(err, data.ErrRcordNotFound):
				app.notFoundResponse(w, r)
			default:
				app.serverErrorResponse(w, r, err)
			}
			return
		}

		// Ensure the parent folder belongs to this user
		if parentFolder.UserID != user.Id {
			app.notPermittedResponse(w, r)
			return
		}
	}

	// Create the folder in the database
	folder := &data.Folder{
		Name:     input.Name,
		ParentID: input.ParentID,
		UserID:   user.Id,
	}

	err = app.models.Folders.Insert(folder)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Return the newly created folder
	err = app.writeJSON(w, http.StatusCreated, envelope{"folder": folder}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// getFolderHandler retrieves a specific folder
func (app *application) getFolderHandler(w http.ResponseWriter, r *http.Request) {
	params := httprouter.ParamsFromContext(r.Context())

	id, err := strconv.ParseInt(params.ByName("id"), 10, 64)
	if err != nil || id < 1 {
		app.notFoundResponse(w, r)
		return
	}

	// Get the user from context
	user := app.contextGetUser(r)
	if user.Id == 0 {
		app.authenticationRequiredResponse(w, r)
		return
	}

	folder, err := app.models.Folders.Get(id)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRcordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	// Ensure the folder belongs to this user
	if folder.UserID != user.Id {
		app.notPermittedResponse(w, r)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"folder": folder}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// updateFolderHandler handles renaming or moving folders
func (app *application) updateFolderHandler(w http.ResponseWriter, r *http.Request) {
	params := httprouter.ParamsFromContext(r.Context())

	id, err := strconv.ParseInt(params.ByName("id"), 10, 64)
	if err != nil || id < 1 {
		app.notFoundResponse(w, r)
		return
	}

	// Get the user from context
	user := app.contextGetUser(r)
	if user.Id == 0 {
		app.authenticationRequiredResponse(w, r)
		return
	}

	// Get the current folder data
	folder, err := app.models.Folders.Get(id)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRcordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	// Ensure the folder belongs to this user
	if folder.UserID != user.Id {
		app.notPermittedResponse(w, r)
		return
	}

	// Parse the request body
	var input struct {
		Name     *string `json:"name,omitempty"`
		ParentID *int64  `json:"parent_id,omitempty"`
	}

	err = app.ReadJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Update the folder attributes
	if input.Name != nil {
		folder.Name = *input.Name
	}

	// If parent folder ID is changing, validate it
	if input.ParentID != nil {
		// Check for circular references (folder can't be its own parent or ancestor)
		if *input.ParentID == folder.ID {
			app.badRequestResponse(w, r, fmt.Errorf("a folder cannot be its own parent"))
			return
		}

		// TODO: For a more complete solution, check if the new parent is a descendant of this folder

		// Check that the new parent exists and belongs to the user
		if *input.ParentID > 0 {
			parentFolder, err := app.models.Folders.Get(*input.ParentID)
			if err != nil {
				switch {
				case errors.Is(err, data.ErrRcordNotFound):
					app.notFoundResponse(w, r)
				default:
					app.serverErrorResponse(w, r, err)
				}
				return
			}

			// Ensure the parent folder belongs to this user
			if parentFolder.UserID != user.Id {
				app.notPermittedResponse(w, r)
				return
			}
		}

		folder.ParentID = input.ParentID
	}

	// Validate folder name
	v := validator.New()
	v.Check(folder.Name != "", "name", "must be provided")
	v.Check(len(folder.Name) <= 100, "name", "must not be more than 100 bytes long")

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	// Save changes to the database
	err = app.models.Folders.Update(folder)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrEditConflict):
			app.editConflictResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"folder": folder}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// deleteFolderHandler handles folder deletion
func (app *application) deleteFolderHandler(w http.ResponseWriter, r *http.Request) {
	params := httprouter.ParamsFromContext(r.Context())

	id, err := strconv.ParseInt(params.ByName("id"), 10, 64)
	if err != nil || id < 1 {
		app.notFoundResponse(w, r)
		return
	}

	// Get the user from context
	user := app.contextGetUser(r)
	if user.Id == 0 {
		app.authenticationRequiredResponse(w, r)
		return
	}

	// Get the folder to ensure it exists and belongs to the user
	folder, err := app.models.Folders.Get(id)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRcordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	// Ensure the folder belongs to this user
	if folder.UserID != user.Id {
		app.notPermittedResponse(w, r)
		return
	}

	// Delete the folder
	err = app.models.Folders.Delete(id)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"message": "folder successfully deleted"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// listFoldersHandler returns all folders for the current user
func (app *application) listFoldersHandler(w http.ResponseWriter, r *http.Request) {
	// Get the user from context
	user := app.contextGetUser(r)
	if user.Id == 0 {
		app.authenticationRequiredResponse(w, r)
		return
	}

	// Parse query parameters to check if we should filter by parent folder
	var parentID *int64
	parentIDStr := r.URL.Query().Get("parent_id")
	if parentIDStr != "" {
		id, err := strconv.ParseInt(parentIDStr, 10, 64)
		if err != nil {
			app.badRequestResponse(w, r, fmt.Errorf("invalid parent_id parameter"))
			return
		}
		parentID = &id
	}
	println("parentID", parentIDStr)
	println("parentID", parentID)

	var folders []*data.Folder
	var err error

	if parentID == nil {
		// Get root folders if no parent ID provided
		folders, err = app.models.Folders.GetRootFolders(user.Id)
	} else {
		// Get child folders of the specified parent
		folders, err = app.models.Folders.GetChildren(*parentID, user.Id)
	}

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"folders": folders}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// moveNoteHandler moves a note to a different folder
func (app *application) moveNoteHandler(w http.ResponseWriter, r *http.Request) {
	params := httprouter.ParamsFromContext(r.Context())

	id, err := strconv.ParseInt(params.ByName("id"), 10, 64)
	if err != nil || id < 1 {
		app.notFoundResponse(w, r)
		return
	}

	// Parse the request body
	var input struct {
		FolderID *int64 `json:"folder_id"`
	}

	err = app.ReadJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Get the user from context
	user := app.contextGetUser(r)
	if user.Id == 0 {
		app.authenticationRequiredResponse(w, r)
		return
	}

	// Get the note
	note, err := app.models.Notes.Get(id)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRcordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	// Ensure the note belongs to this user
	if note.UserID != user.Id {
		app.notPermittedResponse(w, r)
		return
	}

	// If a folder ID is provided, verify that it exists and belongs to the user
	if input.FolderID != nil && *input.FolderID != 0 {
		folder, err := app.models.Folders.Get(*input.FolderID)
		if err != nil {
			switch {
			case errors.Is(err, data.ErrRcordNotFound):
				app.notFoundResponse(w, r)
			default:
				app.serverErrorResponse(w, r, err)
			}
			return
		}

		// Ensure the folder belongs to this user
		if folder.UserID != user.Id {
			app.notPermittedResponse(w, r)
			return
		}
	}

	// Update the note's folder
	note.FolderID = input.FolderID

	// Save to database
	err = app.models.Notes.UpdateFolder(note)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrEditConflict):
			app.editConflictResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"note": note}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// queryFolderHandler handles querying a folder with an LLM
func (app *application) queryFolderHandler(w http.ResponseWriter, r *http.Request) {
	// Read folder_id from the URL path
	params := httprouter.ParamsFromContext(r.Context())
	folderID, err := strconv.ParseInt(params.ByName("id"), 10, 64)
	if err != nil || folderID < 1 {
		app.notFoundResponse(w, r)
		return
	}

	// Read JSON request body
	var input struct {
		Query string `json:"query"`
	}
	err = app.ReadJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Validate query
	v := validator.New()
	v.Check(input.Query != "", "query", "must be provided")
	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	// Get the user from context
	user := app.contextGetUser(r)
	if user.Id == 0 {
		app.authenticationRequiredResponse(w, r)
		return
	}

	// Verify folder exists and belongs to the user
	folder, err := app.models.Folders.Get(folderID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRcordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}
	if folder.UserID != user.Id {
		app.notPermittedResponse(w, r)
		return
	}

	// Check if AI services are available
	if app.ai == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("ai services not configured"))
		return
	}

	// Check if Gemini API key is available for querying
	if app.ai.GeminiAPIKey == "" {
		app.serverErrorResponse(w, r, fmt.Errorf("gemini api key not configured"))
		return
	}

	// Check if OpenAI API key is available for embeddings
	if app.ai.OpenAIAPIKey == "" {
		app.serverErrorResponse(w, r, fmt.Errorf("openai api key not configured for embeddings"))
		return
	}

	// Generate embedding for the query
	queryEmbeddingFloat, err := app.ai.GenerateOpenAIEmbedding(input.Query)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to generate query embedding: %w", err))
		return
	}

	// Convert []float32 to pgvector.Vector
	queryEmbedding := pgvector.NewVector(queryEmbeddingFloat)

	// Get relevant chunks using the embedding
	relevantChunks, err := app.models.Embeddings.GetRelevantChunks(folderID, queryEmbedding, 5)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to retrieve relevant chunks: %w", err))
		return
	}

	// Combine these chunks into a single contextText string
	var contextText string
	for _, chunk := range relevantChunks {
		// The GetRelevantChunks method returns strings, not struct with Content field
		contextText += chunk + "\n"
	}

	// Construct a prompt for an LLM
	prompt := fmt.Sprintf("Based on the following information: %s. Please answer the question: %s. If the information is not present in the provided context, say so.", contextText, input.Query)

	// Call Gemini for a response
	answer, err := app.ai.AskLLM(prompt)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get answer from gemini: %w", err))
		return
	}

	// Return the LLM's answer as a JSON response
	err = app.writeJSON(w, http.StatusOK, envelope{"answer": answer}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
