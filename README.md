# Audio File Concatenator 01

## Overview

A TypeScript microservice that combines multiple MP3 audio files with configurable pauses to create seamless meditation sequences. The service reads a CSV file specifying the audio sequence (files and pause durations), uses FFmpeg to generate silence and concatenate audio, and outputs a single timestamp-named MP3 file. Designed for eventual integration with an ExpressJS API.

This service was build to support the Mantrify Project.

## How to Build and Run

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env` (see Configuration section)

3. Build and run:

```bash
npm run build  # Compile TypeScript
npm start      # Run compiled version
```

Or run in development mode:

```bash
npm run dev    # Run without building
```

## Project Structure

```
src/
├── main.ts                 # Entry point and orchestration
├── modules/
│   ├── audioProcessor.ts   # FFmpeg audio processing
│   ├── csvParser.ts        # CSV sequence parsing
│   ├── fileValidator.ts    # File existence validation
│   └── logger.ts           # Winston logging configuration
└── types/
    └── index.ts            # TypeScript interfaces
```

## Configuration

Create a `.env` file in the project root:

```env
NAME_APP=AudioFileConcatenator01
NODE_ENV=development  # development | testing | production
PATH_PROJECT_RESOURCES=/path/to/resources
PATH_AND_FILENAME_AUDIO_CSV_FILE=/path/to/audio_sequence.csv
PATH_MP3_OUTPUT=/path/to/output  # Base directory (date subdirectories created automatically)
PATH_TO_LOGS=/path/to/logs

# Optional
LOG_MAX_SIZE=5    # MB, default: 5
LOG_MAX_FILES=5   # default: 5
```

## How to use CSV

Required for running the service. The CSV file defines the audio sequence and must be specified in the `PATH_AND_FILENAME_AUDIO_CSV_FILE` environment variable.

Columns:

- id - Unique identifier for each step in the sequence
- audio_file_name_and_path - Full path to an existing MP3 audio file
- pause_duration - Duration of silence in seconds (e.g., `3.5` for 3.5 seconds)

Important: Each row must have either `audio_file_name_and_path` OR `pause_duration` populated, but not both. The service processes rows in order to create the final combined audio file.

Example CSV:

```
id,audio_file_name_and_path,pause_duration
1,/path/to/intro.mp3,
2,,2.5
3,/path/to/meditation.mp3,
```

## Processing Workflow

1. Environment validation - Verify all required variables are set
2. Output path preparation - Create date-based subdirectory (`YYYYMMDD`) in `PATH_MP3_OUTPUT` if it doesn't exist
3. CSV parsing - Load and parse audio sequence file
4. Output validation - Confirm output directory exists and is writable
5. File validation - Verify all referenced audio files exist
6. Audio processing:
   - Generate silent MP3 files for specified pause durations
   - Create FFmpeg concat list
   - Concatenate all audio (re-encoded to 44.1kHz, stereo, 128kbps for compatibility)
7. Cleanup - Remove temporary files
8. Output - Save to `PATH_MP3_OUTPUT/YYYYMMDD/output_YYYYMMDD_HHMMSS.mp3`

**Output Organization**: Files are automatically organized into date-based subdirectories. For example, a file created on January 26, 2026 at 3:45:30 PM would be saved to `PATH_MP3_OUTPUT/20260126/output_20260126_154530.mp3`.
