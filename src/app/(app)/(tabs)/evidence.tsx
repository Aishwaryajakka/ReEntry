import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

import { SecondaryButton } from '@/components/Buttons';
import { ReEntryWordmark } from '@/components/ReEntryWordmark';
import { ScreenShell } from '@/components/ScreenShell';
import { SectionCard } from '@/components/SectionCard';
import { HeadingText, LabelText, MicroText, SubheadingText } from '@/components/Typography';
import { useThemeColors } from '@/lib/theme';

const DESIGN_PRINCIPLES = [
  'Gradual return to school and everyday activity',
  'Monitoring how activities are tolerated over time',
  'Temporary school accommodations and supports when appropriate',
  'Collaboration between students, schools, caregivers, and healthcare professionals',
  'Responsible technology that supports — not replaces — clinical judgment',
];

const GUIDELINES = [
  '6th International Consensus Statement on Concussion in Sport',
  'Living Concussion Guidelines',
  'PedsConcussion Living Guideline',
];

const FEATURE_PRINCIPLES = [
  ['Activity logging', 'Supports ongoing monitoring of functional tolerance.'],
  ['Observation window', 'Makes change across recorded activities visible over time.'],
  ['ReEntry Pass', 'Supports communication of recorded school accommodations.'],
  ['Clinician review', 'Keeps interpretation and accommodation decisions with a human professional.'],
  ['School privacy boundary', 'Limits school access to minimum-necessary support information.'],
] as const;

function NumberedPrinciple({ index, text }: { index: number; text: string }) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="h-7 w-7 items-center justify-center rounded-full bg-accent">
        <Text className="text-sm font-bold text-accent-foreground">{index + 1}</Text>
      </View>
      <LabelText className="flex-1 pt-1 leading-5">{text}</LabelText>
    </View>
  );
}

export default function EvidenceDesignScreen() {
  const router = useRouter();
  const theme = useThemeColors();

  return (
    <ScreenShell>
      <SecondaryButton
        label="Back"
        onPress={() => router.back()}
        className="mb-5 self-start px-4"
        iconLeft={<ChevronLeft size={20} color={theme.foreground} />}
        accessibilityLabel="Back to Profile"
      />

      <ReEntryWordmark className="mb-6" />
      <HeadingText className="mb-2">How ReEntry is designed</HeadingText>
      <LabelText className="mb-5 leading-5 text-muted-foreground">
        ReEntry is designed to make recorded experiences easier to understand and share while keeping people responsible for care decisions.
      </LabelText>

      <SectionCard className="mb-4 gap-4">
        {DESIGN_PRINCIPLES.map((principle, index) => (
          <NumberedPrinciple key={principle} index={index} text={principle} />
        ))}
      </SectionCard>

      <SubheadingText className="mb-3">Guidance informing the approach</SubheadingText>
      <SectionCard className="mb-4">
        <LabelText className="mb-4 leading-5">
          ReEntry's return-to-school approach is informed by current concussion guidance emphasizing gradual return to activity, school accommodations, ongoing monitoring, and collaboration.
        </LabelText>
        <View className="gap-3">
          {GUIDELINES.map((guideline) => (
            <View key={guideline} className="rounded-xl bg-muted px-3 py-3">
              <Text className="text-sm font-semibold text-foreground">{guideline}</Text>
            </View>
          ))}
        </View>
        <MicroText className="mt-4 leading-5 text-muted-foreground">
          These references inform the product approach; they do not represent formal endorsement of ReEntry.
        </MicroText>
      </SectionCard>

      <SubheadingText className="mb-3">How features support these principles</SubheadingText>
      <SectionCard className="mb-4 gap-4">
        {FEATURE_PRINCIPLES.map(([feature, explanation]) => (
          <View key={feature}>
            <Text className="mb-1 text-sm font-semibold text-foreground">{feature}</Text>
            <LabelText className="leading-5">{explanation}</LabelText>
          </View>
        ))}
        <MicroText className="leading-5 text-muted-foreground">
          Recording an activity supports observation; it is not itself treatment.
        </MicroText>
      </SectionCard>

      <SubheadingText className="mb-3">How AI is used</SubheadingText>
      <SectionCard className="mb-4">
        <LabelText className="mb-3 leading-5">
          ReEntry's personalized model analyzes only the student's own recorded activities and identifies associations in those records.
        </LabelText>
        <View className="gap-2">
          <LabelText className="leading-5">• It does not diagnose.</LabelText>
          <LabelText className="leading-5">• It does not predict recovery.</LabelText>
          <LabelText className="leading-5">• It does not prescribe accommodations.</LabelText>
          <LabelText className="leading-5">
            • Clinicians remain responsible for interpreting evidence and documenting supports.
          </LabelText>
        </View>
      </SectionCard>

      <SectionCard className="mb-4 border-l-4 border-l-accent">
        <Text className="mb-1 text-base font-semibold text-foreground">A support tool</Text>
        <LabelText className="leading-5">
          ReEntry is not a medical device and does not replace professional medical care.
        </LabelText>
      </SectionCard>
    </ScreenShell>
  );
}
