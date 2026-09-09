import { memo, useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { api } from '@/api';
import { Text } from '@/components/ui';
import { ProfileFormField } from '@/features/profile/components/ProfileFormField';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { palette } from '@/theme/palette';

type PersonalDetails = {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  addressLine1: string;
  city: string;
  country: string;
};

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-2">
      <Text className="px-1 text-[13px] font-medium uppercase tracking-widest text-app-muted dark:text-app-muted-dark">
        {title}
      </Text>
      <View className="gap-3">{children}</View>
    </View>
  );
}

export const PersonalDetailsScreen = memo(function PersonalDetailsScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedDetails, setSavedDetails] = useState<PersonalDetails>({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    addressLine1: '',
    city: '',
    country: '',
  });
  const [draft, setDraft] = useState<PersonalDetails>(savedDetails);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await api.profileRead();
        if (cancelled) {
          return;
        }
        const next: PersonalDetails = {
          fullName: profile.full_name ?? '',
          email: profile.email ?? '',
          phone: profile.phone ?? '',
          dateOfBirth: profile.date_of_birth ?? '',
          addressLine1: profile.address_line1 ?? '',
          city: profile.city ?? '',
          country: profile.country ?? '',
        };
        setSavedDetails(next);
        setDraft(next);
      } catch (err) {
        Alert.alert(
          'Profile',
          err instanceof Error ? err.message : 'Could not load profile',
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateDraft = useCallback((key: keyof PersonalDetails, value: string) => {
    setDraft(current => ({ ...current, [key]: value }));
  }, []);

  const handleEdit = useCallback(() => {
    setDraft(savedDetails);
    setIsEditing(true);
  }, [savedDetails]);

  const handleCancel = useCallback(() => {
    setDraft(savedDetails);
    setIsEditing(false);
  }, [savedDetails]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const updated = await api.profileUpdate({
        full_name: draft.fullName || null,
        phone: draft.phone || null,
        date_of_birth: draft.dateOfBirth || null,
        address_line1: draft.addressLine1 || null,
        city: draft.city || null,
        country: draft.country || null,
      });
      const next: PersonalDetails = {
        fullName: updated.full_name ?? '',
        email: updated.email ?? draft.email,
        phone: updated.phone ?? '',
        dateOfBirth: updated.date_of_birth ?? '',
        addressLine1: updated.address_line1 ?? '',
        city: updated.city ?? '',
        country: updated.country ?? '',
      };
      setSavedDetails(next);
      setDraft(next);
      setIsEditing(false);
    } catch (err) {
      Alert.alert(
        'Save failed',
        err instanceof Error ? err.message : 'Could not update profile',
      );
    } finally {
      setSaving(false);
    }
  }, [draft]);

  const details = isEditing ? draft : savedDetails;

  if (loading) {
    return (
      <ProfileSubScreenLayout
        title="Personal details"
        subtitle="View and update your account information.">
        <View className="items-center py-16">
          <ActivityIndicator color={palette.green} />
        </View>
      </ProfileSubScreenLayout>
    );
  }

  return (
    <ProfileSubScreenLayout
      title="Personal details"
      subtitle="View and update your account information.">
      <View className="gap-7">
        <FormSection title="Basic information">
          <ProfileFormField
            label="Full name"
            value={details.fullName}
            isEditing={isEditing}
            onChangeText={value => updateDraft('fullName', value)}
            autoCapitalize="words"
          />
          <ProfileFormField
            label="Email"
            value={details.email}
            isEditing={false}
            onChangeText={() => undefined}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text className="px-1 text-[12px] text-app-muted dark:text-app-muted-dark">
            Email is managed by your account login.
          </Text>
          <ProfileFormField
            label="Phone"
            value={details.phone}
            isEditing={isEditing}
            onChangeText={value => updateDraft('phone', value)}
            keyboardType="phone-pad"
          />
          <ProfileFormField
            label="Date of birth"
            value={details.dateOfBirth}
            isEditing={isEditing}
            onChangeText={value => updateDraft('dateOfBirth', value)}
            placeholder="YYYY-MM-DD"
          />
        </FormSection>

        <FormSection title="Address">
          <ProfileFormField
            label="Address line 1"
            value={details.addressLine1}
            isEditing={isEditing}
            onChangeText={value => updateDraft('addressLine1', value)}
          />
          <ProfileFormField
            label="City"
            value={details.city}
            isEditing={isEditing}
            onChangeText={value => updateDraft('city', value)}
          />
          <ProfileFormField
            label="Country"
            value={details.country}
            isEditing={isEditing}
            onChangeText={value => updateDraft('country', value)}
          />
        </FormSection>

        <View className="flex-row gap-3">
          {isEditing ? (
            <>
              <Pressable
                onPress={handleCancel}
                className="flex-1 items-center rounded-[14px] border border-app-border py-3.5 dark:border-app-border-dark">
                <Text className="text-[16px] font-semibold text-app-ink dark:text-app-ink-dark">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void handleSave()}
                disabled={saving}
                className="flex-1 items-center rounded-[14px] bg-app-primary py-3.5 dark:bg-app-primary-dark">
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-[16px] font-semibold text-white">Save</Text>
                )}
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={handleEdit}
              className="flex-1 items-center rounded-[14px] bg-app-primary py-3.5 dark:bg-app-primary-dark">
              <Text className="text-[16px] font-semibold text-white">Edit</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ProfileSubScreenLayout>
  );
});
