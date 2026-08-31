import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { Platform } from 'react-native';

export { useSpeechRecognitionEvent };
export type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';

export function isSpeechRecognitionAvailable(): boolean {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return false;
    const browserWindow = window as typeof window & {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    return Boolean(browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition);
  }
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
}

export async function requestSpeechRecognitionPermission(): Promise<boolean> {
  const response = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  return response.granted;
}

export function startSpeechRecognition(): void {
  ExpoSpeechRecognitionModule.start({
    lang: 'en-US',
    interimResults: true,
    continuous: false,
  });
}

export function stopSpeechRecognition(): void {
  ExpoSpeechRecognitionModule.stop();
}

export function cancelSpeechRecognition(): void {
  ExpoSpeechRecognitionModule.abort();
}
