package data

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/pgvector/pgvector-go"
)

// NoteTranscriptEmbedding corresponds to the note_transcript_embeddings table.
type NoteTranscriptEmbedding struct {
	ID              int64           `json:"id"`
	NoteID          int64           `json:"note_id"`
	FolderID        int64           `json:"folder_id"`
	TranscriptChunk string          `json:"transcript_chunk"`
	Embedding       pgvector.Vector `json:"embedding"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

// EmbeddingModel struct with a DB *sql.DB field.
type EmbeddingModel struct {
	DB *sql.DB
}

// Insert inserts a new transcript chunk and its embedding.
func (m *EmbeddingModel) Insert(nte *NoteTranscriptEmbedding) error {
	query := `
		INSERT INTO note_transcript_embeddings (note_id, folder_id, transcript_chunk, embedding)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at`

	args := []interface{}{nte.NoteID, nte.FolderID, nte.TranscriptChunk, nte.Embedding}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(&nte.ID, &nte.CreatedAt, &nte.UpdatedAt)
	if err != nil {
		return err
	}
	return nil
}

// DeleteByNoteID deletes all embeddings associated with a specific note_id.
func (m *EmbeddingModel) DeleteByNoteID(noteID int64) error {
	if noteID < 1 {
		return fmt.Errorf("invalid note ID for deletion")
	}
	query := `
		DELETE FROM note_transcript_embeddings
		WHERE note_id = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := m.DB.ExecContext(ctx, query, noteID)
	if err != nil {
		return err
	}

	_, err = result.RowsAffected()
	if err != nil {
		return err
	}

	return nil
}

// GetRelevantChunks retrieves the transcript_chunks for the top limit most similar embeddings
// to queryEmbedding within a specific folderID, using cosine similarity.
func (m *EmbeddingModel) GetRelevantChunks(folderID int64, queryEmbedding pgvector.Vector, limit int) ([]string, error) {
	query := `
		SELECT transcript_chunk
		FROM note_transcript_embeddings
		WHERE folder_id = $1
		ORDER BY embedding <=> $2
		LIMIT $3`

	rows, err := m.DB.Query(query, folderID, queryEmbedding, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chunks []string
	for rows.Next() {
		var chunk string
		if err := rows.Scan(&chunk); err != nil {
			return nil, err
		}
		chunks = append(chunks, chunk)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return chunks, nil
}

// Constants for chunking
const (
	chunkSize    = 300
	overlapWords = 50
)

// AIServiceEmbedder defines the interface for a service that can generate embeddings
type AIServiceEmbedder interface {
	GenerateOpenAIEmbedding(text string) ([]float32, error)
}

// ProcessAndStoreEmbeddings chunks the transcript, generates embeddings, and stores them.
func (m *EmbeddingModel) ProcessAndStoreEmbeddings(transcript string, noteID int64, folderID int64, aiService AIServiceEmbedder) error {
	// 1. Delete any previous embeddings for this noteID
	err := m.DeleteByNoteID(noteID)
	if err != nil {
		return fmt.Errorf("failed to delete previous embeddings for noteID %d: %w", noteID, err)
	}

	// 2. Chunking: Split the transcript into smaller, overlapping text chunks
	words := strings.Fields(transcript)
	var chunks []string

	if len(words) == 0 {
		return nil
	}

	if len(words) <= chunkSize {
		chunks = append(chunks, transcript)
	} else {
		for i := 0; i < len(words); {
			end := i + chunkSize
			if end > len(words) {
				end = len(words)
			}
			chunks = append(chunks, strings.Join(words[i:end], " "))
			if end == len(words) {
				break
			}
			i += (chunkSize - overlapWords)
			if i >= len(words) {
				break
			}
		}
	}

	if len(chunks) == 0 && len(words) > 0 {
		chunks = append(chunks, transcript)
	}

	// 3. For each transcript_chunk:
	for _, chunk := range chunks {
		if strings.TrimSpace(chunk) == "" {
			continue
		}
		embeddingVec, err := aiService.GenerateOpenAIEmbedding(chunk)
		if err != nil {
			return fmt.Errorf("failed to generate OpenAI embedding for chunk '%s': %w", chunk[:30], err)
		}

		nte := &NoteTranscriptEmbedding{
			NoteID:          noteID,
			FolderID:        folderID,
			TranscriptChunk: chunk,
		}

		nte.Embedding = pgvector.NewVector(embeddingVec)

		err = m.Insert(nte)
		if err != nil {
			return fmt.Errorf("failed to insert note transcript embedding for noteID %d, chunk '%s': %w", noteID, chunk[:30], err)
		}
	}

	return nil
}
