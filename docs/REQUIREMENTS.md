# Requirements: Morning Meditation Mantra 01

## Objective

Use existing .mp3 audio files to create a single mp3 file that combines the audio files in a seamless way and includes pauses between the audio files. The pauses will be paramaterized. The audio files used in the final mp3 will be selected based on a parameter.

## Overview

This will be a TypeScript micro service that stores all the code in a src/ folder.
This micro service will peice together the audio files to create a single mp3 file. There will be a csv file that contains directions for the audio files to be combined. The csv file will have the following columns: id, audio_file_name_and_path, pause_duration. Each line will be a step in the sequence of the resulting audio file. Either the audio_file_name_and_path or the pause_duration will be populated, but not both. The audio_file_name_and_path will be a path to an existing .mp3 file. The pause_duration will be a number of seconds.

There will be a .env file in the root of the project. The .env file will contain the following variables:

```env
NAME_APP=MorningMeditationMantra01
NODE_ENV=development
PATH_AND_FILENAME_AUDIO_CSV_FILE=/Users/nick/Documents/_project_resources/MorningMeditationMantra/audio_sequence.csv
PATH_TO_LOGS=/Users/nick/Documents/_logs
```

This will be the first version of the micro service. We want the code structure to be modular so that different steps in the processing can be modified without breaking the rest of the code. There will be a main.ts file that will be the entry point to the application. The audio files will be processed using functions in a src/audio_processing folder.

This micro service will eventually be triggered to run on a server by an ExpressJS API.

## Logging

see the docs/LOGGING_NODE_JS_V06.md file for logging requirements.
