# Testing with TestContainers

This directory contains integration tests for the NotesGPT backend using TestContainers. TestContainers allows us to spin up lightweight, disposable instances of services like PostgreSQL for testing purposes.

## Requirements

- Docker (must be running during tests)
- Go 1.24 or later

## Test Structure

The tests are organized as follows:

- `container_helper.go`: Contains helper functions for setting up PostgreSQL containers for testing
- `user_test.go`: Tests for user creation and management
- `note_test.go`: Tests for note creation and retrieval
- `folder_test.go`: Tests for folder management
- `token_test.go`: Tests for token management and authentication
- `api_test.go`: Integration tests for API endpoints

## Running the Tests

You can run all tests using the Makefile:

```bash
make test
```

Or run specific test groups:

```bash
make test/user    # Run only user tests
make test/note    # Run only note tests
make test/folder  # Run only folder tests
make test/token   # Run only token tests
make test/api     # Run only API tests
```

## How It Works

1. When a test is started, a PostgreSQL container is created with a fresh database
2. Database migrations are automatically applied
3. The tests run against this isolated database
4. After the tests complete, the container is automatically terminated

This approach allows us to run tests in isolation without affecting any existing databases, and ensures that each test runs against a clean database state.

## Adding New Tests

To add new tests:

1. Create a new test file in this directory
2. Use the `NewPostgresContainer()` function to set up a database container
3. Use the returned `pgContainer.Models` to interact with the database
4. Remember to defer the `pgContainer.Terminate()` function to clean up after the test

Example:

```go
func TestSomething(t *testing.T) {
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

    // Your test code here, using pgContainer.Models
}
```

## Troubleshooting

If you encounter issues with the tests:

1. Ensure Docker is running
2. Check for any failed containers with `docker ps -a`
3. Remove any stopped containers with `docker container prune`
4. Make sure you have sufficient permissions to create Docker containers
