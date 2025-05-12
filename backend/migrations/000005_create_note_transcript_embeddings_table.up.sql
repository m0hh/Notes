-- Enable the vector extension if it doesn't already exist.
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a new table named note_transcript_embeddings
CREATE TABLE note_transcript_embeddings (
    id BIGSERIAL PRIMARY KEY,
    note_id BIGINT REFERENCES notes(id) ON DELETE CASCADE,
    folder_id BIGINT REFERENCES folders(id) ON DELETE CASCADE,
    transcript_chunk TEXT NOT NULL,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create an HNSW index on the embedding column using cosine distance
CREATE INDEX ON note_transcript_embeddings USING hnsw (embedding vector_cosine_ops);

-- Create an index on folder_id
CREATE INDEX ON note_transcript_embeddings (folder_id);

-- Create an index on note_id
CREATE INDEX ON note_transcript_embeddings (note_id);
