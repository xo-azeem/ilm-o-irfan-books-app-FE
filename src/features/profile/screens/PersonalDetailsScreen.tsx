import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';

import {
  Avatar,
  ReadOnlyField,
  Text,
  TextButton,
  TextField,
} from '@/components/ui';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import {
  useAvatarUpload,
  useAvatarUrl,
  useProfile,
  useUpdateProfile,
} from '@/hooks/useAccount';
import {
  formatDateOfBirth,
  parseDateOfBirth,
} from '@/features/profile/dateOfBirth';
import type { ProfileDetails, ProfileForm } from '@/services/account';
import { fontSize } from '@/theme/typography';

type Form = ProfileForm;

/**
 * `memberSince`, the streak, the goal and the achievements are read-only
 * record (the goal has its own write on the record screen) and the avatar
 * writes itself as soon as it uploads, so none of them takes part in the form.
 * The date of birth is shown the way a reader would write it, not the way the
 * column stores it.
 */
function toForm({
  memberSince: _since,
  streak: _streak,
  avatarPath: _avatar,
  goal: _goal,
  monthlyGoal: _monthlyGoal,
  achievements: _achievements,
  dateOfBirth,
  ...fields
}: ProfileDetails): Form {
  return { ...fields, dateOfBirth: formatDateOfBirth(dateOfBirth) };
}

const EMPTY_FORM: Form = {
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
};

/**
 * Personal details.
 *
 * All ten fields the profile carries. Email is read-only and marked verified —
 * changing it is an account operation, not a form edit — and Save only becomes
 * active once something has actually changed.
 */
export function PersonalDetailsScreen() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const avatarUpload = useAvatarUpload();
  const { data: avatarUrl } = useAvatarUrl(profile?.avatarPath);

  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [loaded, setLoaded] = useState(false);

  // Seed the form once the record arrives, without clobbering live edits.
  useEffect(() => {
    if (profile && !loaded) {
      setForm(toForm(profile));
      setLoaded(true);
    }
  }, [loaded, profile]);

  const update = useCallback((key: keyof Form, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
  }, []);

  const isDirty = useMemo(() => {
    if (!profile) {
      return false;
    }
    const saved = toForm(profile);
    return (Object.keys(saved) as (keyof Form)[]).some(
      key => saved[key] !== form[key],
    );
  }, [form, profile]);

  /**
   * Picks a photo and uploads it straight away.
   *
   * Deliberately not part of Save: the upload records `avatar_path` itself, so
   * tying it to the form would mean holding bytes in memory while the reader
   * edits their address — and losing them if they backed out.
   */
  const handlePickPhoto = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
    });
    const asset = result.assets?.[0];
    if (result.didCancel || !asset?.uri) {
      return;
    }

    avatarUpload.mutate(
      { uri: asset.uri, mime: asset.type ?? 'image/jpeg' },
      {
        onError: error =>
          Alert.alert(
            'Could not update your photo',
            error instanceof Error ? error.message : 'Please try again.',
          ),
      },
    );
  }, [avatarUpload]);

  /**
   * The date of birth is checked here rather than left to the server: a typo
   * is caught before the round trip, and the wording is the form's own rather
   * than the endpoint's. What is sent is the column's `YYYY-MM-DD`.
   */
  const dateOfBirthError = useMemo(() => {
    if (!form.dateOfBirth.trim() || parseDateOfBirth(form.dateOfBirth)) {
      return undefined;
    }
    return 'Enter a date like 14 March 1996 or 14/03/1996';
  }, [form.dateOfBirth]);

  const handleSave = useCallback(() => {
    if (dateOfBirthError) {
      Alert.alert('Check the date of birth', dateOfBirthError);
      return;
    }
    const dateOfBirth = parseDateOfBirth(form.dateOfBirth) ?? '';
    const trimmed = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim()]),
    ) as Form;

    updateProfile.mutate(
      { ...trimmed, dateOfBirth },
      {
        onSuccess: () => {
          // Show the fields as they were saved — trimmed, and the date in its
          // written form — so what is on screen is what the record now holds.
          setForm({
            ...trimmed,
            dateOfBirth: formatDateOfBirth(dateOfBirth),
          });
          Alert.alert('Saved', 'Your details have been updated.');
        },
        onError: error =>
          Alert.alert(
            'Could not save',
            error instanceof Error ? error.message : 'Please try again.',
          ),
      },
    );
  }, [dateOfBirthError, form, updateProfile]);

  return (
    <ProfileSubScreenLayout
      title="Personal details"
      gap={20}
      action={
        <TextButton
          label={updateProfile.isPending ? 'Saving…' : 'Save'}
          onPress={handleSave}
          // A disabled-looking Save that does nothing is worse than none at all.
          tone={isDirty && !updateProfile.isPending ? 'primary' : 'muted'}
          disabled={!isDirty || updateProfile.isPending}
        />
      }
    >
      <View style={styles.photo}>
        <Avatar
          imageUrl={avatarUrl}
          name={profile?.fullName}
          size={64}
          shape="squircle"
        />
        <View style={styles.photoBody}>
          <Text size={fontSize.body} leading={1.3}>
            Profile photo
          </Text>
          <TextButton
            label={
              avatarUpload.isPending
                ? 'Uploading…'
                : avatarUrl
                  ? 'Change photo'
                  : 'Add a photo'
            }
            onPress={handlePickPhoto}
            tone={avatarUpload.isPending ? 'muted' : 'primary'}
            disabled={avatarUpload.isPending}
          />
        </View>
      </View>

      <View style={styles.fields}>
        <TextField
          label="Full name"
          value={form.fullName}
          onChangeText={value => update('fullName', value)}
          autoCapitalize="words"
          textContentType="name"
        />

        <ReadOnlyField
          label="Email"
          value={form.email || '—'}
          note="Verified"
        />

        <TextField
          label="Phone"
          value={form.phone}
          onChangeText={value => update('phone', value)}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
        />

        <TextField
          label="Date of birth"
          value={form.dateOfBirth}
          onChangeText={value => update('dateOfBirth', value)}
          placeholder="14 March 1996"
          error={dateOfBirthError}
          autoCapitalize="words"
          autoCorrect={false}
        />

        <TextField
          label="Address"
          value={form.addressLine1}
          onChangeText={value => update('addressLine1', value)}
          placeholder="Street address"
        />
        <TextField
          value={form.addressLine2}
          onChangeText={value => update('addressLine2', value)}
          placeholder="Apartment, block, floor"
        />

        <View style={styles.row}>
          <TextField
            label="City"
            value={form.city}
            onChangeText={value => update('city', value)}
            containerStyle={styles.grow}
          />
          <TextField
            label="Postal code"
            value={form.postalCode}
            onChangeText={value => update('postalCode', value)}
            // Not a number pad: codes outside Pakistan carry letters.
            autoCapitalize="characters"
            autoCorrect={false}
            textContentType="postalCode"
            containerStyle={styles.grow}
          />
        </View>

        <View style={styles.row}>
          <TextField
            label="Province"
            value={form.state}
            onChangeText={value => update('state', value)}
            containerStyle={styles.grow}
          />
          <TextField
            label="Country"
            value={form.country}
            onChangeText={value => update('country', value)}
            containerStyle={styles.grow}
          />
        </View>
      </View>
    </ProfileSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  photo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  photoBody: {
    gap: 4,
  },
  fields: {
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 11,
  },
  grow: {
    flex: 1,
  },
});
