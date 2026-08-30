/**
 * ReEntry icon library.
 *
 * All functional / category icons are rendered as SVG vectors.
 * Uses lucide-react-native for standard line icons and a small set of
 * original inline SVG icons for ReEntry-specific concepts (flask, school, etc.).
 */

import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { SvgProps } from 'react-native-svg';
import {
  Sun,
  Activity,
  Map,
  BookOpen,
  User,
  Plus,
  X,
  Shield,
  Calendar,
  Info,
  Eye,
  EyeOff,
  Brain,
  Volume2,
  Monitor,
  Lock,
  Settings,
} from 'lucide-react-native';

export {
  Sun,
  Activity,
  Map,
  BookOpen,
  User,
  Plus,
  X,
  Shield,
  Calendar,
  Info,
  Eye,
  EyeOff,
  Brain,
  Volume2,
  Monitor,
  Lock,
  Settings,
};

import { useAppContext } from '@/context/AppContext';
import { COLORS, useThemeColors } from '@/lib/theme';

interface IconWrapperProps {
  size?: number;
  color?: string;
  children: React.ReactNode;
}

const STROKE = 1.75;

/** Wraps inline SVG icons to give them a consistent viewBox and props contract */
const IconWrapper: React.FC<IconWrapperProps> = ({ size = 24, color = COLORS.forest, children }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
};

/** Reading = open book */
export const ReadingIcon: React.FC<SvgProps> = ({ width = 24, height = 24, color = COLORS.forest }) => (
  <IconWrapper size={Number(width)} color={color as string}>
    <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </IconWrapper>
);

/** Screens = laptop/display */
export const ScreensIcon: React.FC<SvgProps> = ({ width = 24, height = 24, color = COLORS.forest }) => (
  <IconWrapper size={Number(width)} color={color as string}>
    <Rect x="2" y="3" width="20" height="14" rx="2" />
    <Path d="M8 21h8" />
    <Path d="M12 17v4" />
  </IconWrapper>
);

/** School = building with flag */
export const SchoolIcon: React.FC<SvgProps> = ({ width = 24, height = 24, color = COLORS.forest }) => (
  <IconWrapper size={Number(width)} color={color as string}>
    <Path d="M4 21V9l8-5 8 5v12" />
    <Path d="M9 21v-6h6v6" />
    <Path d="M12 4v1" />
  </IconWrapper>
);

/** Noise = speaker with sound waves */
export const NoiseIcon: React.FC<SvgProps> = ({ width = 24, height = 24, color = COLORS.forest }) => (
  <IconWrapper size={Number(width)} color={color as string}>
    <Path d="M11 5 6 9H2v6h4l5 4V5z" />
    <Path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <Path d="M18.36 5.64a9 9 0 0 1 0 12.72" />
  </IconWrapper>
);

/** Concentration = target with focus rings */
export const ConcentrationIcon: React.FC<SvgProps> = ({ width = 24, height = 24, color = COLORS.forest }) => (
  <IconWrapper size={Number(width)} color={color as string}>
    <Circle cx="12" cy="12" r="10" />
    <Circle cx="12" cy="12" r="6" />
    <Circle cx="12" cy="12" r="2" />
  </IconWrapper>
);

/** Physical activity = walking figure */
export const PhysicalActivityIcon: React.FC<SvgProps> = ({ width = 24, height = 24, color = COLORS.forest }) => (
  <IconWrapper size={Number(width)} color={color as string}>
    <Circle cx="12" cy="5" r="2" />
    <Path d="M13 8l3 4" />
    <Path d="M11 8l-4 4" />
    <Path d="M9 12l2 7" />
    <Path d="M15 12l-2 7" />
  </IconWrapper>
);

/** Chemistry = flask */
export const FlaskIcon: React.FC<SvgProps> = ({ width = 24, height = 24, color = COLORS.forest }) => (
  <IconWrapper size={Number(width)} color={color as string}>
    <Path d="M10 2h4" />
    <Path d="M11 2v7.5L6 20h12l-5-10.5V2" />
    <Path d="M8 16h8" />
  </IconWrapper>
);

