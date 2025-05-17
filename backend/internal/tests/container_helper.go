package tests

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	"github.com/m0hh/Notes/internal/data"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"

	_ "github.com/lib/pq"
)

// PostgresContainer represents a PostgreSQL container for testing
type PostgresContainer struct {
	Container testcontainers.Container
	URI       string
	DB        *sql.DB
	Models    data.Models
}

// NewPostgresContainer creates a new PostgreSQL container for testing
func NewPostgresContainer(t *testing.T) (*PostgresContainer, error) {
	ctx := context.Background()

	// Define the PostgreSQL container configuration
	req := testcontainers.ContainerRequest{
		Image:        "pgvector/pgvector:pg16",
		ExposedPorts: []string{"5432/tcp"},
		Env: map[string]string{
			"POSTGRES_USER":     "test_user",
			"POSTGRES_PASSWORD": "test_password",
			"POSTGRES_DB":       "test_db",
		},
		WaitingFor: wait.ForListeningPort("5432/tcp").WithStartupTimeout(time.Second * 60),
	}

	// Create the PostgreSQL container
	pgContainer, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		return nil, err
	}

	// Get the mapped port for PostgreSQL
	mappedPort, err := pgContainer.MappedPort(ctx, "5432")
	if err != nil {
		return nil, err
	}

	// Get the host where the container is running
	host, err := pgContainer.Host(ctx)
	if err != nil {
		return nil, err
	}

	// Construct the DSN
	uri := fmt.Sprintf("postgres://test_user:test_password@%s:%s/test_db?sslmode=disable", host, mappedPort.Port())

	// Connect to the database
	db, err := sql.Open("postgres", uri)
	if err != nil {
		return nil, err
	}

	// Test the database connection
	for i := 0; i < 30; i++ {
		err = db.Ping()
		if err == nil {
			break
		}
		time.Sleep(1 * time.Second)
	}
	if err != nil {
		t.Fatalf("Database did not become ready in time: %v", err)
	}

	// Apply migrations
	if err := applyMigrations(t, db); err != nil {
		return nil, err
	}

	// Initialize the models
	models := data.NewModels(db)

	return &PostgresContainer{
		Container: pgContainer,
		URI:       uri,
		DB:        db,
		Models:    models,
	}, nil
}

// Terminate stops and removes the PostgreSQL container
func (p *PostgresContainer) Terminate(ctx context.Context) error {
	if p.DB != nil {
		p.DB.Close()
	}
	return p.Container.Terminate(ctx)
}

// applyMigrations applies database migrations from the migrations folder
func applyMigrations(t *testing.T, db *sql.DB) error {
	_, b, _, _ := runtime.Caller(0)
	basePath := filepath.Dir(filepath.Dir(filepath.Dir(b)))
	migrationsPath := filepath.Join(basePath, "migrations")

	// Apply migrations in order
	upMigrations := []string{
		"000001_user_table.up.sql",
		"000002_notes_table.up.sql",
		"000003_create_token_table.up.sql",
		"000004_create_folders_table.up.sql",
		"000005_create_note_transcript_embeddings_table.up.sql",
		"000006_create_social_auth_table.up.sql",
	}

	for _, migration := range upMigrations {
		migrationFilePath := filepath.Join(migrationsPath, migration)

		// Read migration file
		migrationContent, err := os.ReadFile(migrationFilePath)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", migration, err)
		}

		// Execute migration
		_, err = db.Exec(string(migrationContent))
		if err != nil {
			return fmt.Errorf("failed to apply migration %s: %w", migration, err)
		}

		t.Logf("Applied migration: %s", migration)
	}

	return nil
}

// ExecuteScript runs a SQL script on the database
func (p *PostgresContainer) ExecuteScript(script string) error {
	_, err := p.DB.Exec(script)
	return err
}

// ExecuteScriptFile runs a SQL script file on the database
func (p *PostgresContainer) ExecuteScriptFile(filePath string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	content, err := io.ReadAll(file)
	if err != nil {
		return err
	}

	return p.ExecuteScript(string(content))
}
