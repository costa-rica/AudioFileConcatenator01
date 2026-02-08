import ffmpeg from "fluent-ffmpeg";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import logger from "../modules/logger";
import { AudioSequenceStep, ProcessingResult } from "../types";

// Using system FFmpeg (must be installed via package manager)
// Mac: brew install ffmpeg
// Ubuntu: sudo apt-get install ffmpeg

// Explicitly set FFmpeg path to ensure fluent-ffmpeg uses the correct binary
function findAndSetFfmpegPath(): void {
  try {
    // Try to find ffmpeg using 'which' command
    const ffmpegPath = execSync("which ffmpeg", { encoding: "utf-8" }).trim();
    if (ffmpegPath && fs.existsSync(ffmpegPath)) {
      ffmpeg.setFfmpegPath(ffmpegPath);
      logger.info(`Using FFmpeg at: ${ffmpegPath}`);
      return;
    }
  } catch (err) {
    // 'which' command failed, try common paths
    logger.warn("Could not find ffmpeg using 'which', trying common paths");
  }

  // Common FFmpeg installation paths
  const commonPaths = [
    "/opt/homebrew/bin/ffmpeg", // Mac Apple Silicon (Homebrew)
    "/usr/local/bin/ffmpeg", // Mac Intel (Homebrew)
    "/usr/bin/ffmpeg", // Ubuntu/Linux
  ];

  for (const ffmpegPath of commonPaths) {
    if (fs.existsSync(ffmpegPath)) {
      ffmpeg.setFfmpegPath(ffmpegPath);
      logger.info(`Using FFmpeg at: ${ffmpegPath}`);
      return;
    }
  }

  logger.error(
    "Could not find FFmpeg installation. Please install FFmpeg and ensure it's in your PATH.",
  );
  throw new Error("FFmpeg not found");
}

// Initialize FFmpeg path
findAndSetFfmpegPath();

/**
 * Generate a silent audio file with the specified duration
 * Using direct ffmpeg call to avoid fluent-ffmpeg lavfi detection issues
 */
async function generateSilence(
  durationSeconds: number,
  outputPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    logger.info(`Generating ${durationSeconds}s silence: ${outputPath}`);

    try {
      // Get ffmpeg path (should be already set, but get it again to be sure)
      let ffmpegPath = "ffmpeg"; // fallback to PATH
      try {
        ffmpegPath = execSync("which ffmpeg", { encoding: "utf-8" }).trim();
      } catch {
        // Use default if which fails
      }

      // Call ffmpeg directly to generate silence
      const cmd = `${ffmpegPath} -f lavfi -i anullsrc=r=44100:cl=stereo -t ${durationSeconds} -c:a libmp3lame -b:a 128k -y "${outputPath}"`;
      execSync(cmd, { stdio: "pipe" });

      if (fs.existsSync(outputPath)) {
        logger.info(`Silence generated: ${outputPath}`);
        resolve();
      } else {
        throw new Error("Output file was not created");
      }
    } catch (err) {
      const error = err as Error;
      logger.error(`Error generating silence: ${error.message}`);
      reject(error);
    }
  });
}

/**
 * Get the duration of an audio file in seconds
 */
async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        logger.error(`Error probing audio file ${filePath}: ${err.message}`);
        reject(err);
        return;
      }

      const duration = metadata.format.duration || 0;
      resolve(duration);
    });
  });
}

/**
 * Combine audio files with pauses into a single MP3
 */
export async function combineAudioFiles(
  steps: AudioSequenceStep[],
  outputPath: string,
  projectResourcesPath: string,
): Promise<ProcessingResult> {
  logger.info(`Starting audio processing with ${steps.length} steps`);

  // Create temporary_deletable directory for temp files
  const tempDir = path.join(projectResourcesPath, "temporary_deletable");

  // Create the directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    logger.info(`Created temporary directory: ${tempDir}`);
  }

  const concatListPath = path.join(tempDir, "concat-list.txt");

  try {
    // Prepare files for concatenation
    const filesToConcat: string[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      if (step.audio_file_name_and_path) {
        // Add existing audio file
        logger.info(
          `Step ${step.id}: Adding audio file ${step.audio_file_name_and_path}`,
        );
        filesToConcat.push(step.audio_file_name_and_path);
      } else if (step.pause_duration !== undefined && step.pause_duration > 0) {
        // Generate silence for pause
        const silenceFile = path.join(tempDir, `silence-${i}.mp3`);
        await generateSilence(step.pause_duration, silenceFile);
        filesToConcat.push(silenceFile);
      }
    }

    if (filesToConcat.length === 0) {
      throw new Error("No audio files or pauses to process");
    }

    // Create concat list file for FFmpeg
    const concatListContent = filesToConcat
      .map((file) => `file '${file.replace(/'/g, "'\\''")}'`)
      .join("\n");

    fs.writeFileSync(concatListPath, concatListContent);
    logger.info(`Created concat list with ${filesToConcat.length} entries`);

    // Concatenate all files
    await new Promise<void>((resolve, reject) => {
      logger.info(`Concatenating audio files to: ${outputPath}`);

      ffmpeg()
        .input(concatListPath)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .audioCodec("libmp3lame")
        .audioBitrate("128k")
        .audioFrequency(44100)
        .audioChannels(2)
        .output(outputPath)
        .on("end", () => {
          logger.info("Audio concatenation completed successfully");
          resolve();
        })
        .on("error", (err) => {
          logger.error(`Error concatenating audio: ${err.message}`);
          reject(err);
        })
        .run();
    });

    // Get the duration of the final output
    const audioLengthSeconds = await getAudioDuration(outputPath);
    logger.info(
      `Final audio duration: ${audioLengthSeconds.toFixed(2)} seconds`,
    );

    const result: ProcessingResult = {
      outputPath,
      audioLengthSeconds,
    };

    return result;
  } finally {
    // Cleanup temporary_deletable directory and all its contents
    logger.info("Cleaning up temporary directory");
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      logger.info(`Deleted temporary directory: ${tempDir}`);
    }
  }
}
