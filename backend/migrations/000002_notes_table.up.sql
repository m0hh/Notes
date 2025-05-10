CREATE TABLE IF NOT EXISTS notes (
    id bigserial PRIMARY KEY,
    title text NOT NULL,
    audio_file_path text NOT NULL,
    transcript text,
    summary text,
    created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    user_id bigint NOT NULL REFERENCES users ON DELETE CASCADE,
    version integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes (user_id);