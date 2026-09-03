import { Mic, Square } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useReducedExperience } from '@/lib/accessibility';
import {
  cancelSpeechRecognition,
  type ExpoSpeechRecognitionErrorEvent,
  type ExpoSpeechRecognitionResultEvent,
  isSpeechRecognitionAvailable,
  requestSpeechRecognitionPermission,
  startSpeechRecognition,
  stopSpeechRecognition,
  useSpeechRecognitionEvent,
} from '@/lib/speechRecognition';
import { useThemeColors } from '@/lib/theme';
import { cn } from '@/lib/utils';
import {
  parseVoiceActivity,
  type VoiceActivityContext,
  type VoiceActivityDraft,
} from '@/lib/voiceActivityParser';
import { PrimaryButton, SecondaryButton } from './Buttons';
import { CloseButton } from './CloseButton';
import { LabelText, MicroText, SubheadingText } from './Typography';

type CaptureState =
  | 'idle'
  | 'requesting-permission'
  | 'listening'
  | 'processing'
  | 'draft-ready'
  | 'permission-denied'
  | 'unavailable'
  | 'no-speech'
  | 'error'
  | 'typed-fallback';

interface VoiceActivityCaptureProps {
  visible: boolean;
  onClose: () => void;
  onDraftReady: (draft: VoiceActivityDraft, transcript: string) => void;
  context?: VoiceActivityContext;
}

function errorState(event: ExpoSpeechRecognitionErrorEvent): CaptureState {
  if (event.error === 'not-allowed') return 'permission-denied';
  if (event.error === 'no-speech' || event.error === 'speech-timeout') return 'no-speech';
  if (event.error === 'service-not-allowed' || event.error === 'language-not-supported') return 'unavailable';
  return 'error';
}

