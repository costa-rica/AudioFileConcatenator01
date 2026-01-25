import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

// Import logger (which validates required env vars)
import logger from "./modules/logger";
import { parseAudioSequenceCSV } from "./modules/csvParser";
import {
  validateAudioFiles,
  validateOutputDirectory,
} from "./modules/fileValidator";
import path from "path";
import { combineAudioFiles } from "./modules/audioProcessor";

/**
 * Main application entry point
 * Uses async IIFE pattern to ensure proper cleanup and log flushing on early exit
 */
(async () => {
  try {
    logger.info("=== Morning Meditation Mantra 01 - Starting ===");

    // Validate additional required environment variables
    const PATH_AND_FILENAME_AUDIO_CSV_FILE =
      process.env.PATH_AND_FILENAME_AUDIO_CSV_FILE;
    const PATH_MP3_OUTPUT = process.env.PATH_MP3_OUTPUT;
    const PATH_PROJECT_RESOURCES = process.env.PATH_PROJECT_RESOURCES;

    if (!PATH_AND_FILENAME_AUDIO_CSV_FILE) {
      const errorMsg =
        "PATH_AND_FILENAME_AUDIO_CSV_FILE environment variable is not set";
      logger.error(errorMsg);
      console.error(`FATAL ERROR: ${errorMsg}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
      process.exit(1);
    }

    if (!PATH_MP3_OUTPUT) {
      const errorMsg = "PATH_MP3_OUTPUT environment variable is not set";
      logger.error(errorMsg);
      console.error(`FATAL ERROR: ${errorMsg}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
      process.exit(1);
    }

    if (!PATH_PROJECT_RESOURCES) {
      const errorMsg = "PATH_PROJECT_RESOURCES environment variable is not set";
      logger.error(errorMsg);
      console.error(`FATAL ERROR: ${errorMsg}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
      process.exit(1);
    }

    logger.info(`CSV file: ${PATH_AND_FILENAME_AUDIO_CSV_FILE}`);
    logger.info(`Output directory: ${PATH_MP3_OUTPUT}`);

    // Generate timestamp-based filename: output_YYYYMMDD_HHMMSS.mp3
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;
    const outputFileName = `output_${timestamp}.mp3`;
    const outputFilePath = path.join(PATH_MP3_OUTPUT, outputFileName);

    logger.info(`Generated output filename: ${outputFileName}`);
    logger.info(`Full output path: ${outputFilePath}`);

    // Step 1: Parse the CSV file
    let audioSequence;
    try {
      audioSequence = await parseAudioSequenceCSV(
        PATH_AND_FILENAME_AUDIO_CSV_FILE,
      );
    } catch (error) {
      const errorMsg = `Failed to parse CSV file: ${(error as Error).message}`;
      logger.error(errorMsg);
      console.error(`ERROR: ${errorMsg}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
      process.exit(1);
    }

    // Step 2: Validate output directory
    if (!validateOutputDirectory(PATH_MP3_OUTPUT)) {
      const errorMsg = "Output directory validation failed";
      logger.error(errorMsg);
      console.error(`ERROR: ${errorMsg}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
      process.exit(1);
    }

    // Step 3: Validate all audio files exist
    if (!validateAudioFiles(audioSequence)) {
      const errorMsg =
        "Audio file validation failed - one or more files not found";
      logger.error(errorMsg);
      console.error(`ERROR: ${errorMsg}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
      process.exit(1);
    }

    // Step 4: Process audio files
    logger.info("All validations passed - starting audio processing");
    const result = await combineAudioFiles(
      audioSequence,
      outputFilePath,
      PATH_PROJECT_RESOURCES,
    );

    // Step 5: Report results
    logger.info("=== Processing Complete ===");
    logger.info(`Output file: ${result.outputPath}`);
    logger.info(
      `Audio length: ${result.audioLengthSeconds.toFixed(2)} seconds`,
    );

    console.log("\n=== Success ===");
    console.log(`Output file: ${result.outputPath}`);
    console.log(
      `Audio length: ${result.audioLengthSeconds.toFixed(2)} seconds`,
    );

    // Allow logs to flush
    await new Promise((resolve) => setTimeout(resolve, 100));
    process.exit(0);
  } catch (error) {
    const errorMsg = `Unexpected error: ${(error as Error).message}`;
    logger.error(errorMsg);
    logger.error((error as Error).stack || "");
    console.error(`FATAL ERROR: ${errorMsg}`);

    // Allow logs to flush before exit
    await new Promise((resolve) => setTimeout(resolve, 100));
    process.exit(1);
  }
})();
