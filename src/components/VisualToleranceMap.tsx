import { Pressable, ScrollView, Text, View } from 'react-native';
import { MicroText } from './Typography';
import type { ToleranceCellState, ToleranceDimension, ToleranceDimensionId } from '@/lib/toleranceMap';
import { COLORS, useThemeColors } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';

const LABEL_WIDTH = 124;
const CELL_SIZE = 58;

function dateHeader(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
}

function compactState(state: ToleranceDimension['state']): string {
  return state.replace(' in recent records', '');
}

const LEGEND_STATES: ToleranceCellState[] = ['Manageable', 'Some difficulty', 'Very difficult', 'No record'];

function StateCircle({ state, color }: { state: ToleranceCellState; color: string }) {
  if (state === 'Manageable') {
    return <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: color }} />;
  }

  if (state === 'Some difficulty') {
    return (
      <View style={{ width: 18, height: 18, borderRadius: 9, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 9, backgroundColor: color }} />
        <View style={{ position: 'absolute', left: 0, top: 0, width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: color }} />
      </View>
    );
  }

  if (state === 'Very difficult') {
    return (
      <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }} />
      </View>
    );
  }

  return <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: color }} />;
}

export function VisualToleranceMap({ dimensions, recordedDates, selectedId, selectedDate, onSelect, lowStimulation }: {
  dimensions: ToleranceDimension[];
  recordedDates: string[];
  selectedId: ToleranceDimensionId;
  selectedDate: string | null;
  onSelect: (id: ToleranceDimensionId, date: string | null) => void;
  lowStimulation: boolean;
}) {
  const theme = useThemeColors();
  const { isDark } = useTheme();

  return (
    <View>
      <MicroText className="mb-3 font-semibold uppercase tracking-[0.12em] text-muted-foreground">Recent recorded days</MicroText>

      <View className="overflow-hidden rounded-2xl border border-border bg-background">
        <View className="w-full flex-row">
          <View style={{ width: LABEL_WIDTH, flexShrink: 0 }}>
            <View className="h-10 justify-end border-b border-border px-2 py-2">
              <MicroText className="font-semibold text-muted-foreground">Functional area</MicroText>
            </View>
            {dimensions.map((dimension, rowIndex) => {
              const rowSelected = dimension.id === selectedId;
              return (
              <Pressable
                key={dimension.id}
                onPress={() => onSelect(dimension.id, null)}
                style={{ height: 78, backgroundColor: rowSelected ? `${COLORS.brightYellow}05` : 'transparent' }}
                className={cn('justify-center px-2 py-2', rowIndex > 0 && 'border-t border-border')}
                accessibilityRole="button"
                accessibilityState={{ selected: rowSelected && selectedDate === null }}
                accessibilityLabel={`${dimension.label}: ${dimension.state}, ${dimension.supportCount} supporting records`}
              >
                {rowSelected ? <View pointerEvents="none" className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full bg-accent" /> : null}
                <Text className="text-sm font-semibold text-foreground" numberOfLines={2}>{dimension.label}</Text>
                <MicroText className="mt-1 leading-4 text-muted-foreground">{compactState(dimension.state)} · {dimension.supportCount} record{dimension.supportCount === 1 ? '' : 's'}</MicroText>
              </Pressable>
              );
            })}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            style={{ flex: 1, minWidth: 0 }}
            contentContainerStyle={{ width: Math.max(recordedDates.length * CELL_SIZE, 190) }}
          >
            <View>
              <View className="h-10 flex-row border-b border-border">
                {recordedDates.length > 0 ? recordedDates.map((date) => (
                  <View key={date} style={{ width: CELL_SIZE }} className="items-center justify-end px-1 py-2">
                    <MicroText className="text-center font-semibold text-foreground">{dateHeader(date)}</MicroText>
                  </View>
                )) : (
                  <View className="w-[190px] justify-center px-3"><MicroText className="text-muted-foreground">No recorded days yet</MicroText></View>
                )}
              </View>
              {dimensions.map((dimension, rowIndex) => {
                const rowSelected = dimension.id === selectedId;
                return (
                  <View key={dimension.id} className={cn('h-[78px] flex-row', rowIndex > 0 && 'border-t border-border')} style={{ backgroundColor: rowSelected ? `${COLORS.brightYellow}05` : 'transparent' }}>
                    {dimension.cells.map((cell) => {
                      const selected = rowSelected && selectedDate === cell.date;
                      const colors = cellColors(cell.state, theme, isDark, lowStimulation);
                      return (
                        <Pressable
                          key={cell.date}
                          onPress={() => onSelect(dimension.id, cell.date)}
                          style={{ width: 44, height: 44, marginHorizontal: 7, marginVertical: 17, borderColor: selected ? COLORS.turmeric : colors.border, borderWidth: selected ? 2.5 : 1, backgroundColor: colors.background }}
                          className="items-center justify-center rounded-xl"
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          accessibilityLabel={`${dimension.label}, ${dateHeader(cell.date)}: ${cell.state}, ${cell.supportingActivities.length} supporting activities`}
                        >
                          <StateCircle state={cell.state} color={colors.symbol} />
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-2">
        {LEGEND_STATES.map((state) => {
          const colors = cellColors(state, theme, isDark, lowStimulation);
          return (
            <View key={state} className="flex-row items-center gap-1.5">
              <StateCircle state={state} color={colors.symbol} />
              <MicroText className="text-muted-foreground">{state}</MicroText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function cellColors(state: ToleranceCellState, theme: ReturnType<typeof useThemeColors>, isDark: boolean, lowStimulation: boolean) {
  const backgroundAlpha = lowStimulation ? '05' : isDark ? '12' : '0D';

  if (state === 'Manageable') {
    const symbol = isDark ? '#9CAF94' : '#53694F';
    return { background: `${symbol}${backgroundAlpha}`, border: `${symbol}45`, symbol };
  }
  if (state === 'Some difficulty') {
    const symbol = isDark ? '#DDB15C' : '#C58E35';
    return { background: `${symbol}${backgroundAlpha}`, border: `${symbol}45`, symbol };
  }
  if (state === 'Very difficult') {
    const symbol = isDark ? '#C88B43' : '#9C642D';
    return { background: `${symbol}${backgroundAlpha}`, border: `${symbol}55`, symbol };
  }
  return { background: 'transparent', border: theme.border, symbol: isDark ? '#A8AB9B' : '#8A8D7C' };
}
