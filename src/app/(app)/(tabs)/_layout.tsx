import { Tabs } from 'expo-router';
import { Sun, Activity, Map, BookOpen, User } from 'lucide-react-native';
import { useAppContext } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import { COLORS } from '@/lib/theme';

export default function TabsLayout() {
  const { isDark } = useTheme();
  const { lowStimulationMode } = useAppContext();

  return (
    <Tabs
      initialRouteName="today"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.brightYellow,
        tabBarInactiveTintColor: isDark ? COLORS.linen : COLORS.moss,
        tabBarStyle: {
          backgroundColor: isDark ? COLORS.deepForest : COLORS.moon,
          borderTopColor: isDark ? COLORS.forest : COLORS.linen,
          borderTopWidth: 1,
          paddingTop: 4,
          height: 60,
          shadowColor: lowStimulationMode ? 'transparent' : '#344431',
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: lowStimulationMode ? 0 : 0.05,
          shadowRadius: lowStimulationMode ? 0 : 4,
          elevation: lowStimulationMode ? 0 : 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginBottom: 4,
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
    </Tabs>
  );
}
