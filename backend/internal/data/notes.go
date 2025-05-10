package data

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/m0hh/Notes/internal/validator"
)

type Note struct {
	ID            int64          `json:"id"`
	Title         string         `json:"title"`
	AudioFilePath string         `json:"audio_file_path"`
	Transcript    sql.NullString `json:"transcript,omitempty"`
	Summary       sql.NullString `json:"summary,omitempty"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	UserID        int64          `json:"user_id"`
	FolderID      *int64         `json:"folder_id,omitempty"`
	Version       int            `json:"-"`
}

// ValidateTitle checks that the title is not empty and not too long
func ValidateTitle(v *validator.Validator, title string) {
	v.Check(title != "", "title", "must be provided")
	v.Check(len(title) <= 100, "title", "must not be more than 100 bytes long")
}

type NoteModel struct {
	DB *sql.DB
}

func (m NoteModel) Insert(note *Note) error {
	query := `
		INSERT INTO notes (title, audio_file_path, user_id, folder_id) 
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, version`

	args := []interface{}{note.Title, note.AudioFilePath, note.UserID, note.FolderID}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	return m.DB.QueryRowContext(ctx, query, args...).Scan(&note.ID, &note.CreatedAt, &note.Version)
}

func (m NoteModel) Get(id int64) (*Note, error) {
	if id < 1 {
		return nil, ErrRcordNotFound
	}

	query := `
		SELECT id, title, audio_file_path, transcript, summary, created_at, updated_at, user_id, folder_id, version
		FROM notes
		WHERE id = $1`

	var note Note

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, id).Scan(
		&note.ID,
		&note.Title,
		&note.AudioFilePath,
		&note.Transcript,
		&note.Summary,
		&note.CreatedAt,
		&note.UpdatedAt,
		&note.UserID,
		&note.FolderID,
		&note.Version,
	)

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRcordNotFound
		default:
			return nil, err
		}
	}

	return &note, nil
}

func (m NoteModel) UpdateTranscript(note *Note) error {
	query := `
		UPDATE notes
		SET transcript = $1, updated_at = NOW(), version = version + 1
		WHERE id = $2 AND version = $3
		RETURNING version`

	args := []interface{}{
		note.Transcript,
		note.ID,
		note.Version,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(&note.Version)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return ErrEditConflict
		default:
			return err
		}
	}

	return nil
}

func (m NoteModel) UpdateSummary(note *Note) error {
	query := `
		UPDATE notes
		SET summary = $1, updated_at = NOW(), version = version + 1
		WHERE id = $2 AND version = $3
		RETURNING version`

	args := []interface{}{
		note.Summary,
		note.ID,
		note.Version,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(&note.Version)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return ErrEditConflict
		default:
			return err
		}
	}

	return nil
}

// UpdateFolder changes the folder for a note
func (m NoteModel) UpdateFolder(note *Note) error {
	query := `
		UPDATE notes
		SET folder_id = $1, updated_at = NOW(), version = version + 1
		WHERE id = $2 AND version = $3
		RETURNING version`

	args := []interface{}{
		note.FolderID,
		note.ID,
		note.Version,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(&note.Version)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return ErrEditConflict
		default:
			return err
		}
	}

	return nil
}

// GetAll returns all notes for a specific user
func (m NoteModel) GetAll(userID int64, filters Filters) ([]*Note, error) {
	query := `
		SELECT id, title, audio_file_path, transcript, summary, created_at, updated_at, user_id, folder_id, version
		FROM notes
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []interface{}{userID, filters.limit(), filters.offset()}

	rows, err := m.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	notes := []*Note{}

	for rows.Next() {
		var note Note

		err := rows.Scan(
			&note.ID,
			&note.Title,
			&note.AudioFilePath,
			&note.Transcript,
			&note.Summary,
			&note.CreatedAt,
			&note.UpdatedAt,
			&note.UserID,
			&note.FolderID,
			&note.Version,
		)

		if err != nil {
			return nil, err
		}

		notes = append(notes, &note)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return notes, nil
}

// GetByFolder returns all notes in a specific folder
func (m NoteModel) GetByFolder(userID int64, folderID *int64, filters Filters) ([]*Note, error) {
	// SQL query that handles both null and non-null folder IDs
	query := `
		SELECT id, title, audio_file_path, transcript, summary, created_at, updated_at, user_id, folder_id, version
		FROM notes
		WHERE user_id = $1 AND (
		    ($2::bigint IS NULL AND folder_id IS NULL) OR 
		    ($2::bigint IS NOT NULL AND folder_id = $2)
		)
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []interface{}{userID, folderID, filters.limit(), filters.offset()}

	rows, err := m.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	notes := []*Note{}

	for rows.Next() {
		var note Note

		err := rows.Scan(
			&note.ID,
			&note.Title,
			&note.AudioFilePath,
			&note.Transcript,
			&note.Summary,
			&note.CreatedAt,
			&note.UpdatedAt,
			&note.UserID,
			&note.FolderID,
			&note.Version,
		)

		if err != nil {
			return nil, err
		}

		notes = append(notes, &note)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return notes, nil
}

func (m NoteModel) Delete(id int64) error {
	if id < 1 {
		return ErrRcordNotFound
	}

	query := `
		DELETE FROM notes
		WHERE id = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := m.DB.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrRcordNotFound
	}

	return nil
}
