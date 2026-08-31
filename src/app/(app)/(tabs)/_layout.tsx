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
          borderBottomWidth: 0,
          borderColor: 'transparent',
          paddingTop: 3,
          paddingBottom: insets.bottom + 2,
          height: 64 + insets.bottom,
          shadowOpacity: 0,
          shadowRadius: 0,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          lineHeight: 14,
          marginBottom: 0,
        },
        tabBarItemStyle: {
          borderRadius: 10,
          marginHorizontal: 3,
          marginVertical: 2,
          borderWidth: 0,
          borderBottomWidth: 0,
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
          tabBarIcon: ({ color, focused }) => (
            <Sun size={22} color={focused ? COLORS.brightYellow : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tolerance"
        options={{
          title: 'Tolerance',
          tabBarIcon: ({ color, focused }) => (
            <Activity size={22} color={focused ? COLORS.brightYellow : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journey"
        options={{
          title: 'Journey',
          tabBarIcon: ({ color, focused }) => (
            <Map size={22} color={focused ? COLORS.brightYellow : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pass"
        options={{
          title: 'Pass',
          tabBarIcon: ({ color, focused }) => (
            <BookOpen size={22} color={focused ? COLORS.brightYellow : (isDark ? color : COLORS.moss)} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <User size={22} color={focused ? COLORS.brightYellow : color} />
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
