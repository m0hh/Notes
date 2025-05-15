package data

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// SocialProvider represents the type of social authentication provider
type SocialProvider string

const (
	GoogleProvider SocialProvider = "google"
	AppleProvider  SocialProvider = "apple"
)

// SocialUser represents a user authenticated via social provider
type SocialUser struct {
	ID             int64          `json:"id"`
	UserID         int64          `json:"user_id"`
	Provider       SocialProvider `json:"provider"`
	ProviderUserID string         `json:"provider_user_id"`
	Email          string         `json:"email"`
	Name           string         `json:"-"`
	Picture        string         `json:"picture,omitempty"`
	CreatedAt      time.Time      `json:"created_at"`
}

// SocialUsersModel wraps the connection pool
type SocialUsersModel struct {
	DB *sql.DB
}

// Insert adds a new social user record to the database
func (m *SocialUsersModel) Insert(user *SocialUser) error {
	query := `
        INSERT INTO social_auth (user_id, provider, provider_user_id, email, name, picture, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
    `

	args := []interface{}{
		user.UserID,
		user.Provider,
		user.ProviderUserID,
		user.Email,
		user.Name,
		user.Picture,
		time.Now(),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(&user.ID)
	if err != nil {
		return err
	}

	return nil
}

// GetByProviderID retrieves a social user by provider and provider ID
func (m *SocialUsersModel) GetByProviderID(provider SocialProvider, providerUserID string) (*SocialUser, error) {
	query := `
        SELECT id, user_id, provider, provider_user_id, email, name, picture, created_at
        FROM social_auth
        WHERE provider = $1 AND provider_user_id = $2
    `

	var user SocialUser

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, provider, providerUserID).Scan(
		&user.ID,
		&user.UserID,
		&user.Provider,
		&user.ProviderUserID,
		&user.Email,
		&user.Name,
		&user.Picture,
		&user.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRcordNotFound
		}
		return nil, err
	}

	return &user, nil
}

// GetByUserID retrieves all social auths for a user
func (m *SocialUsersModel) GetByUserID(userID int64) ([]*SocialUser, error) {
	query := `
        SELECT id, user_id, provider, provider_user_id, email, name, picture, created_at
        FROM social_auth
        WHERE user_id = $1
    `

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var socialUsers []*SocialUser

	for rows.Next() {
		var user SocialUser
		err := rows.Scan(
			&user.ID,
			&user.UserID,
			&user.Provider,
			&user.ProviderUserID,
			&user.Email,
			&user.Name,
			&user.Picture,
			&user.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		socialUsers = append(socialUsers, &user)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return socialUsers, nil
}

// Delete removes a social auth entry
func (m *SocialUsersModel) Delete(id int64) error {
	query := `
        DELETE FROM social_auth
        WHERE id = $1
    `

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := m.DB.ExecContext(ctx, query, id)
	return err
}
