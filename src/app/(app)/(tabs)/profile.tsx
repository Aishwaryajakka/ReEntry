/**
 * Profile Tab
 *
 * Displays Maya's name and age from shared data.
 * Contains functional Low-Stimulation Mode toggle connected to global state.
 * No auth, no account management, no messaging.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter, type RelativePathString } from 'expo-router';
import { View, Text, Switch } from 'react-native';
import { Eye, EyeOff, Info, Lock, Copy, Check, Users } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { ScreenShell } from '@/components/ScreenShell';
import { SectionCard } from '@/components/SectionCard';
import { SecondaryButton, DestructiveButton } from '@/components/Buttons';
import { HeadingText, SubheadingText, LabelText, MicroText, EditorialLabel } from '@/components/Typography';
import { TOLERANCE_LABELS } from '@/data/activityCatalog';
import { DividerLine } from '@/components/DividerLine';
import { StudentPageHeader } from '@/components/StudentPageHeader';
import { NeedSupportSection } from '@/components/NeedSupportSection';
import { useAppContext } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import { useSession } from '@/ctx';
import { supabase } from '@/client/supabase';
import { getOrCreateStudentAccessCode, fetchStudentAccessLinks, revokeStudentAccess, regenerateStudentAccessCode } from '@/db/api';
import { COLORS, useThemeColors } from '@/lib/theme';
import type { StudentAccessRow } from '@/types/types';

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, dailyCheckIns, activityLogs, lowStimulationMode, toggleLowStimulation } = useAppContext();
  const { session, role } = useSession();
  const { isDark, toggleTheme } = useTheme();
  const themeColors = useThemeColors();
  const [error, setError] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [linkedViewers, setLinkedViewers] = useState<StudentAccessRow[]>([]);
  const [copied, setCopied] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);

  const userId = session?.user?.id;
  const roleLabel = (() => {
    switch (role) {
      case 'student':
        return 'Student account';
      case 'school_staff':
        return 'School Staff account';
      case 'clinician':
        return 'Clinician account';
      default:
        return 'Account';
    }
  })();

  const loadAccess = async () => {
    if (!userId || role !== 'student') return;
    setAccessLoading(true);
    const [codeRow, links] = await Promise.all([
      getOrCreateStudentAccessCode(userId),
      fetchStudentAccessLinks(userId),
    ]);
    setAccessCode(codeRow?.access_code ?? null);
    setLinkedViewers(links);
    setAccessLoading(false);
  };

  useEffect(() => {
    loadAccess();
  }, [userId, role]);

  const handleGenerateCode = async () => {
    if (!userId) return;
    setAccessLoading(true);
    const row = await getOrCreateStudentAccessCode(userId);
    if (row?.access_code) {
      setAccessCode(row.access_code);
    }
    setAccessLoading(false);
  };

  const handleRegenerateCode = async () => {
    if (!userId) return;
    setAccessLoading(true);
    const row = await regenerateStudentAccessCode(userId);
    if (row?.access_code) {
      setAccessCode(row.access_code);
    }
    setAccessLoading(false);
  };

  const handleCopyCode = async () => {
    if (!accessCode) return;
    await Clipboard.setStringAsync(accessCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (accessId: string) => {
    if (!userId) return;
    const ok = await revokeStudentAccess(userId, accessId);
    if (ok) {
      await loadAccess();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleToggleTheme = async (_value: boolean) => {
    try {
      setError(null);
      await toggleTheme();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update appearance.');
    }
  };

  const handleToggleLowStimulation = async (_value: boolean) => {
    try {
      setError(null);
      await toggleLowStimulation();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update Low-Stimulation Mode.');
    }
  };

  const recoveryContext = useMemo(() => {
    const checkInCount = dailyCheckIns.length;
    const logCount = activityLogs.length;
    const allDates = [
      ...dailyCheckIns.map((c) => c.date),
      ...activityLogs.map((l) => l.date),
    ].sort();
    const firstEntry = allDates[0] ?? null;
    const mostRecentEntry = allDates[allDates.length - 1] ?? null;
    const latestActivity = activityLogs
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))[0];
    return { checkInCount, logCount, firstEntry, mostRecentEntry, latestActivity };
  }, [dailyCheckIns, activityLogs]);
  const activeSchoolCount = linkedViewers.filter((link) => link.viewer_role === 'school_staff' && link.status === 'active').length;
  const activeClinicianCount = linkedViewers.filter((link) => link.viewer_role === 'clinician' && link.status === 'active').length;
  const countBadgeStyle = {
    borderColor: themeColors.turmeric,
    backgroundColor: `${themeColors.turmeric}${lowStimulationMode ? '12' : '22'}`,
  };

  return (
    <ScreenShell className="max-w-[880px]">
      {/* Header */}
      <StudentPageHeader className="mb-3" />
      <EditorialLabel className="mb-3">Profile</EditorialLabel>
      <HeadingText className="mb-6">Settings</HeadingText>

      {/* User card */}
      <SectionCard className="mb-5">
        <View className="flex-row items-center gap-4">
          <View className="w-14 h-14 rounded-full bg-accent items-center justify-center">
            <Text className="text-2xl font-bold text-accent-foreground">
              {user.firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
              {user.firstName}
            </Text>
            <Text className="text-sm text-muted-foreground mt-0.5">
              {roleLabel}
            </Text>
          </View>
        </View>
      </SectionCard>

      {/* Appearance */}
      <SubheadingText className="mb-3 mt-2">Display</SubheadingText>
      <SectionCard className="mb-5 gap-5">
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1">
            <View className="mb-1 flex-row items-center gap-2">
              <Text className="text-base font-semibold text-foreground">Dark Mode</Text>
            </View>
            <LabelText className="leading-5">Use the dark appearance across the app.</LabelText>
          </View>
          <Switch
            value={isDark}
            onValueChange={handleToggleTheme}
            trackColor={{ false: themeColors.mossLight, true: themeColors.moss }}
            thumbColor={COLORS.warmWhite}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Dark Mode toggle"
            accessibilityRole="switch"
            accessibilityState={{ checked: isDark }}
          />
        </View>

        <View className="h-px bg-border" />

        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1">
            <View className="mb-1 flex-row items-center gap-2">
              {lowStimulationMode
                ? <EyeOff size={18} color={themeColors.foreground} />
                : <Eye size={18} color={themeColors.foreground} />
              }
              <Text className="text-base font-semibold text-foreground">
                Low-Stimulation Mode
              </Text>
            </View>
            <LabelText className="leading-5">
              {lowStimulationMode
                ? 'Active — decorative elements removed. All information is preserved.'
                : 'Remove textures, contours, and decorative elements from all screens.'}
            </LabelText>
          </View>
          <Switch
            value={lowStimulationMode}
            onValueChange={handleToggleLowStimulation}
            trackColor={{ false: themeColors.mossLight, true: themeColors.moss }}
            thumbColor={COLORS.warmWhite}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Low-Stimulation Mode toggle"
            accessibilityRole="switch"
            accessibilityState={{ checked: lowStimulationMode }}
          />
        </View>

        {lowStimulationMode && (
          <View className="rounded-xl bg-muted px-4 py-3">
            <LabelText className="leading-5">
              Low-Stimulation Mode is active across all tabs. Toggle off to restore the full visual experience.
            </LabelText>
          </View>
        )}

        {error && (
          <View className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
            <MicroText className="text-destructive">{error}</MicroText>
          </View>
        )}
      </SectionCard>

      {/* Connected Access */}
      {role === 'student' && (
        <>
          <SubheadingText className="mb-3">Connected Access</SubheadingText>
          <SectionCard className="mb-4">
            <View className="mb-2 flex-row items-start gap-2">
              <Users size={18} color={themeColors.turmeric} />
              <LabelText className="flex-1 leading-5">Control who can view the records shared for their role.</LabelText>
            </View>
            <LabelText className="leading-5 mb-4">
              Give this code to your school staff or clinician. They can enter it to connect to your ReEntry data.
            </LabelText>

            <View className="mb-4 items-center rounded-xl bg-muted px-3 py-4">
              {accessCode ? (
                <>
                  <Text className="text-2xl font-bold tracking-widest text-foreground mb-3">{accessCode}</Text>
                  <View className="flex-row flex-wrap gap-2">
                    <SecondaryButton
                      label={copied ? 'Copied' : 'Copy code'}
                      onPress={handleCopyCode}
                      className="min-w-[130px] flex-1"
                      iconLeft={copied ? <Check size={16} color={themeColors.turmeric} /> : <Copy size={16} color={themeColors.turmeric} />}
                      accessibilityLabel="Copy access code"
                    />
                    <SecondaryButton
                      label={accessLoading ? '…' : 'New code'}
                      onPress={handleRegenerateCode}
                      disabled={accessLoading}
                      className="min-w-[130px] flex-1"
                      accessibilityLabel="Generate new access code"
                    />
                  </View>
                </>
              ) : (
                <SecondaryButton
                  label={accessLoading ? 'Loading…' : 'Generate access code'}
                  onPress={handleGenerateCode}
                  disabled={accessLoading}
                  className="w-full"
                />
              )}
            </View>

            <View className="h-px bg-border mb-3" />
            <Text className="text-base font-semibold text-foreground mb-2">Linked viewers</Text>
            {linkedViewers.length === 0 ? (
              <MicroText className="text-muted-foreground">No one has access yet.</MicroText>
            ) : (
              <View className="gap-3">
                {linkedViewers.some((l) => l.viewer_role === 'school_staff') && (
                  <View>
                    <View className="mb-1 flex-row items-center justify-between gap-2">
                      <Text className="text-sm font-medium text-foreground">School Staff</Text>
                      <View className="rounded-full border px-2 py-1" style={countBadgeStyle}>
                        <Text className="text-xs font-semibold text-foreground">{activeSchoolCount} connected</Text>
                      </View>
                    </View>
                    {linkedViewers
                      .filter((l) => l.viewer_role === 'school_staff')
                      .map((link) => (
                        <View key={link.id} className="mb-1 flex-row items-center justify-between border-t border-border py-3">
                          <View className="flex-1">
                            <Text className="text-sm text-foreground capitalize">
                              {link.status === 'active' ? 'Active access' : 'Revoked'}
                            </Text>
                          </View>
                          {link.status === 'active' && (
                            <DestructiveButton
                              label="Revoke"
                              onPress={() => handleRevoke(link.id)}
                              className="rounded-full px-3 py-1"
                              style={{ minHeight: 44 }}
                              accessibilityLabel="Revoke access"
                            />
                          )}
                        </View>
                      ))}
                  </View>
                )}
                {linkedViewers.some((l) => l.viewer_role === 'clinician') && (
                  <View>
                    <View className="mb-1 flex-row items-center justify-between gap-2">
                      <Text className="text-sm font-medium text-foreground">Clinicians</Text>
                      <View className="rounded-full border px-2 py-1" style={countBadgeStyle}>
                        <Text className="text-xs font-semibold text-foreground">{activeClinicianCount} connected</Text>
                      </View>
                    </View>
                    {linkedViewers
                      .filter((l) => l.viewer_role === 'clinician')
                      .map((link) => (
                        <View key={link.id} className="mb-1 flex-row items-center justify-between border-t border-border py-3">
                          <View className="flex-1">
                            <Text className="text-sm text-foreground capitalize">
                              {link.status === 'active' ? 'Active access' : 'Revoked'}
                            </Text>
                          </View>
                          {link.status === 'active' && (
                            <DestructiveButton
                              label="Revoke"
                              onPress={() => handleRevoke(link.id)}
                              className="rounded-full px-3 py-1"
                              style={{ minHeight: 44 }}
                              accessibilityLabel="Revoke access"
                            />
                          )}
                        </View>
                      ))}
                  </View>
                )}
              </View>
            )}
          </SectionCard>
        </>
      )}

      {role === 'student' && userId ? (
        <NeedSupportSection studentId={userId} linkedViewers={linkedViewers} />
      ) : null}

      {/* Your records */}
      <SubheadingText className="mb-3">Your records</SubheadingText>
      <SectionCard className="mb-4">
        <View className="flex-row justify-between mb-3">
          <View className="items-center" style={{ flex: 1 }}>
            <Text className="text-xl font-bold" style={{ color: themeColors.turmeric }}>{recoveryContext.checkInCount}</Text>
            <MicroText>Daily check-ins</MicroText>
          </View>
          <View className="items-center border-l border-border" style={{ flex: 1 }}>
            <Text className="text-xl font-bold" style={{ color: themeColors.turmeric }}>{recoveryContext.logCount}</Text>
            <MicroText>Activity logs</MicroText>
          </View>
          <View className="items-center border-l border-border" style={{ flex: 1 }}>
            <Text className="text-sm font-semibold text-foreground">
              {recoveryContext.mostRecentEntry ? formatDateShort(recoveryContext.mostRecentEntry) : '—'}
            </Text>
            <MicroText>Latest entry</MicroText>
          </View>
        </View>
        <MicroText className="leading-4 text-center">
          Your records show activity across {recoveryContext.checkInCount} check-in days and {recoveryContext.logCount} activity logs.
        </MicroText>
        <View className="my-4 h-px bg-border" />
        <Text className="mb-1 text-base font-semibold text-foreground">Latest activity</Text>
        {recoveryContext.latestActivity ? (
          <View>
            <View className="flex-row items-center justify-between gap-3">
              <Text className="min-w-0 flex-1 text-base font-semibold text-foreground">
                {recoveryContext.latestActivity.customLabel || recoveryContext.latestActivity.activityCategory}
              </Text>
              <MicroText>{formatDateShort(recoveryContext.latestActivity.date)}</MicroText>
            </View>
            <MicroText className="mb-2">
              {recoveryContext.latestActivity.durationMinutes} min · {TOLERANCE_LABELS[recoveryContext.latestActivity.toleranceRating]}
            </MicroText>
            {recoveryContext.latestActivity.notes ? (
              <LabelText className="italic leading-5 text-muted-foreground">"{recoveryContext.latestActivity.notes}"</LabelText>
            ) : null}
          </View>
        ) : (
          <MicroText className="leading-4">
            No activity logs yet. Go to the Today tab and tap Log Activity to add your first entry.
          </MicroText>
        )}
      </SectionCard>

      <DividerLine />

      {/* About */}
      <SubheadingText className="mb-3">About ReEntry</SubheadingText>
      <SectionCard className="mb-4">
        <View className="mb-3 flex-row items-start gap-3">
          <View className="mt-0.5">
            <Info size={18} color={themeColors.foregroundMuted} />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-base font-semibold text-foreground">How ReEntry is designed</Text>
            <LabelText className="leading-5">
              See the guidance and responsible-technology principles behind activity records, school supports, privacy, and AI-assisted observations.
            </LabelText>
          </View>
        </View>
        <SecondaryButton
          label="Evidence & design"
          onPress={() => router.push('/(app)/(tabs)/evidence' as RelativePathString)}
          className="w-full"
        />
        <View className="my-4 h-px bg-border" />
        <View className="flex-row items-start gap-3">
          <View className="mt-0.5">
            <Info size={18} color={themeColors.foregroundMuted} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-foreground mb-1">Recovery support — not diagnosis</Text>
            <LabelText className="leading-5">
              ReEntry supports recovery through observational self-reporting. It does not diagnose, estimate severity, predict recovery time, prescribe treatment, or clear return-to-play.
            </LabelText>
          </View>
        </View>
        <View className="my-4 h-px bg-border" />
        <View className="flex-row items-center gap-2 mb-2">
          <Lock size={16} color={themeColors.foregroundMuted} />
          <Text className="text-base font-semibold text-foreground">Language used in this app</Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {[
            'You reported…',
            'Your records show…',
            'This pattern appeared…',
            'Consider discussing with your care team.',
          ].map((phrase) => (
            <View key={phrase} className="border border-border rounded-full px-2.5 py-1">
              <MicroText className="italic">"{phrase}"</MicroText>
            </View>
          ))}
        </View>
        <MicroText className="leading-5 mt-3">
          All observations are self-reported. Color is never the sole carrier of medical meaning.
        </MicroText>
      </SectionCard>

      {/* Account */}
      <SecondaryButton label="Sign Out" onPress={handleSignOut} className="mb-4 self-start px-5" />

      {/* Version */}
      <View className="items-center mt-3 mb-2">
        <MicroText>ReEntry · Foundation build · Persistent records</MicroText>
        <MicroText className="mt-1">{roleLabel} · No external services</MicroText>
      </View>
    </ScreenShell>
  );
}
