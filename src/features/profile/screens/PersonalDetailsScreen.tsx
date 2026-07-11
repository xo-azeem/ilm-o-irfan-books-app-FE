import { memo, useCallback, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { ProfileFormField } from '@/features/profile/components/ProfileFormField';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import {
  personalDetailsDefaults,
  type PersonalDetails,
} from '@/features/profile/data/profileContent';

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
  const [savedDetails, setSavedDetails] = useState<PersonalDetails>(
    personalDetailsDefaults,
  );
  const [draft, setDraft] = useState<PersonalDetails>(personalDetailsDefaults);

  const updateDraft = useCallback(
    (key: keyof PersonalDetails, value: string) => {
      setDraft(current => ({ ...current, [key]: value }));
    },
    [],
  );

  const handleEdit = useCallback(() => {
    setDraft(savedDetails);
    setIsEditing(true);
  }, [savedDetails]);

  const handleCancel = useCallback(() => {
    setDraft(savedDetails);
    setIsEditing(false);
  }, [savedDetails]);

  const handleSave = useCallback(() => {
    setSavedDetails(draft);
    setIsEditing(false);
  }, [draft]);

  const details = isEditing ? draft : savedDetails;

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
            isEditing={isEditing}
            onChangeText={value => updateDraft('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
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
            placeholder="e.g. 14 March 1996"
          />
        </FormSection>

        <FormSection title="Address">
          <ProfileFormField
            label="Address line 1"
            value={details.addressLine1}
            isEditing={isEditing}
            onChangeText={value => updateDraft('addressLine1', value)}
            placeholder="Street address"
          />
          <ProfileFormField
            label="Address line 2"
            value={details.addressLine2}
            isEditing={isEditing}
            onChangeText={value => updateDraft('addressLine2', value)}
            placeholder="Apartment, suite, etc."
            multiline
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <ProfileFormField
                label="City"
                value={details.city}
                isEditing={isEditing}
                onChangeText={value => updateDraft('city', value)}
              />
            </View>
            <View className="flex-1">
              <ProfileFormField
                label="State"
                value={details.state}
                isEditing={isEditing}
                onChangeText={value => updateDraft('state', value)}
              />
            </View>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <ProfileFormField
                label="Postal code"
                value={details.postalCode}
                isEditing={isEditing}
                onChangeText={value => updateDraft('postalCode', value)}
                keyboardType="number-pad"
              />
            </View>
            <View className="flex-1">
              <ProfileFormField
                label="Country"
                value={details.country}
                isEditing={isEditing}
                onChangeText={value => updateDraft('country', value)}
              />
            </View>
          </View>
        </FormSection>

        <View className="gap-3 pb-2">
          {isEditing ? (
            <>
              <Pressable
                onPress={handleSave}
                className="items-center rounded-[14px] bg-app-primary py-3.5 active:opacity-90 dark:bg-app-primary-dark">
                <Text className="text-[16px] font-semibold text-app-on-primary dark:text-app-on-primary-dark">
                  Save changes
                </Text>
              </Pressable>
              <Pressable
                onPress={handleCancel}
                className="items-center rounded-[14px] border border-app-border py-3.5 active:opacity-90 dark:border-app-border-dark">
                <Text className="text-[16px] font-semibold text-app-ink dark:text-app-ink-dark">
                  Cancel
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={handleEdit}
              className="items-center rounded-[14px] bg-app-primary py-3.5 active:opacity-90 dark:bg-app-primary-dark">
              <Text className="text-[16px] font-semibold text-app-on-primary dark:text-app-on-primary-dark">
                Edit details
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </ProfileSubScreenLayout>
  );
});
