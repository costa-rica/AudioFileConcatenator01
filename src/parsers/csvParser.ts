import fs from 'fs';
import csv from 'csv-parser';
import logger from '../config/logger';
import { AudioSequenceStep } from '../types';

export async function parseAudioSequenceCSV(
  csvPath: string
): Promise<AudioSequenceStep[]> {
  logger.info(`Parsing CSV file: ${csvPath}`);

  return new Promise((resolve, reject) => {
    const results: AudioSequenceStep[] = [];

    if (!fs.existsSync(csvPath)) {
      const error = `CSV file not found: ${csvPath}`;
      logger.error(error);
      reject(new Error(error));
      return;
    }

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row: any) => {
        const step: AudioSequenceStep = {
          id: row.id,
        };

        // Either audio_file_name_and_path or pause_duration should be populated
        if (row.audio_file_name_and_path && row.audio_file_name_and_path.trim()) {
          step.audio_file_name_and_path = row.audio_file_name_and_path.trim();
        }

        if (row.pause_duration && row.pause_duration.trim()) {
          step.pause_duration = parseFloat(row.pause_duration);

          if (isNaN(step.pause_duration)) {
            logger.warn(
              `Invalid pause_duration for step ${row.id}: ${row.pause_duration}`
            );
            step.pause_duration = undefined;
          }
        }

        results.push(step);
      })
      .on('error', (error) => {
        logger.error(`Error parsing CSV file: ${error.message}`);
        reject(error);
      })
      .on('end', () => {
        logger.info(`Successfully parsed ${results.length} steps from CSV`);
        resolve(results);
      });
  });
}
