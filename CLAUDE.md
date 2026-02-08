# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Audio File Concatenator 01 is a TypeScript microservice that combines audio files (MP3) with configurable pauses to create meditation audio sequences. The service reads a CSV file that specifies the sequence of audio files and pause durations, then uses FFmpeg to generate a single combined MP3 file.

**Future expansion**: This microservice will eventually be triggered by an ExpressJS API.

## System Requirements

This application requires **FFmpeg** to be installed on the system:

**Mac (Homebrew):**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get update && sudo apt-get install -y ffmpeg
```

**Verify installation:**
```bash
ffmpeg -version
ffmpeg -hide_banner -formats | grep -E ' D.*lavfi'  # Should show lavfi support
```

The application uses `fluent-ffmpeg` which automatically detects the system FFmpeg installation.

## Development Commands

```bash
# Build the TypeScript project
npm run build

# Run the compiled application
npm start

# Run in development mode (without building)
npm run dev

# Clean build artifacts
npm run clean
```

## Required Environment Variables

The application requires these variables in `.env`:

- **NAME_APP**: Application identifier (e.g., `AudioFileConcatenator01`)
- **NODE_ENV**: Environment mode (`development`, `testing`, or `production`)
- **PATH_PROJECT_RESOURCES**: Base path for project resources (used for temporary files)
- **PATH_AND_FILENAME_AUDIO_CSV_FILE**: Full path to the CSV file containing the audio sequence
- **PATH_MP3_OUTPUT**: Base directory where the final MP3 will be saved (date subdirectories will be created automatically)
- **PATH_TO_LOGS**: Directory for Winston log files

Optional variables:

- **LOG_MAX_SIZE**: Log file size in MB before rotation (default: 5)
- **LOG_MAX_FILES**: Number of rotated log files to retain (default: 5)

## Architecture

### Modular Processing Pipeline

The application follows a strict separation of concerns with each processing step in its own module:

1. **CSV Parsing** (`src/modules/csvParser.ts`): Reads and parses the audio sequence CSV file
2. **File Validation** (`src/modules/fileValidator.ts`): Validates that audio files exist and output directory is writable
3. **Audio Processing** (`src/modules/audioProcessor.ts`): Generates silent pauses and concatenates audio files using FFmpeg
4. **Logging** (`src/modules/logger.ts`): Winston-based logging with environment-specific behavior

### Entry Point Flow

`src/main.ts` orchestrates the entire process using an async IIFE pattern:

1. Loads environment variables
2. Validates required env vars (exits early if missing)
3. Generates timestamp-based output filename (`output_YYYYMMDD_HHMMSS.mp3`)
4. Creates date-based subdirectory (`YYYYMMDD`) in `PATH_MP3_OUTPUT` if it doesn't exist
5. Parses CSV file
6. Validates output directory
7. Validates all audio files exist
8. Processes audio (generates silences, concatenates)
9. Reports results and exits

Early exits include 100ms delay before `process.exit()` to ensure Winston logs flush to disk.

### Output File Organization

The application organizes output files into date-based subdirectories:

- Output files are saved to `PATH_MP3_OUTPUT/YYYYMMDD/output_YYYYMMDD_HHMMSS.mp3`
- Date subdirectories (format: `YYYYMMDD`) are automatically created if they don't exist
- This structure organizes files by day, making it easier to manage and locate audio files
- Example: A file created on January 26, 2026 at 3:45:30 PM would be saved to `PATH_MP3_OUTPUT/20260126/output_20260126_154530.mp3`

### Audio Processing Details

The `combineAudioFiles` function:

- Creates a `temporary_deletable` directory inside `PATH_PROJECT_RESOURCES` for temp files
- Generates silent MP3 files for pause durations using FFmpeg's `anullsrc` filter
- Creates a concat list file for FFmpeg to merge all audio files
- Uses FFmpeg's concat demuxer with `-c:a copy` for efficient concatenation
- Cleans up all temporary files after processing (in `finally` block)
- Returns the output path and total audio duration

### CSV Format

The CSV file must have these columns:

- **id**: Step identifier
- **audio_file_name_and_path**: Full path to an MP3 file (mutually exclusive with pause_duration)
- **pause_duration**: Duration in seconds for a silent pause (mutually exclusive with audio_file_name_and_path)

Each row represents one step in the sequence. Either `audio_file_name_and_path` OR `pause_duration` must be populated, but not both.

### Logging Implementation

Follows the `docs/LOGGING_NODE_JS_V06.md` specification:

- **Development mode**: Console output only
- **Testing mode**: Console AND file output
- **Production mode**: File output only
- Logger validates required env vars before initialization and exits if any are missing
- Async IIFE pattern ensures logs flush before early exits
- Log files rotate based on `LOG_MAX_SIZE` and `LOG_MAX_FILES`

### Type Definitions

All shared types are in `src/types/index.ts`:

- **AudioSequenceStep**: Represents a single step in the CSV (audio file or pause)
- **ProcessingResult**: Contains the output path and final audio duration

## FFmpeg Configuration

The application uses the system-installed FFmpeg binary via `fluent-ffmpeg`. The library automatically detects the FFmpeg installation on your system (see System Requirements section for installation instructions). This approach ensures compatibility with all FFmpeg features including the `lavfi` (libavfilter) virtual input device required for generating silent audio.

## Code Modification Guidelines

When modifying this codebase:

- Maintain the modular structure - each processing step should remain independent
- Audio processing changes go in `src/modules/audioProcessor.ts`
- CSV parsing changes go in `src/modules/csvParser.ts`
- Validation logic goes in `src/modules/fileValidator.ts`
- Always use the logger (not console statements) for output
- Preserve the async IIFE pattern in `main.ts` for proper log flushing
- Temporary files MUST be created in `PATH_PROJECT_RESOURCES/temporary_deletable/` and cleaned up in a `finally` block
