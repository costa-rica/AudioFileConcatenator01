export interface AudioSequenceStep {
  id: string;
  audio_file_name_and_path?: string;
  pause_duration?: number;
}

export interface ProcessingResult {
  outputPath: string;
  audioLengthSeconds: number;
}
