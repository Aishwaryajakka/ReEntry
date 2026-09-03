import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Footprints } from 'lucide-react-native';
import { Pedometer } from 'expo-sensors';

import { SectionCard } from './SectionCard';
import { PrimaryButton, SecondaryButton } from './Buttons';
import { LabelText, MicroText, SubheadingText } from './Typography';
import { useThemeColors } from '@/lib/theme';

type DeviceActivityState = 'checking' | 'unavailable' | 'needs-permission' | 'active' | 'declined' | 'denied';

export function DeviceActivityCard({ scheduledClassCount }: { scheduledClassCount: number }) {
  const theme = useThemeColors();
  const [state, setState] = useState<DeviceActivityState>('checking');
  const [steps, setSteps] = useState(0);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    let mounted = true;
    let subscription: ReturnType<typeof Pedometer.watchStepCount> | null = null;

    const start = async () => {
      if (state === 'declined') return;
      try {
        const available = await Pedometer.isAvailableAsync();
        if (!mounted) return;
        if (!available) {
          setState('unavailable');
          return;
        }

        const permission = await Pedometer.getPermissionsAsync();
        if (!mounted) return;
        if (!permission.granted) {
          setState(permission.canAskAgain ? 'needs-permission' : 'denied');
          return;
        }

        setState('active');
        subscription = Pedometer.watchStepCount((result) => {
          if (mounted) setSteps(result.steps);
        });
      } catch {
        if (mounted) setState('unavailable');
      }
    };

    void start();
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [state]);

  const requestPermission = async () => {
    setRequesting(true);
    try {
      const permission = await Pedometer.requestPermissionsAsync();
      setState(permission.granted ? 'active' : permission.canAskAgain ? 'needs-permission' : 'denied');
    } catch {
      setState('unavailable');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <SectionCard className="mb-5">
      <View className="mb-2 flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: theme.mossLight }}>
          <Footprints size={20} color={theme.foreground} />
        </View>
        <View className="flex-1">
          <SubheadingText>Device Activity</SubheadingText>
          <MicroText className="text-muted-foreground">Optional activity context</MicroText>
        </View>
      </View>

      {state === 'checking' ? <LabelText className="text-muted-foreground">Checking device availability…</LabelText> : null}

      {state === 'active' ? (
        <View>
          <Text className="mt-2 text-2xl font-bold text-foreground">{steps.toLocaleString()} steps</Text>
          <MicroText className="mt-1 text-muted-foreground">Counted while this screen is active on this device.</MicroText>
          <LabelText className="mt-3 text-foreground">{scheduledClassCount} scheduled class{scheduledClassCount === 1 ? '' : 'es'} today</LabelText>
          <MicroText className="mt-3 leading-5 text-muted-foreground">Context only — not a measure of concussion recovery.</MicroText>
        </View>
      ) : null}

      {state === 'needs-permission' ? (
        <View>
          <LabelText className="mt-2 leading-5 text-foreground">Add activity context from this device</LabelText>
          <MicroText className="mt-1 leading-5 text-muted-foreground">ReEntry can use step count to add context to your day. This does not measure concussion recovery.</MicroText>
          <View className="mt-3 flex-row gap-2">
            <PrimaryButton label="Allow" onPress={requestPermission} loading={requesting} disabled={requesting} className="flex-1" />
            <SecondaryButton label="Not now" onPress={() => setState('declined')} disabled={requesting} className="flex-1" />
          </View>
        </View>
      ) : null}

      {state === 'declined' ? <MicroText className="mt-2 leading-5 text-muted-foreground">Step context is off for this session.</MicroText> : null}
      {state === 'denied' ? <MicroText className="mt-2 leading-5 text-muted-foreground">Step permission is not enabled for ReEntry.</MicroText> : null}
      {state === 'unavailable' ? <MicroText className="mt-2 leading-5 text-muted-foreground">Step data unavailable on this device.</MicroText> : null}

      <MicroText className="mt-3 leading-5 text-muted-foreground">No location is collected. Step context is not shared with school staff or clinicians, and it is not used for automatic medical interpretation or contact.</MicroText>
    </SectionCard>
  );
}
