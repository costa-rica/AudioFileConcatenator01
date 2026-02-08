import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import logger from "../modules/logger";
import { AudioSequenceStep, ProcessingResult } from "../types";

// Using system FFmpeg (must be installed via package manager)
// Mac: brew install ffmpeg
// Ubuntu: sudo apt-get install ffmpeg

/**
 * Generate a silent audio file with the specified duration
 */
async function generateSilence(
  durationSeconds: number,
  outputPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    logger.info(`Generating ${durationSeconds}s silence: ${outputPath}`);

    ffmpeg()
      .input("anullsrc=r=44100:cl=stereo")
      .inputFormat("lavfi")
      .duration(durationSeconds)
      .audioCodec("libmp3lame")
      .audioBitrate("128k")
      .output(outputPath)
      .on("end", () => {
        logger.info(`Silence generated: ${outputPath}`);
        resolve();
      })
      .on("error", (err) => {
        logger.error(`Error generating silence: ${err.message}`);
        reject(err);
      })
      .run();
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
