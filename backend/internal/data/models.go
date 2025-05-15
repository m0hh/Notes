package data

import (
	"database/sql"
	"errors"
)

var (
	ErrRcordNotFound    = errors.New("record not found")
	ErrEditConflict     = errors.New("edit conflict")
	ErrUniqueFood       = errors.New("unique food with serving failed")
	ErrWrongForeignKey  = errors.New("wrong Foreign key")
	ErrWrongCredentials = errors.New("wrong credentials")
	ErrFKConflict       = errors.New("Foriegn Key conflicr")
)

type Models struct {
	Tokens     TokenModel
	Users      UserModel
	Notes      NoteModel
	Folders    FolderModel
	Embeddings EmbeddingModel
	SocialAuth SocialUsersModel
}

func NewModels(db *sql.DB) Models {
	return Models{
		Tokens:     TokenModel{DB: db},
		Users:      UserModel{DB: db},
		Notes:      NoteModel{DB: db},
		Folders:    FolderModel{DB: db},
		Embeddings: EmbeddingModel{DB: db},
		SocialAuth: SocialUsersModel{DB: db},
	}
}
