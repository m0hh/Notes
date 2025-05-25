package main

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/m0hh/Notes/internal/data"
	"github.com/m0hh/Notes/internal/validator"
)

func (app *application) socialAuthHandler(w http.ResponseWriter, r *http.Request) {
	// Parse the input data from the client
	var input struct {
		Provider       string `json:"provider"`
		IDToken        string `json:"id_token"`
		ProviderUserID string `json:"provider_user_id"`
		Email          string `json:"email"`
		Name           string `json:"name"`
		Picture        string `json:"picture,omitempty"`
	}

	err := app.ReadJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	// Validate input data
	v := validator.New()

	if input.Provider == "" {
		v.AddError("provider", "provider is required")
	} else if input.Provider != "google" && input.Provider != "apple" {
		v.AddError("provider", "provider must be 'google' or 'apple'")
	}

	if input.IDToken == "" && input.ProviderUserID == "" {
		v.AddError("authentication", "either id_token or provider_user_id is required")
	}

	if input.Email == "" {
		v.AddError("email", "email is required")
	} else {
		data.ValidateEmail(v, input.Email)
	}

	if input.Name == "" {
		v.AddError("name", "name is required")
	}

	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	// Determine the social provider
	var provider data.SocialProvider
	if input.Provider == "google" {
		provider = data.GoogleProvider
	} else {
		provider = data.AppleProvider
	}

	// Check if there's an existing social auth entry
	socialUser, err := app.models.SocialAuth.GetByProviderID(provider, input.ProviderUserID)
	if err != nil && !errors.Is(err, data.ErrRcordNotFound) {
		app.serverErrorResponse(w, r, err)
		return
	}

	var user *data.User
	// If social user exists, get the associated user
	if socialUser != nil {
		user, err = app.models.Users.Retrieve(socialUser.UserID)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
	} else {
		// Check if there's a user with the same email
		user, err = app.models.Users.RetrieveByEmail(input.Email)
		if err != nil && !errors.Is(err, data.ErrRcordNotFound) {
			app.serverErrorResponse(w, r, err)
			return
		}

		// If user doesn't exist, create a new one
		if user == nil {
			user = &data.User{
				Name:      input.Name,
				Email:     input.Email,
				Activated: true,
				Role:      data.TraineeRole,
			}

			// Set a random password for the user
			randomPass := fmt.Sprintf("%s_%s", time.Now().Format("20060102150405"), input.ProviderUserID)
			err = user.Password.Set(randomPass)
			if err != nil {
				app.serverErrorResponse(w, r, err)
				return
			}

			// Insert the new user
			err = app.models.Users.Insert(user)
			if err != nil {
				app.serverErrorResponse(w, r, err)
				return
			}
		}

		// Create social auth entry
		socialUser = &data.SocialUser{
			UserID:         user.Id,
			Provider:       provider,
			ProviderUserID: input.ProviderUserID,
			Email:          input.Email,
			Name:           input.Name,
			Picture:        input.Picture,
		}

		err = app.models.SocialAuth.Insert(socialUser)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
	}

	// Create authentication token
	token, err := app.models.Tokens.New(user.Id, 24*time.Hour, data.ScopeAuthentication)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Return the token and user information
	err = app.writeJSON(w, http.StatusCreated, envelope{
		"authentication_token": token,
		"user":                 user,
		"social_user":          socialUser,
	}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