/** People = cafeteria/social */
export const PeopleIcon: React.FC<SvgProps> = ({ width = 24, height = 24, color = COLORS.forest }) => (
  <IconWrapper size={Number(width)} color={color as string}>
    <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <Circle cx="9" cy="7" r="4" />
    <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </IconWrapper>
);

/** Transit = bus */
export const BusIcon: React.FC<SvgProps> = ({ width = 24, height = 24, color = COLORS.forest }) => (
  <IconWrapper size={Number(width)} color={color as string}>
    <Rect x="3" y="5" width="18" height="13" rx="2" />
    <Path d="M6 5v-2" />
    <Path d="M18 5v-2" />
    <Circle cx="7" cy="15" r="1.5" />
    <Circle cx="17" cy="15" r="1.5" />
    <Path d="M7 11h10" />
  </IconWrapper>
);

/** Homework = pencil on document */
export const HomeworkIcon: React.FC<SvgProps> = ({ width = 24, height = 24, color = COLORS.forest }) => (
  <IconWrapper size={Number(width)} color={color as string}>
    <Path d="M13.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L13.5 2z" />
    <Path d="M13 2v6h6" />
    <Path d="M16 13l-6 6" />
    <Path d="M9 17l2 2" />
  </IconWrapper>
);

/** Inline SVG category icon chooser */
export const CategoryIcon: React.FC<{ category: string; size?: number; color?: string }> = ({
  category,
  size = 24,
  color = COLORS.forest,
}) => {
  const { lowStimulationMode } = useAppContext();
  const theme = useThemeColors();
  const safeColor = lowStimulationMode ? theme.foreground : color;

  switch (category) {
    case 'Reading':
      return <ReadingIcon width={size} height={size} color={safeColor} />;
    case 'Screens':
      return <ScreensIcon width={size} height={size} color={safeColor} />;
    case 'Class':
    case 'Class / School':
      return <SchoolIcon width={size} height={size} color={safeColor} />;
    case 'Noise':
    case 'Noise/busy environment':
      return <NoiseIcon width={size} height={size} color={safeColor} />;
    case 'Concentration':
      return <ConcentrationIcon width={size} height={size} color={safeColor} />;
    case 'Other':
      return <Activity size={size} color={safeColor} />;
    case 'Physical activity':
      return <PhysicalActivityIcon width={size} height={size} color={safeColor} />;
    case 'Chemistry':
      return <FlaskIcon width={size} height={size} color={safeColor} />;
    case 'Social activity':
      return <PeopleIcon width={size} height={size} color={safeColor} />;
    case 'Transportation':
      return <BusIcon width={size} height={size} color={safeColor} />;
    case 'Homework':
      return <HomeworkIcon width={size} height={size} color={safeColor} />;
    default:
      return <Activity size={size} color={safeColor} />;
  }
};

/** Small decorative botanical leaf — inline SVG line art, used sparingly. */
export const BotanicalLeafIcon: React.FC<SvgProps> = ({ width = 24, height = 24, color = COLORS.forest }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 2c-3 3-4 7-4 11 0 4 2 7 4 7s4-3 4-7c0-4-1-8-4-11z" />
    <Path d="M12 22V10" />
  </Svg>
);

/** Original inline SVG botanical linework for hero surfaces (Today, Pass). */
export const HeroBotanical: React.FC<SvgProps> = ({ width = 120, height = 120, color = COLORS.forest }) => (
  <Svg width={width} height={height} viewBox="0 0 120 120" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M100 20c-12 8-20 22-20 38 0 16 8 28 20 34" opacity={0.5} />
    <Path d="M92 36c-8 6-12 16-12 26 0 10 4 18 12 22" opacity={0.4} />
    <Path d="M105 50c-6 4-10 12-10 20 0 8 4 14 10 18" opacity={0.3} />
    <Path d="M82 70c-10 2-18 8-22 16" opacity={0.35} />
    <Path d="M70 90c-8 4-12 10-14 16" opacity={0.25} />
    <Path d="M100 60c-18 0-32 10-40 24" opacity={0.35} />
    <Path d="M85 95c-6 8-10 16-12 22" opacity={0.2} />
    <Path d="M60 110c-4 2-8 4-12 6" opacity={0.2} />
  </Svg>
);
