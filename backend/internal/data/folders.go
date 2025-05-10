package data

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

type Folder struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	ParentID  *int64    `json:"parent_id,omitempty"`
	UserID    int64     `json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Version   int32     `json:"version"`
}

type FolderModel struct {
	DB *sql.DB
}

// Insert creates a new folder in the database
func (m FolderModel) Insert(folder *Folder) error {
	query := `
		INSERT INTO folders (name, parent_id, user_id)
		VALUES ($1, $2, $3)
		RETURNING id, created_at, updated_at, version`

	args := []interface{}{folder.Name, folder.ParentID, folder.UserID}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	return m.DB.QueryRowContext(ctx, query, args...).Scan(&folder.ID, &folder.CreatedAt, &folder.UpdatedAt, &folder.Version)
}

// Get retrieves a specific folder by ID
func (m FolderModel) Get(id int64) (*Folder, error) {
	if id < 1 {
		return nil, ErrRcordNotFound
	}

	query := `
		SELECT id, name, parent_id, user_id, created_at, updated_at, version
		FROM folders
		WHERE id = $1`

	var folder Folder

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, id).Scan(
		&folder.ID,
		&folder.Name,
		&folder.ParentID,
		&folder.UserID,
		&folder.CreatedAt,
		&folder.UpdatedAt,
		&folder.Version,
	)

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRcordNotFound
		default:
			return nil, err
		}
	}

	return &folder, nil
}

// Update updates a folder in the database
func (m FolderModel) Update(folder *Folder) error {
	query := `
		UPDATE folders
		SET name = $1, parent_id = $2, updated_at = NOW(), version = version + 1
		WHERE id = $3 AND version = $4
		RETURNING version`

	args := []interface{}{
		folder.Name,
		folder.ParentID,
		folder.ID,
		folder.Version,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(&folder.Version)
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

// Delete removes a folder from the database
func (m FolderModel) Delete(id int64) error {
	if id < 1 {
		return ErrRcordNotFound
	}

	query := `
		DELETE FROM folders
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

// GetAll returns all folders for a specific user
func (m FolderModel) GetAll(userID int64) ([]*Folder, error) {
	query := `
		SELECT id, name, parent_id, user_id, created_at, updated_at, version
		FROM folders
		WHERE user_id = $1
		ORDER BY name`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	folders := []*Folder{}

	for rows.Next() {
		var folder Folder

		err := rows.Scan(
			&folder.ID,
			&folder.Name,
			&folder.ParentID,
			&folder.UserID,
			&folder.CreatedAt,
			&folder.UpdatedAt,
			&folder.Version,
		)
		if err != nil {
			return nil, err
		}

		folders = append(folders, &folder)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return folders, nil
}

// GetChildren returns all folders that are children of the specified parent folder
func (m FolderModel) GetChildren(parentID int64, userID int64) ([]*Folder, error) {
	query := `
		SELECT id, name, parent_id, user_id, created_at, updated_at, version
		FROM folders
		WHERE parent_id = $1 AND user_id = $2
		ORDER BY name`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, parentID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	folders := []*Folder{}

	for rows.Next() {
		var folder Folder

		err := rows.Scan(
			&folder.ID,
			&folder.Name,
			&folder.ParentID,
			&folder.UserID,
			&folder.CreatedAt,
			&folder.UpdatedAt,
			&folder.Version,
		)
		if err != nil {
			return nil, err
		}

		folders = append(folders, &folder)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return folders, nil
}

// GetRootFolders returns all top-level folders for a user (those with no parent)
func (m FolderModel) GetRootFolders(userID int64) ([]*Folder, error) {
	query := `
		SELECT id, name, parent_id, user_id, created_at, updated_at, version
		FROM folders
		WHERE parent_id IS NULL AND user_id = $1
		ORDER BY name`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	folders := []*Folder{}

	for rows.Next() {
		var folder Folder

		err := rows.Scan(
			&folder.ID,
			&folder.Name,
			&folder.ParentID,
			&folder.UserID,
			&folder.CreatedAt,
			&folder.UpdatedAt,
			&folder.Version,
		)
		if err != nil {
			return nil, err
		}

		folders = append(folders, &folder)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return folders, nil
}
