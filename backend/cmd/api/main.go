package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"expvar"
	"flag"
	"fmt"
	"os"
	"runtime"
	"strings"
	"sync"
	"time"

	_ "github.com/lib/pq"
	"github.com/m0hh/Notes/internal/ai"
	"github.com/m0hh/Notes/internal/data"
	"github.com/m0hh/Notes/internal/jsonlog"
	"github.com/m0hh/Notes/internal/mailer"
)

var (
	buildTime string
	version   string = "1.0.0"
)

// AppConfig holds the application configuration loaded from JSON or flags
type AppConfig struct {
	GCS struct {
		Enabled         bool   `json:"enabled"`
		BucketName      string `json:"bucket_name"`
		CredentialsFile string `json:"credentials_file"`
	} `json:"gcs"`
	API struct {
		WhisperAPIKey  string `json:"whisper_api_key"`
		DeepseekAPIKey string `json:"deepseek_api_key"`
		GeminiAPIKey   string `json:"gemini_api_key"`
		OpenAIAPIKey   string `json:"openai_api_key"`
	} `json:"api"`
	Server struct {
		Port               int      `json:"port"`
		CorsTrustedOrigins []string `json:"cors_trusted_origins"`
	} `json:"server"`
}

type config struct {
	port int
	env  string
	db   struct {
		dsn          string
		maxOpenConns int
		maxIdleConns int
		maxIdleTime  string
	}

	limiter struct {
		rps     float64
		burst   int
		enabled bool
	}

	smtp struct {
		host     string
		port     int
		username string
		password string
		sender   string
	}
	cors struct {
		trustedOrigins []string
	}
	ai struct {
		whisperAPIKey  string
		deepseekAPIKey string
		geminiAPIKey   string
		openaiAPIKey   string
		gcsBucketName  string
		gcsEnabled     bool
		gcsCredentials string
	}
}

type application struct {
	config        config
	logger        *jsonlog.Logger
	models        data.Models
	mailer        mailer.Mailer
	wg            sync.WaitGroup
	geminiService *ai.GeminiService
	ai            *ai.AIService
}

