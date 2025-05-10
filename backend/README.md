# NotesGPT Backend

## Google Cloud Storage Configuration for Large Audio Files

All audio files for transcription are now uploaded to Google Cloud Storage. This allows processing files larger than 10MB and audio longer than 10 minutes.

### Setup Instructions

1. **Create a Google Cloud Platform account** if you don't have one already
2. **Create a new project** in the Google Cloud Console
3. **Enable the Cloud Storage API** for your project
4. **Create a storage bucket** to store your audio files
5. **Create a service account** with the following roles:
   - Storage Object Creator
   - Storage Object Viewer
6. **Generate a JSON key** for the service account and download it
7. **Update your configuration** using either:
   - Environment variables:
     ```
     export GCS_BUCKET=your-bucket-name
     export GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-credentials.json
     ```
   - Command-line flags:
     ```
     --gcs-bucket=your-bucket-name --gcs-credentials=/path/to/your-credentials.json
     ```
   - Configuration file (recommended):
     ```
     cp config.example.json config.json
     # Edit config.json with your bucket name and credentials path
     ```
     Then run with: `--config=config.json`

### Supported Audio Formats

The transcription service supports various audio formats including:
- MP3
- WAV
- FLAC
- OGG

### File Size and Duration Limits

With Google Cloud Storage integration, you can now transcribe:
- Files up to 500MB in size
- Audio up to 480 minutes (8 hours) in length

## Running the Application

1. Install dependencies:
   ```
   go mod tidy
   ```

2. Run with configuration file:
   ```
   go run ./cmd/api --config=config.json
   ```

## Troubleshooting

If you encounter issues:

1. Check that your service account has the proper permissions
2. Verify that your bucket name is correct
3. Ensure the credentials file path is absolute and accessible
4. Check the application logs for detailed error messages