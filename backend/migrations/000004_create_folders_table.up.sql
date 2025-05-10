CREATE TABLE IF NOT EXISTS folders (
    id bigserial PRIMARY KEY,
    name text NOT NULL,
    parent_id bigint REFERENCES folders(id) ON DELETE CASCADE, -- For hierarchical folder structure
    user_id bigint NOT NULL REFERENCES users ON DELETE CASCADE,
    created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    version integer NOT NULL DEFAULT 1
);

-- Add index on user_id for faster queries
CREATE INDEX IF NOT EXISTS folders_user_id_idx ON folders (user_id);
-- Add index on parent_id for faster hierarchical queries
CREATE INDEX IF NOT EXISTS folders_parent_id_idx ON folders (parent_id);

-- Alter the notes table to include a folder_id reference
ALTER TABLE notes ADD COLUMN folder_id bigint REFERENCES folders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS notes_folder_id_idx ON notes (folder_id);