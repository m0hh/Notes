-- First remove the folder_id reference from the notes table
ALTER TABLE notes DROP COLUMN IF EXISTS folder_id;

-- Then drop the folders table
DROP TABLE IF EXISTS folders;