export function VoiceActivityCapture({
  visible,
  onClose,
  onDraftReady,
  context,
}: VoiceActivityCaptureProps) {
  const theme = useThemeColors();
  const { isDark } = useTheme();
  const { reduced } = useReducedExperience();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [state, setState] = useState<CaptureState>('idle');
  const [transcript, setTranscript] = useState('');
  const [typedText, setTypedText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const finalReceived = useRef(false);
  const closing = useRef(false);

  const createDraft = useCallback((text: string) => {
    const cleaned = text.trim();
    if (!cleaned) {
      setState('no-speech');
      return;
    }
    setState('processing');
    const draft = parseVoiceActivity(cleaned, context);
    setState('draft-ready');
    onDraftReady(draft, cleaned);
  }, [context, onDraftReady]);

  useSpeechRecognitionEvent('start', () => setState('listening'));
  useSpeechRecognitionEvent('result', (event: ExpoSpeechRecognitionResultEvent) => {
    const nextTranscript = event.results[0]?.transcript?.trim() ?? '';
    if (nextTranscript) setTranscript(nextTranscript);
    if (event.isFinal && nextTranscript) {
      finalReceived.current = true;
      createDraft(nextTranscript);
    }
  });
  useSpeechRecognitionEvent('error', (event: ExpoSpeechRecognitionErrorEvent) => {
    if (event.error === 'aborted' && closing.current) return;
    setErrorMessage(event.message || 'Speech recognition could not continue.');
    setState(errorState(event));
  });
  useSpeechRecognitionEvent('end', () => {
    if (!closing.current && !finalReceived.current) setState('no-speech');
  });

  useEffect(() => {
    if (!visible) {
      setState('idle');
      setTranscript('');
      setTypedText('');
      setErrorMessage('');
      finalReceived.current = false;
      closing.current = false;
    }
  }, [visible]);

  const startListening = useCallback(async () => {
    setErrorMessage('');
    setTranscript('');
    finalReceived.current = false;
    closing.current = false;
    if (!isSpeechRecognitionAvailable()) {
      setState('unavailable');
      return;
    }
    try {
      setState('requesting-permission');
      if (!(await requestSpeechRecognitionPermission())) {
        setState('permission-denied');
        return;
      }
      startSpeechRecognition();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Speech recognition could not start.');
      setState('error');
    }
  }, []);

  const close = useCallback(() => {
    closing.current = true;
    if (state === 'listening') cancelSpeechRecognition();
    onClose();
  }, [onClose, state]);

  const stop = useCallback(() => {
    if (state === 'listening') {
      setState('processing');
      stopSpeechRecognition();
    }
  }, [state]);

  const showTypedFallback = state === 'typed-fallback' || state === 'unavailable' || state === 'permission-denied';

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduced ? 'fade' : 'slide'}
      onRequestClose={close}
      statusBarTranslucent
    >
      <View className={cn('flex-1 justify-end', isDark && 'dark')}>
        <Pressable
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close voice capture"
        />
        <KeyboardAvoidingView
          behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end"
          pointerEvents="box-none"
        >
          <View
            className="bg-card w-full max-w-[680px] self-center rounded-t-3xl"
            style={{ height: Math.min(windowHeight * 0.72, windowHeight - insets.top - 12), minHeight: 320, paddingBottom: insets.bottom }}
          >
            <ScrollView
              contentContainerClassName="p-6"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <View className="mb-2 flex-row items-center justify-between">
              <SubheadingText>Log with voice</SubheadingText>
              <CloseButton onPress={close} />
            </View>
            <LabelText className="mb-5 leading-5 text-muted-foreground">
              Describe what you did, how long it lasted, and how manageable it felt. You will review everything before it is logged.
            </LabelText>

            {(state === 'idle' || state === 'requesting-permission') && (
              <>
                <PrimaryButton
                  label={state === 'requesting-permission' ? 'Requesting permission…' : 'Start listening'}
                  onPress={startListening}
                  disabled={state === 'requesting-permission'}
                  iconLeft={<Mic size={20} color={isDark || state === 'requesting-permission' ? theme.deepForest : theme.warmWhite} />}
                  className="mb-3 w-full"
                />
                <SecondaryButton label="Type instead" onPress={() => setState('typed-fallback')} className="w-full" />
              </>
            )}

            {state === 'listening' && (
              <View className="items-center rounded-2xl border border-border bg-background p-5">
                <Mic size={28} color={theme.accent} />
                <Text className="mt-2 text-lg font-semibold text-foreground">Listening…</Text>
                <LabelText className="mb-4 mt-1 text-center text-muted-foreground">
                  {transcript || 'Speak naturally. ReEntry will not save until you confirm.'}
                </LabelText>
                <PrimaryButton label="Stop listening" onPress={stop} iconLeft={<Square size={18} color={isDark ? theme.deepForest : theme.warmWhite} />} className="w-full" />
              </View>
            )}

            {state === 'processing' && (
              <View className="rounded-2xl border border-border bg-background p-5">
                <Text className="text-center text-base font-semibold text-foreground">Preparing your draft…</Text>
              </View>
            )}

            {state === 'no-speech' && (
              <StatusMessage title="No speech detected" body="Try again, or type the same description instead." />
            )}
            {state === 'permission-denied' && (
              <StatusMessage title="Microphone access is off" body="You can enable microphone and speech access in device settings, or type your activity instead." />
            )}
            {state === 'unavailable' && (
              <StatusMessage title="Voice capture is unavailable" body="Speech recognition is not available in this browser or on this device. Typed capture still works." />
            )}
            {state === 'error' && (
              <StatusMessage title="Voice capture stopped" body={errorMessage || 'Please try again or type your activity instead.'} />
            )}

            {(state === 'no-speech' || state === 'error') && (
              <View className="mt-4 gap-3">
                <PrimaryButton label="Try voice again" onPress={startListening} className="w-full" />
                <SecondaryButton label="Type activity instead" onPress={() => setState('typed-fallback')} className="w-full" />
              </View>
            )}

            {showTypedFallback ? (
              <View className="mt-4">
                <LabelText className="mb-2 font-semibold text-foreground">Type your activity</LabelText>
                <TextInput
                  value={typedText}
                  onChangeText={setTypedText}
                  placeholder="Example: Chemistry lasted 50 minutes and felt manageable, but the room was noisy."
                  placeholderTextColor={theme.foregroundMuted}
                  multiline
                  className="mb-3 min-h-[104px] rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground"
                  textAlignVertical="top"
                  accessibilityLabel="Typed activity description"
                />
                <PrimaryButton label="Review activity" onPress={() => createDraft(typedText)} disabled={!typedText.trim()} className="w-full" />
              </View>
            ) : null}

            {state !== 'listening' && state !== 'processing' && state !== 'requesting-permission' && state !== 'idle' && state !== 'no-speech' && state !== 'error' && state !== 'typed-fallback' && (
              <SecondaryButton label="Try voice again" onPress={startListening} className="mt-3 w-full" />
            )}

            <MicroText className="mt-4 text-center leading-5 text-muted-foreground">
              Voice is used only to prepare this draft. ReEntry does not store or upload raw audio.
            </MicroText>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function StatusMessage({ title, body }: { title: string; body: string }) {
  return (
    <View className="rounded-xl border border-border bg-background p-4">
      <Text className="font-semibold text-foreground">{title}</Text>
      <LabelText className="mt-1 leading-5 text-muted-foreground">{body}</LabelText>
    </View>
  );
}
