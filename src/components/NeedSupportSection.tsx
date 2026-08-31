import { useEffect, useState } from 'react';
import { Alert, Linking, Modal, Pressable, Text, TextInput, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { GraduationCap, HeartHandshake, Mail, MessageCircle, Pencil, Phone, Stethoscope, Trash2 } from 'lucide-react-native';

import { AccentButton, DestructiveButton, PrimaryButton, SecondaryButton } from './Buttons';
import { SectionCard } from './SectionCard';
import { LabelText, MicroText, SubheadingText } from './Typography';
import { deleteTrustedContact, fetchSharedSupportContactsForStudent, fetchTrustedContact, saveTrustedContact } from '@/db/api';
import type { SharedSupportContact, TrustedContact } from '@/data/types';
import type { StudentAccessRow } from '@/types/types';
import { COLORS, useThemeColors } from '@/lib/theme';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

const SUPPORT_ACTION_STYLE: ViewStyle = {
  minHeight: 44,
  paddingHorizontal: 10,
  paddingVertical: 6,
};

function ContactActions({ phoneNumber }: { phoneNumber: string }) {
  const theme = useThemeColors();
  const phoneTarget = phoneNumber.replace(/[^+\d]/g, '');
  const secondaryActionStyle: ViewStyle = {
    ...SUPPORT_ACTION_STYLE,
    backgroundColor: 'transparent',
    borderWidth: 0,
  };
  return (
    <View className="flex-row gap-2">
      <AccentButton
        label="Call"
        onPress={() => void Linking.openURL(`tel:${phoneTarget}`)}
        iconLeft={<Phone size={18} color={COLORS.deepForest} />}
        className="w-[104px] rounded-full"
        style={{ ...SUPPORT_ACTION_STYLE, backgroundColor: theme.accent, borderColor: theme.accent }}
      />
      <SecondaryButton
        label="Text"
        onPress={() => void Linking.openURL(`sms:${phoneTarget}`)}
        iconLeft={<MessageCircle size={18} color={theme.foreground} />}
        className="w-[104px] rounded-full"
        style={secondaryActionStyle}
      />
    </View>
  );
}

function LinkedSupportRow({
  icon,
  title,
  countLabel,
  detailLabel,
  phoneContacts,
  emailContacts,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  countLabel: string;
  detailLabel?: string;
  phoneContacts: SharedSupportContact[];
  emailContacts: SharedSupportContact[];
  onAction: (channel: 'call' | 'email', contacts: SharedSupportContact[]) => void;
}) {
  const theme = useThemeColors();
  const secondaryActionStyle: ViewStyle = {
    ...SUPPORT_ACTION_STYLE,
    backgroundColor: 'transparent',
    borderWidth: 0,
  };

  return (
    <View className="flex-row flex-wrap items-start gap-x-3 gap-y-1.5 py-2.5">
      <View className="min-w-[190px] flex-1 flex-row items-center gap-3">
        <View className="h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">{icon}</View>
        <View className="min-w-0 flex-1">
          <Text className="font-semibold text-foreground">{title}</Text>
          <MicroText className="text-muted-foreground">{countLabel}</MicroText>
          {detailLabel ? <MicroText className="mt-0.5 text-muted-foreground">{detailLabel}</MicroText> : null}
        </View>
      </View>
      <View className="w-[216px] flex-row gap-2 self-center">
        <AccentButton
          label="Call"
          onPress={() => onAction('call', phoneContacts)}
          disabled={phoneContacts.length === 0}
          iconLeft={<Phone size={18} color={COLORS.deepForest} />}
          className="w-[104px] rounded-full"
          style={{ ...SUPPORT_ACTION_STYLE, backgroundColor: theme.accent, borderColor: theme.accent }}
        />
        <SecondaryButton
          label="Email"
          onPress={() => onAction('email', emailContacts)}
          disabled={emailContacts.length === 0}
          iconLeft={<Mail size={18} color={theme.foreground} />}
          className="w-[104px] rounded-full"
          style={secondaryActionStyle}
        />
      </View>
      {phoneContacts.length === 0 && emailContacts.length === 0 ? <MicroText className="w-full text-muted-foreground">No shared phone or email is available.</MicroText> : null}
    </View>
  );
}

export function NeedSupportSection({ studentId, linkedViewers }: { studentId: string; linkedViewers: StudentAccessRow[] }) {
  const theme = useThemeColors();
  const { isDark } = useTheme();
  const [contact, setContact] = useState<TrustedContact | null>(null);
  const [supportContacts, setSupportContacts] = useState<SharedSupportContact[]>([]);
  const [chooser, setChooser] = useState<{ channel: 'call' | 'email'; contacts: SharedSupportContact[] } | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const viewerIds = linkedViewers
      .filter((viewer) => viewer.status === 'active' && viewer.viewer_user_id)
      .map((viewer) => viewer.viewer_user_id as string);
    void Promise.all([
      fetchTrustedContact(studentId),
      fetchSharedSupportContactsForStudent(viewerIds),
    ]).then(([trustedContact, sharedContacts]) => {
      if (!active) return;
      setContact(trustedContact);
      setSupportContacts(sharedContacts);
    });
    return () => { active = false; };
  }, [linkedViewers, studentId]);

  const launchSupportAction = (contactToOpen: SharedSupportContact, channel: 'call' | 'email') => {
    setChooser(null);
    if (channel === 'call' && contactToOpen.phone) {
      void Linking.openURL(`tel:${contactToOpen.phone.replace(/[^+\d]/g, '')}`);
    }
    if (channel === 'email' && contactToOpen.email) {
      void Linking.openURL(`mailto:${contactToOpen.email}`);
    }
  };

  const beginSupportAction = (channel: 'call' | 'email', contacts: SharedSupportContact[]) => {
    if (contacts.length === 1) {
      launchSupportAction(contacts[0], channel);
    } else if (contacts.length > 1) {
      setChooser({ channel, contacts });
    }
  };

  const beginEdit = () => {
    setName(contact?.name ?? '');
    setRelationship(contact?.relationship ?? '');
    setPhoneNumber(contact?.phoneNumber ?? '');
    setError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    if (!name.trim() || !relationship.trim() || !phoneNumber.trim()) {
      setError('Complete all three trusted-contact fields.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await saveTrustedContact(studentId, { name, relationship, phoneNumber });
      setContact(saved);
      setEditing(false);
    } catch {
      setError('Your trusted contact could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    Alert.alert('Remove trusted contact?', 'This removes the contact from your ReEntry profile.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteTrustedContact(studentId);
              setContact(null);
              setEditing(false);
            } catch {
              setError('Your trusted contact could not be removed. Please try again.');
            }
          })();
        },
      },
    ]);
  };

  const schoolContactCount = linkedViewers.filter((viewer) => viewer.viewer_role === 'school_staff' && viewer.status === 'active').length;
  const careTeamCount = linkedViewers.filter((viewer) => viewer.viewer_role === 'clinician' && viewer.status === 'active').length;
  const schoolContacts = supportContacts.filter((sharedContact) => sharedContact.role === 'school_staff');
  const careContacts = supportContacts.filter((sharedContact) => sharedContact.role === 'clinician');
  const schoolContactLabel = schoolContacts.length === 1
    ? `${schoolContacts[0].displayName} · School staff`
    : schoolContacts.length > 1
      ? `${schoolContacts.length} connected staff`
      : schoolContactCount > 0
        ? 'Contact details have not been shared.'
        : 'No connected school staff.';
  const careContactLabel = careContacts.length === 1
    ? `${careContacts[0].displayName} · Clinician`
    : careContacts.length > 1
      ? `${careContacts.length} connected clinicians`
      : careTeamCount > 0
        ? 'Contact details have not been shared.'
        : 'No connected clinicians.';
  const schoolContactDetail = schoolContacts.length === 1
    ? schoolContacts[0].phone ?? schoolContacts[0].email ?? undefined
    : undefined;
  const careContactDetail = careContacts.length === 1
    ? careContacts[0].phone ?? careContacts[0].email ?? undefined
    : undefined;

  return (
    <>
    <View className="mb-5 w-full">
      <SubheadingText className="mb-2">Need support?</SubheadingText>
      <SectionCard className="p-[14px]">
      <View>
        <LabelText className="leading-5 text-muted-foreground">Choose who you want to reach.</LabelText>
      </View>

      <View className="mt-2">

      <LinkedSupportRow
        icon={<GraduationCap size={19} color={theme.foreground} />}
        title="School support"
        countLabel={schoolContactLabel}
        detailLabel={schoolContactDetail}
        phoneContacts={schoolContacts.filter((sharedContact) => Boolean(sharedContact.phone))}
        emailContacts={schoolContacts.filter((sharedContact) => Boolean(sharedContact.email))}
        onAction={beginSupportAction}
      />

      <View className="h-px bg-border/70" />

      <LinkedSupportRow
        icon={<Stethoscope size={18} color={theme.foreground} />}
        title="Care team"
        countLabel={careContactLabel}
        detailLabel={careContactDetail}
        phoneContacts={careContacts.filter((sharedContact) => Boolean(sharedContact.phone))}
        emailContacts={careContacts.filter((sharedContact) => Boolean(sharedContact.email))}
        onAction={beginSupportAction}
      />

      <View className="h-px bg-border/70" />

      <View className="flex-row flex-wrap items-start gap-x-3 gap-y-1.5 py-2.5">
        <View className="min-w-[190px] flex-1 flex-row items-center gap-3">
          <View className="h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
            <HeartHandshake size={19} color={theme.foreground} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-semibold text-foreground">Trusted adult</Text>
            <MicroText className="text-muted-foreground">
              {contact ? `${contact.name} · ${contact.relationship}` : 'Add one parent, caregiver, or trusted adult.'}
            </MicroText>
            {contact ? <MicroText className="mt-0.5 text-muted-foreground">{contact.phoneNumber}</MicroText> : null}
          </View>
        </View>

          {contact && !editing ? (
            <View className="w-[216px] self-center">
              <ContactActions phoneNumber={contact.phoneNumber} />
            </View>
          ) : null}

          {contact && !editing ? (
              <View className="mt-2 w-full flex-row gap-3">
                <Pressable
                  onPress={beginEdit}
                  className="min-h-11 w-[92px] flex-row items-center justify-center gap-2 rounded-xl border border-border bg-background px-2 active:opacity-70"
                  accessibilityRole="button"
                  accessibilityLabel="Edit trusted adult"
                >
                  <Pencil size={17} color={theme.foreground} />
                  <Text className="text-sm font-semibold text-foreground">Edit</Text>
                </Pressable>
                <Pressable
                  onPress={remove}
                  className="min-h-11 w-[92px] flex-row items-center justify-center gap-1 rounded-xl px-2 active:opacity-70"
                  style={{ backgroundColor: theme.rust }}
                  accessibilityRole="button"
                  accessibilityLabel="Remove trusted adult"
                >
                  <Trash2 size={16} color={COLORS.warmWhite} />
                  <Text className="text-sm font-semibold" style={{ color: COLORS.warmWhite }}>Remove</Text>
                </Pressable>
              </View>
          ) : null}

          {!contact && !editing ? <PrimaryButton label="Add trusted contact" onPress={beginEdit} className="w-full" /> : null}

          {editing ? (
            <View className="w-full gap-3 border-t border-border pt-3">
              <View>
                <MicroText className="mb-1 font-semibold text-foreground">Name</MicroText>
                <TextInput value={name} onChangeText={setName} maxLength={100} placeholder="Name" placeholderTextColor={theme.foregroundMuted} className="rounded-xl border border-border bg-background px-3 py-3 text-foreground" />
              </View>
              <View>
                <MicroText className="mb-1 font-semibold text-foreground">Relationship</MicroText>
                <TextInput value={relationship} onChangeText={setRelationship} maxLength={60} placeholder="Parent, guardian, caregiver…" placeholderTextColor={theme.foregroundMuted} className="rounded-xl border border-border bg-background px-3 py-3 text-foreground" />
              </View>
              <View>
                <MicroText className="mb-1 font-semibold text-foreground">Phone number</MicroText>
                <TextInput value={phoneNumber} onChangeText={setPhoneNumber} maxLength={32} keyboardType="phone-pad" placeholder="Phone number" placeholderTextColor={theme.foregroundMuted} className="rounded-xl border border-border bg-background px-3 py-3 text-foreground" />
              </View>
              {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
              <PrimaryButton label="Save trusted contact" onPress={save} loading={saving} disabled={saving} className="w-full" />
              <SecondaryButton label="Cancel" onPress={cancelEdit} disabled={saving} className="w-full" />
            </View>
          ) : null}
      </View>

      <View className="mt-4 border-t border-border/70 pt-2.5">
        <Text className="text-sm font-semibold text-foreground">Emergency help</Text>
        <DestructiveButton
          label="Emergency services"
          onPress={() => void Linking.openURL('tel:')}
          iconLeft={<Phone size={18} color={COLORS.warmWhite} />}
          className="mt-2.5 self-start rounded-full px-4"
          style={SUPPORT_ACTION_STYLE}
        />
        <MicroText className="mt-2 leading-5 text-muted-foreground">
          For urgent or life-threatening situations, contact local emergency services. ReEntry does not monitor for emergencies or contact anyone automatically.
        </MicroText>
      </View>
      </View>
      </SectionCard>
    </View>
    <Modal visible={chooser !== null} transparent animationType="fade" onRequestClose={() => setChooser(null)}>
      <View className={cn('flex-1 items-center justify-center px-5', isDark && 'dark')}>
        <Pressable className="absolute inset-0 bg-deepForest/60" onPress={() => setChooser(null)} accessibilityLabel="Close contact chooser" />
        <View className="w-full max-w-[420px] rounded-2xl border border-border p-4" style={{ backgroundColor: theme.card }}>
          <SubheadingText>Choose a contact</SubheadingText>
          <MicroText className="mb-3 mt-1 text-muted-foreground">Select who you want to {chooser?.channel === 'call' ? 'call' : 'email'}.</MicroText>
          <View className="gap-2">
            {chooser?.contacts.map((sharedContact) => (
              <SecondaryButton
                key={sharedContact.userId}
                label={`${sharedContact.displayName} · ${sharedContact.role === 'school_staff' ? 'School staff' : 'Clinician'}`}
                onPress={() => launchSupportAction(sharedContact, chooser.channel)}
                className="w-full"
              />
            ))}
          </View>
          <SecondaryButton label="Cancel" onPress={() => setChooser(null)} className="mt-3 w-full" />
        </View>
      </View>
    </Modal>
    </>
  );
}
