import { Tabs } from 'expo-router';
import { Sun, Activity, Map, BookOpen, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import { COLORS } from '@/lib/theme';

export default function TabsLayout() {
  const { isDark } = useTheme();
  const { lowStimulationMode } = useAppContext();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      initialRouteName="today"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.brightYellow,
        tabBarActiveBackgroundColor: COLORS.forest,
        tabBarInactiveTintColor: isDark ? COLORS.linen : COLORS.moss,
        tabBarStyle: {
          backgroundColor: isDark ? COLORS.deepForest : COLORS.moon,
          borderTopWidth: 0,
          paddingTop: 4,
          paddingBottom: insets.bottom + 4,
          height: 64 + insets.bottom,
          shadowColor: lowStimulationMode ? 'transparent' : '#344431',
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: lowStimulationMode ? 0 : 0.05,
          shadowRadius: lowStimulationMode ? 0 : 4,
          elevation: lowStimulationMode ? 0 : 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          lineHeight: 12,
          marginBottom: 0,
        },
        tabBarItemStyle: {
          borderRadius: 10,
          marginHorizontal: 3,
          marginVertical: 3,
          overflow: 'hidden',
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size, focused }) => (
            <Sun size={size} color={focused ? COLORS.brightYellow : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tolerance"
        options={{
          title: 'Tolerance',
          tabBarIcon: ({ color, size, focused }) => (
            <Activity size={size} color={focused ? COLORS.brightYellow : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journey"
        options={{
          title: 'Journey',
          tabBarIcon: ({ color, size, focused }) => (
            <Map size={size} color={focused ? COLORS.brightYellow : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pass"
        options={{
          title: 'Pass',
          tabBarIcon: ({ color, size, focused }) => (
            <BookOpen size={size} color={focused ? COLORS.brightYellow : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <User size={size} color={focused ? COLORS.brightYellow : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="evidence"
        options={{ href: null }}
      />
      <Tabs.Screen name="schedule" options={{ href: null }} />
    </Tabs>
  );
}