func main() {
	var cfg config
	var appConfigPath string

	// Define flag for config file path
	flag.StringVar(&appConfigPath, "config", "", "Path to JSON configuration file")

	// Standard command-line flags
	flag.IntVar(&cfg.port, "port", 4000, "API server port")
	flag.StringVar(&cfg.env, "env", "development", "Environment (development|staging|production)")
	flag.StringVar(&cfg.db.dsn, "db-dsn", os.Getenv("DB_DSN"), "PostgreSQL DSN")
	flag.IntVar(&cfg.db.maxOpenConns, "db-max-open-conns", 25, "PostgreSQL max open connections")
	flag.IntVar(&cfg.db.maxIdleConns, "db-max-idle-conns", 25, "PostgreSQL max idle connections")
	flag.StringVar(&cfg.db.maxIdleTime, "db-max-idle-time", "15m", "PostgreSQL max connection idle time")
	flag.Float64Var(&cfg.limiter.rps, "limiter-rps", 2, "Rate limiter maximum requests per second")
	flag.IntVar(&cfg.limiter.burst, "limiter-burst", 4, "Rate limiter maximum burst")
	flag.BoolVar(&cfg.limiter.enabled, "limiter-enabled", true, "Enable rate limiter")
	flag.StringVar(&cfg.smtp.host, "smtp-host", "sandbox.smtp.mailtrap.io", "SMTP host")
	flag.IntVar(&cfg.smtp.port, "smtp-port", 25, "SMTP port")
	flag.StringVar(&cfg.smtp.username, "smtp-username", "0eb39a152fddce", "SMTP username")
	flag.StringVar(&cfg.smtp.password, "smtp-password", "67433d292d5bda", "SMTP password")
	flag.StringVar(&cfg.smtp.sender, "smtp-sender", "mohamed.ehab.desoky@gmail.com", "SMTP sender")
	flag.StringVar(&cfg.ai.whisperAPIKey, "whisper-api-key", os.Getenv("WHISPER_API_KEY"), "Whisper API key")
	flag.StringVar(&cfg.ai.deepseekAPIKey, "deepseek-api-key", os.Getenv("DEEPSEEK_API_KEY"), "DeepSeek API key")
	flag.StringVar(&cfg.ai.geminiAPIKey, "gemini-api-key", os.Getenv("GEMINI_API_KEY"), "Gemini API key")
	flag.StringVar(&cfg.ai.openaiAPIKey, "openai-api-key", os.Getenv("OPENAI_API_KEY"), "OpenAI API key")
	flag.StringVar(&cfg.ai.gcsBucketName, "gcs-bucket", os.Getenv("GCS_BUCKET"), "Google Cloud Storage bucket name")
	flag.BoolVar(&cfg.ai.gcsEnabled, "gcs-enabled", false, "Enable Google Cloud Storage for large audio files")
	flag.StringVar(&cfg.ai.gcsCredentials, "gcs-credentials", os.Getenv("GOOGLE_APPLICATION_CREDENTIALS"), "Path to Google Cloud credentials JSON file")

	flag.Func("cors-trusted-origins", "Trusted CORS origins (space separated)", func(val string) error {
		cfg.cors.trustedOrigins = strings.Fields(val)
		return nil
	})

	displayVersion := flag.Bool("version", false, "Display version and exit")

	flag.Parse()

	if *displayVersion {
		fmt.Printf("Version:\t%s\nBuild Time:\t %s\n", version, buildTime)
		os.Exit(0)
	}

	logger := jsonlog.New(os.Stdout, jsonlog.LevelInfo)

	// If a config file path was provided, try to load it
	if appConfigPath != "" {
		appCfg, err := loadConfig(appConfigPath, logger)
		if err != nil {
			logger.PrintFatal(err, map[string]string{
				"path":    appConfigPath,
				"message": "Failed to load configuration file",
			})
		}

		// Override command-line flags with values from config file
		if appCfg.Server.Port != 0 {
			cfg.port = appCfg.Server.Port
		}
		if len(appCfg.Server.CorsTrustedOrigins) > 0 {
			cfg.cors.trustedOrigins = appCfg.Server.CorsTrustedOrigins
		}
		if appCfg.API.WhisperAPIKey != "" {
			cfg.ai.whisperAPIKey = appCfg.API.WhisperAPIKey
		}
		if appCfg.API.DeepseekAPIKey != "" {
			cfg.ai.deepseekAPIKey = appCfg.API.DeepseekAPIKey
		}
		if appCfg.API.GeminiAPIKey != "" {
			cfg.ai.geminiAPIKey = appCfg.API.GeminiAPIKey
		}
		if appCfg.API.OpenAIAPIKey != "" {
			cfg.ai.openaiAPIKey = appCfg.API.OpenAIAPIKey
		}

		// Always use GCS settings from config file if provided
		cfg.ai.gcsEnabled = appCfg.GCS.Enabled
		if appCfg.GCS.BucketName != "" {
			cfg.ai.gcsBucketName = appCfg.GCS.BucketName
		}
		if appCfg.GCS.CredentialsFile != "" {
			cfg.ai.gcsCredentials = appCfg.GCS.CredentialsFile
		}

		logger.PrintInfo("configuration loaded from file", map[string]string{
			"path": appConfigPath,
		})
	}

	db, err := openDB(cfg)
	if err != nil {
		logger.PrintFatal(err, nil)
	}
	defer db.Close()

	logger.PrintInfo("database connection pool established", nil)

	expvar.NewString("version").Set(version)

	expvar.Publish("goroutines", expvar.Func(func() interface{} {
		return runtime.NumGoroutine()
	}))

	expvar.Publish("database", expvar.Func(func() interface{} {
		return db.Stats()
	}))

	expvar.Publish("timestamp", expvar.Func(func() interface{} {
		return time.Now().Unix()
	}))

	// Initialize Gemini service
	geminiService := ai.NewGeminiService(cfg.ai.geminiAPIKey)

	// Check if Gemini API key is available
	if cfg.ai.geminiAPIKey == "" {
		logger.PrintInfo("Warning", map[string]string{
			"message": "Gemini API key not provided; direct audio processing with Gemini will not be available",
		})
	} else {
		logger.PrintInfo("Gemini Pro 1.5 service initialized", nil)
	}

	// Initialize AI service
	aiService := ai.NewAIService(cfg.ai.openaiAPIKey, cfg.ai.geminiAPIKey)

	// Check if OpenAI API key is available
	if cfg.ai.openaiAPIKey == "" {
		logger.PrintInfo("Warning", map[string]string{
			"message": "OpenAI API key not provided; embeddings and LLM features will not be available",
		})
	} else {
		logger.PrintInfo("OpenAI service initialized", nil)
	}

	// Create uploads directory if it doesn't exist
	err = os.MkdirAll("./uploads", 0755)
	if err != nil {
		logger.PrintFatal(err, nil)
	}

	// Create temp uploads directory if it doesn't exist
	err = os.MkdirAll("./uploads/temp", 0755)
	if err != nil {
		logger.PrintFatal(err, nil)
	}

	app := application{
		config: cfg,
		logger: logger,
		models: data.NewModels(db),
		mailer: mailer.New(cfg.smtp.host, cfg.smtp.port, cfg.smtp.username, cfg.smtp.password, cfg.smtp.sender),
		// transcriptionService: transcriptionService,
		// summarizationService: summarizationService,
		geminiService: geminiService,
		ai:            aiService,
	}

	err = app.serve()
	if err != nil {
		logger.PrintFatal(err, nil)
	}
}

// loadConfig loads the application configuration from a JSON file
func loadConfig(path string, logger *jsonlog.Logger) (*AppConfig, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("failed to open config file: %w", err)
	}
	defer file.Close()

	var cfg AppConfig
	decoder := json.NewDecoder(file)
	err = decoder.Decode(&cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	return &cfg, nil
}

func openDB(cfg config) (*sql.DB, error) {
	db, err := sql.Open("postgres", cfg.db.dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(cfg.db.maxOpenConns)
	db.SetMaxIdleConns(cfg.db.maxIdleConns)
	duration, err := time.ParseDuration(cfg.db.maxIdleTime)
	if err != nil {
		return nil, err
	}

	db.SetConnMaxIdleTime(duration)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = db.PingContext(ctx)
	if err != nil {
		return nil, err
	}

	return db, nil
}
