/**
 * ActivityCard — compact light card for a single activity log.
 * Used on the Today screen. Shows icon, title, duration, observation,
 * compact three-segment tolerance indicator, and text status.
 */

import { Pressable, Text, View } from 'react-native';
import { CategoryIcon } from '@/components/Icons';
import { ToleranceMeter } from '@/components/ToleranceMeter';
import { LabelText, MicroText } from '@/components/Typography';
import { useAppContext } from '@/context/AppContext';
import { TOLERANCE_LABELS } from '@/data/activityCatalog';
import type { ActivityLog } from '@/data/types';
import { useThemeColors } from '@/lib/theme';

interface ActivityCardProps {
  log: ActivityLog;
  onPress?: () => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({ log, onPress }) => {
  const { challengeTags } = useAppContext();
  const theme = useThemeColors();
  const title = log.customLabel ? log.customLabel : log.activityCategory;

  const observation = log.notes
    ? log.notes
    : `${TOLERANCE_LABELS[log.toleranceRating].toLowerCase()} for ${log.durationMinutes} min`;

  return (
    <Pressable
      onPress={onPress}
      className="bg-card rounded-2xl p-4 border border-border mb-3"
      style={{ borderCurve: 'continuous' } as object}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${title} activity, ${log.durationMinutes} minutes, ${TOLERANCE_LABELS[log.toleranceRating]}`}
    >
      <View className="flex-row items-start gap-3">
        <View
          className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${theme.accent}30` }}
        >
          <CategoryIcon category={title} size={20} color={theme.accentForeground} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-0.5">
            <Text className="text-base font-semibold text-foreground">{title}</Text>
            <LabelText>{log.durationMinutes} min</LabelText>
          </View>
          <MicroText className="mb-2 leading-4">{observation}</MicroText>
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <ToleranceMeter rating={log.toleranceRating} scale={3} compact showLabel={false} />
            </View>
            <MicroText className="font-medium text-foreground">
              {TOLERANCE_LABELS[log.toleranceRating]}
            </MicroText>
          </View>
          {log.challengeTagIds.length > 0 && (
            <View className="mt-2 flex-row flex-wrap gap-2">
              {log.challengeTagIds.map((id) => {
                const tag = challengeTags.find((t) => t.id === id);
                if (!tag) return null;
                return (
                  <View
                    key={id}
                    className="border border-border rounded-full px-2.5 py-1"
                  >
                    <MicroText>{tag.label}</MicroText>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};
