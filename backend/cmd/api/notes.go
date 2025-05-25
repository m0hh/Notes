package main

import (
	"database/sql"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp" // Import regexp package
	"strconv"
	"strings"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/m0hh/Notes/internal/data"
	"github.com/m0hh/Notes/internal/validator"
)

func (app *application) createNoteHandler(w http.ResponseWriter, r *http.Request) {
	// Maximum file size: 50MB
	const maxFileSize = 50 * 1024 * 1024

	// Parse the multipart form with a size limit
	if err := r.ParseMultipartForm(maxFileSize); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("multipart form parsing error: %v", err))
		return
	}

	// Get the title from the form data
	title := r.FormValue("title")
	if title == "" {
		app.badRequestResponse(w, r, errors.New("title is required"))
		return
	}

	// Get optional folder_id from form data
	var folderID *int64
	folderIDStr := r.FormValue("folder_id")
	if folderIDStr != "" {
		id, err := strconv.ParseInt(folderIDStr, 10, 64)
		if err != nil {
			app.badRequestResponse(w, r, fmt.Errorf("invalid folder_id: %v", err))
			return
		}
		folderID = &id
	}

	// Get the user from the context
	user := app.contextGetUser(r)
	if user.Id == 0 {
		app.authenticationRequiredResponse(w, r)
		return
	}

	// If folder ID is provided, verify that it exists and belongs to the user
	if folderID != nil && *folderID != 0 {
		folder, err := app.models.Folders.Get(*folderID)
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

	// Validate title
	v := validator.New()
	if data.ValidateTitle(v, title); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	// Get the audio file from the form data
	file, header, err := r.FormFile("audio")
	if err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("audio file is required: %v", err))
		return
	}
	defer file.Close()

	// Validate file type (simple check for now)
	fileExt := filepath.Ext(header.Filename)
	if fileExt != ".mp3" && fileExt != ".wav" && fileExt != ".m4a" && fileExt != ".ogg" {
		app.badRequestResponse(w, r, errors.New("invalid audio file format"))
		return
	}

	// Create uploads directory if it doesn't exist
	uploadsDir := filepath.Join(".", "uploads", strconv.FormatInt(user.Id, 10))
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Generate a unique filename
	filename := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), title, fileExt)
	filePath := filepath.Join(uploadsDir, filename)

	// Create the file
	dst, err := os.Create(filePath)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	defer dst.Close()

	// Copy the uploaded file to the created file
	if _, err := io.Copy(dst, file); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Create a new note in the database
	note := &data.Note{
		Title:         title,
		AudioFilePath: filePath,
		UserID:        user.Id,
		FolderID:      folderID,
	}

	// Insert the note in the database
	err = app.models.Notes.Insert(note)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Return the newly created note
	err = app.writeJSON(w, http.StatusCreated, envelope{"note": note}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getNoteHandler(w http.ResponseWriter, r *http.Request) {
	// Extract the note ID from the URL
	params := httprouter.ParamsFromContext(r.Context())
	id, err := strconv.ParseInt(params.ByName("id"), 10, 64)
	if err != nil || id < 1 {
		app.notFoundResponse(w, r)
		return
	}

	// Get the user from the context
	user := app.contextGetUser(r)
	if user.Id == 0 {
		app.authenticationRequiredResponse(w, r)
		return
	}
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

	// Check if the note belongs to the user
	if note.UserID != user.Id {
		app.notPermittedResponse(w, r)
		return
	}

	// Return the note
	err = app.writeJSON(w, http.StatusOK, envelope{"note": note}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) listNotesHandler(w http.ResponseWriter, r *http.Request) {
	// Get the user from the context
	user := app.contextGetUser(r)
	if user.Id == 0 {
		app.authenticationRequiredResponse(w, r)
		return
	}

	// Extract query parameters for pagination and folder filtering
	var input struct {
		data.Filters
		FolderID *int64
	}

	v := validator.New()
	qs := r.URL.Query()
	input.Filters.Page = app.readInt(qs, "page", 1, v)
	input.Filters.PageSize = app.readInt(qs, "page_size", 20, v)
	input.Filters.Sort = app.readString(qs, "sort", "created_at")
	input.Filters.SortSafelist = []string{"id", "title", "created_at", "-id", "-title", "-created_at"}

	// Parse optional folder_id filter
	folderIDStr := r.URL.Query().Get("folder_id")
	if folderIDStr != "" {
		id, err := strconv.ParseInt(folderIDStr, 10, 64)
		if err != nil {
			app.badRequestResponse(w, r, fmt.Errorf("invalid folder_id: %v", err))
			return
		}
		input.FolderID = &id

		// Verify folder belongs to user if a specific folder is requested
		if id > 0 {
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

			if folder.UserID != user.Id {
				app.notPermittedResponse(w, r)
				return
			}
		}
	}

	if data.ValidateFilters(v, input.Filters); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	// Fetch notes, filtered by folder if specified
	var notes []*data.Note
	var err error

	if input.FolderID != nil {
		notes, err = app.models.Notes.GetByFolder(user.Id, input.FolderID, input.Filters)
	} else {
		notes, err = app.models.Notes.GetAll(user.Id, input.Filters)
	}

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Return the notes
	err = app.writeJSON(w, http.StatusOK, envelope{"notes": notes}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) deleteNoteHandler(w http.ResponseWriter, r *http.Request) {
	// Extract the note ID from the URL
	params := httprouter.ParamsFromContext(r.Context())
	id, err := strconv.ParseInt(params.ByName("id"), 10, 64)
	if err != nil || id < 1 {
		app.notFoundResponse(w, r)
		return
	}

	// Get the user from the context
	user := app.contextGetUser(r)
	if user.Id == 0 {
		app.authenticationRequiredResponse(w, r)
		return
	}

	// Fetch the note from the database
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

	// Check if the note belongs to the user
	if note.UserID != user.Id {
		app.notPermittedResponse(w, r)
		return
	}

	// Delete the audio file
	if err := os.Remove(note.AudioFilePath); err != nil && !os.IsNotExist(err) {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Delete the note from the database
	err = app.models.Notes.Delete(id)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Return a 204 No Content response
	w.WriteHeader(http.StatusNoContent)
}

// processAudioWithGeminiHandler handles audio summarization directly with Gemini Pro 1.5
func (app *application) processAudioWithGeminiHandler(w http.ResponseWriter, r *http.Request) {
	// Maximum file size: 100MB
	const maxFileSize = 100 * 1024 * 1024

	// Parse the multipart form with a size limit
	if err := r.ParseMultipartForm(maxFileSize); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("multipart form parsing error: %v", err))
		return
	}

	// Get the title from the form data
	title := r.FormValue("title")
	if title == "" {
		app.badRequestResponse(w, r, errors.New("title is required"))
		return
	}

	// Get the language from the form data (default to english)
	language := r.FormValue("language")
	if language == "" {
		language = "english"
	}

	// Validate language (only allow english and arabic)
	if language != "english" && language != "arabic" {
		app.badRequestResponse(w, r, errors.New("language must be either 'english' or 'arabic'"))
		return
	}

	// Get the prompt from the form data (optional with default)
	prompt := r.FormValue("prompt")
	if prompt == "" {
		// Base prompt format
		promptFormat := "Please transcribe this audio and provide a detailed summary of its content. Include key points and main topics. The format should be 1. the Transcript without any timestamps or any explanation at the begining that it's the transcipt  2. the Summary without any explanation at the begining that it's the summary. %s 3.the transcript and the summary are divided by these charachters ##**##"

		// Add language-specific instruction
		languageInstruction := ""
		if language == "arabic" {
			languageInstruction = "in Arabic language"
		} else {
			languageInstruction = "in the language that the transcript is in"
		}

		// Format the complete prompt
		prompt = fmt.Sprintf(promptFormat, languageInstruction)
	} else {
		// For custom prompts, still ensure proper formatting for transcript/summary separator
		languageInstruction := ""
		if language == "arabic" {
			languageInstruction = "in Arabic language"
		} else {
			languageInstruction = "in the language that the transcript is in"
		}

		prompt += fmt.Sprintf(". The format should be 1. the Transcript without any timestamps or any explanation at the begining that it's the transcipt  2. the Summary without any explanation at the begining that it's the summary. %s. 3.the transcript and the summary are divided by these charachters ##**##", languageInstruction)
	}

	// Get optional folder_id from form data
	var folderID *int64
	folderIDStr := r.FormValue("folder_id")
	if folderIDStr != "" {
		id, err := strconv.ParseInt(folderIDStr, 10, 64)
		if err != nil {
			app.badRequestResponse(w, r, fmt.Errorf("invalid folder_id: %v", err))
			return
		}
		folderID = &id
	}

	// Get the user from the context
	user := app.contextGetUser(r)
	if user.Id == 0 {
		app.authenticationRequiredResponse(w, r)
		return
	}

	// If folder ID is provided, verify that it exists and belongs to the user
	if folderID != nil && *folderID != 0 {
		folder, err := app.models.Folders.Get(*folderID)
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

	// Validate title
	v := validator.New()
	if data.ValidateTitle(v, title); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	// Get the audio file from the form data
	file, header, err := r.FormFile("audio")
	if err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("audio file is required: %v", err))
		return
	}
	defer file.Close()

	// Validate file type
	fileExt := filepath.Ext(header.Filename)
	if fileExt != ".mp3" && fileExt != ".wav" && fileExt != ".m4a" && fileExt != ".ogg" {
		app.badRequestResponse(w, r, errors.New("invalid audio file format"))
		return
	}

	// Create uploads directory for this user
	uploadsDir := filepath.Join(".", "uploads", strconv.FormatInt(user.Id, 10))
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Sanitize the title for use in the filename
	// Replace problematic characters (like /, :, spaces) with underscores
	sanitizedTitle := strings.ReplaceAll(title, " ", "_")
	// Use a regex to remove any characters that are not alphanumeric, underscore, or hyphen
	reg, err := regexp.Compile("[^a-zA-Z0-9_-]+")
	if err == nil { // Only proceed if regex compilation is successful
		sanitizedTitle = reg.ReplaceAllString(sanitizedTitle, "")
	} else {
		app.serverErrorResponse(w, r, err)
		return
	}
	// Limit the length of the sanitized title to avoid overly long filenames
	maxTitleLength := 50
	if len(sanitizedTitle) > maxTitleLength {
		sanitizedTitle = sanitizedTitle[:maxTitleLength]
	}

	// Generate a unique filename using the sanitized title
	filename := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), sanitizedTitle, fileExt)
	filePath := filepath.Join(uploadsDir, filename)

	// Create the file
	dst, err := os.Create(filePath)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	defer dst.Close()

	// Copy the uploaded file to the created file
	if _, err := io.Copy(dst, file); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Create a new note in the database
	note := &data.Note{
		Title:         title,
		AudioFilePath: filePath,
		UserID:        user.Id,
		FolderID:      folderID,
	}

	// Insert the note in the database
	err = app.models.Notes.Insert(note)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		// Clean up the file if database insertion failed
		os.Remove(filePath)
		return
	}

	// Process the audio file with Gemini in a background goroutine
	app.background(func() {
		// Process audio with Gemini
		result, err := app.geminiService.ProcessAudioFile(filePath, prompt)
		if err != nil {
			app.logger.PrintError(err, map[string]string{
				"note_id": fmt.Sprintf("%d", note.ID),
				"process": "gemini_audio_processing",
			})
			return
		}

		// Parse the result to separate transcript and summary
		parts := strings.Split(result, "##**##")
		var transcript, summary string
		if len(parts) == 2 {
			transcript = strings.TrimSpace(parts[0])
			summary = strings.TrimSpace(parts[1])
		} else {
			// If the separator isn't found, use the whole result as transcript
			transcript = result
			summary = result
			app.logger.PrintInfo("Separator not found in Gemini response", map[string]string{
				"note_id": fmt.Sprintf("%d", note.ID),
			})
		}

		// Update the note with transcript from Gemini
		note.Transcript = sql.NullString{String: transcript, Valid: transcript != ""} // Assign as sql.NullString
		err = app.models.Notes.UpdateTranscript(note)
		if err != nil {
			app.logger.PrintError(err, map[string]string{
				"note_id": fmt.Sprintf("%d", note.ID),
				"process": "update_transcript",
			})
			return
		}

		// Update with summary
		note.Summary = sql.NullString{String: summary, Valid: summary != ""} // Assign as sql.NullString
		err = app.models.Notes.UpdateSummary(note)
		if err != nil {
			app.logger.PrintError(err, map[string]string{
				"note_id": fmt.Sprintf("%d", note.ID),
				"process": "update_summary",
			})
			return
		}

		// Generate and store embeddings for the transcript
		var folderIDValue int64
		if note.FolderID != nil {
			folderIDValue = *note.FolderID
		}

		err = app.models.Embeddings.ProcessAndStoreEmbeddings(transcript, note.ID, folderIDValue, app.ai)
		if err != nil {
			app.logger.PrintError(err, map[string]string{
				"note_id": fmt.Sprintf("%d", note.ID),
				"process": "generate_embeddings",
			})
			return
		}

		app.logger.PrintInfo("successfully processed audio with Gemini and stored embeddings", map[string]string{
			"note_id": fmt.Sprintf("%d", note.ID),
		})
	})

	// Return the newly created note
	err = app.writeJSON(w, http.StatusAccepted, envelope{
		"note":    note,
		"message": "Audio file uploaded successfully. Processing has started in the background.",
	}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// testGeminiHandler processes an audio file with Gemini without authentication (for testing)
func (app *application) testGeminiHandler(w http.ResponseWriter, r *http.Request) {
	// Maximum file size: 100MB
	const maxFileSize = 100 * 1024 * 1024

	// Parse the multipart form with a size limit
	if err := r.ParseMultipartForm(maxFileSize); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("multipart form parsing error: %v", err))
		return
	}

	// Get the prompt from the form data (optional with default)
	prompt := r.FormValue("prompt")
	if prompt == "" {
		prompt = "Please transcribe this audio and provide a detailed summary of its content. Include key points and main topics."
	}

	// Get the audio file from the form data
	file, header, err := r.FormFile("audio")
	if err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("audio file is required: %v", err))
		return
	}
	defer file.Close()

	// Validate file type (simple check for now)
	fileExt := filepath.Ext(header.Filename)
	if fileExt != ".mp3" && fileExt != ".wav" && fileExt != ".m4a" && fileExt != ".ogg" {
		app.badRequestResponse(w, r, errors.New("invalid audio file format"))
		return
	}

	// Create temp uploads directory if it doesn't exist
	uploadsDir := filepath.Join(".", "uploads", "temp")
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Generate a unique filename
	filename := fmt.Sprintf("test_gemini_%d%s", time.Now().UnixNano(), fileExt)
	filePath := filepath.Join(uploadsDir, filename)

	// Create the file
	dst, err := os.Create(filePath)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	defer dst.Close()

	// Copy the uploaded file to the created file
	if _, err := io.Copy(dst, file); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Process audio with Gemini
	result, err := app.geminiService.ProcessAudioFile(filePath, prompt)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("gemini processing failed: %w", err))

		// Clean up the temporary file
		os.Remove(filePath)
		return
	}

	// Clean up the temporary file
	os.Remove(filePath)

	// Return the result
	err = app.writeJSON(w, http.StatusOK, envelope{"result": result}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
