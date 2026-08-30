import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ReadOnlyField, TextButton, TextField } from '@/components/ui';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { useProfile, useUpdateProfile } from '@/hooks/useAccount';
import type { ProfileDetails } from '@/services/account';

type Form = Omit<ProfileDetails, 'memberSince'>;

/** `memberSince` is derived for display, so it never takes part in the form. */
function toForm({ memberSince: _derived, ...fields }: ProfileDetails): Form {
  return fields;
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
    return (Object.keys(saved) as (keyof Form)[]).some(key => saved[key] !== form[key]);
  }, [form, profile]);

  const handleSave = useCallback(() => {
    updateProfile.mutate(form, {
      onSuccess: () => Alert.alert('Saved', 'Your details have been updated.'),
      onError: error =>
        Alert.alert(
          'Could not save',
          error instanceof Error ? error.message : 'Please try again.',
        ),
    });
  }, [form, updateProfile]);

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
      }>
      <View style={styles.fields}>
        <TextField
          label="Full name"
          value={form.fullName}
          onChangeText={value => update('fullName', value)}
          autoCapitalize="words"
          textContentType="name"
        />

        <ReadOnlyField label="Email" value={form.email || '—'} note="Verified" />

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
            keyboardType="number-pad"
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
