package main

import (
	"expvar"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func (app *application) routes() http.Handler {
	router := httprouter.New()

	router.NotFound = http.HandlerFunc(app.notFoundResponse)
	router.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	router.HandlerFunc(http.MethodGet, "/v1/healthcheck", app.healthcheckHandler)

	router.HandlerFunc(http.MethodPost, "/v1/users", app.registerUserHandler)
	router.HandlerFunc(http.MethodPut, "/v1/users/activated", app.activateUserHandler)
	router.HandlerFunc(http.MethodPut, "/v1/users/password", app.updateUserPasswordHandler)

	router.HandlerFunc(http.MethodPost, "/v1/tokens/authentication", app.createAuthenticationTokenHandler)
	router.HandlerFunc(http.MethodPost, "/v1/tokens/activation", app.createActivationTokenHandler)
	router.HandlerFunc(http.MethodPost, "/v1/tokens/password-reset", app.createPasswordResetTokenHandler)
	router.HandlerFunc(http.MethodPost, "/v1/tokens/social", app.socialAuthHandler)

	// Notes endpoints
	router.HandlerFunc(http.MethodPost, "/v1/notes", app.createNoteHandler)
	router.HandlerFunc(http.MethodGet, "/v1/notes", app.listNotesHandler)
	router.HandlerFunc(http.MethodGet, "/v1/notes/:id", app.getNoteHandler)
	router.HandlerFunc(http.MethodDelete, "/v1/notes/:id", app.deleteNoteHandler)

	// New Gemini direct processing endpoint
	router.HandlerFunc(http.MethodPost, "/v1/process/notes/gemini", app.processAudioWithGeminiHandler)

	// Folder endpoints
	router.HandlerFunc(http.MethodPost, "/v1/folders", app.createFolderHandler)
	router.HandlerFunc(http.MethodGet, "/v1/folders", app.listFoldersHandler)
	router.HandlerFunc(http.MethodGet, "/v1/folders/:id", app.getFolderHandler)
	router.HandlerFunc(http.MethodPut, "/v1/folders/:id", app.updateFolderHandler)
	router.HandlerFunc(http.MethodDelete, "/v1/folders/:id", app.deleteFolderHandler)

	// Note movement endpoint
	router.HandlerFunc(http.MethodPut, "/v1/notes/:id/move", app.moveNoteHandler)

	// Folder query endpoint
	router.HandlerFunc(http.MethodPost, "/v1/folders/:id/query", app.queryFolderHandler)

	// Test endpoints
	router.HandlerFunc(http.MethodPost, "/v1/test/gemini", app.testGeminiHandler)

	router.Handler(http.MethodGet, "/debug/vars", expvar.Handler())

	return app.metrics(app.recoverPanic(app.enableCORS(app.rateLimit(app.authenticate(router)))))
}
