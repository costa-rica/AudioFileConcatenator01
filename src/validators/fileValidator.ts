import fs from 'fs';
import logger from '../config/logger';
import { AudioSequenceStep } from '../types';

export function validateAudioFiles(steps: AudioSequenceStep[]): boolean {
  logger.info('Validating audio files existence...');

  const missingFiles: string[] = [];
  const audioSteps = steps.filter(
    (step) => step.audio_file_name_and_path !== undefined
  );

  for (const step of audioSteps) {
    const filePath = step.audio_file_name_and_path!;

    if (!fs.existsSync(filePath)) {
      missingFiles.push(filePath);
      logger.error(`Audio file not found for step ${step.id}: ${filePath}`);
    }
  }

  if (missingFiles.length > 0) {
    logger.error(
      `Validation failed: ${missingFiles.length} audio file(s) not found`
    );
    return false;
  }

  logger.info(`All ${audioSteps.length} audio files validated successfully`);
  return true;
}

export function validateOutputDirectory(outputDir: string): boolean {
  logger.info(`Validating output directory: ${outputDir}`);

  if (!fs.existsSync(outputDir)) {
    logger.error(`Output directory does not exist: ${outputDir}`);
    return false;
  }

  // Check if it's actually a directory
  if (!fs.statSync(outputDir).isDirectory()) {
    logger.error(`Output path is not a directory: ${outputDir}`);
    return false;
  }

  // Check if directory is writable
  try {
    fs.accessSync(outputDir, fs.constants.W_OK);
    logger.info(`Output directory validated successfully: ${outputDir}`);
    return true;
  } catch (error) {
    logger.error(`Output directory is not writable: ${outputDir}`);
    return false;
  }
}
