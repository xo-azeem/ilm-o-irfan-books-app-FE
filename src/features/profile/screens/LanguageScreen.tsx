import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Divider, Label, SettingsGroup, SettingsRow, Text, Toggle, UrduText } from '@/components/ui';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { catalogueToggles, languageOptions } from '@/features/profile/data/profileContent';
import { fontSize } from '@/theme/typography';

/**
 * Language.
 *
 * Interface language and reading language are deliberately separate: a reader
 * who wants an English interface may still want Urdu titles to lead, and a
 * mixed-script catalogue makes that distinction load-bearing.
 */
export function LanguageScreen() {
  const [language, setLanguage] = useState('en');
  const [catalogue, setCatalogue] = useState(() =>
    Object.fromEntries(catalogueToggles.map(toggle => [toggle.id, toggle.defaultValue])),
  );

  const setToggle = useCallback((id: string, value: boolean) => {
    setCatalogue(current => ({ ...current, [id]: value }));
  }, []);

  return (
    <ProfileSubScreenLayout
      title="Language"
      subtitle="Applies to the interface immediately.">
      <SettingsGroup>
        {languageOptions.map(option => (
          <SettingsRow
            key={option.id}
            title={option.label}
            subtitle={option.script ? undefined : option.description}
            trailing={
              option.script === 'urdu' ? (
                <UrduText size={17} tone="muted">
                  {option.description}
                </UrduText>
              ) : option.script === 'arabic' ? (
                <Text size={fontSize.bodySmall} leading={1.3} tone="muted" align="right">
                  {option.description}
                </Text>
              ) : undefined
            }
            selected={language === option.id}
            onPress={() => setLanguage(option.id)}
          />
        ))}
      </SettingsGroup>

      <View style={styles.section}>
        <Label size={fontSize.labelSmall + 0.5} tracking={1.5}>
          Catalogue
        </Label>
        <Card tone="surface" padded={15} gap={14}>
          {catalogueToggles.map((toggle, index) => (
            <View key={toggle.id} style={styles.group}>
              {index > 0 ? <Divider /> : null}
              <View style={styles.row}>
                <View style={styles.rowBody}>
                  <Text size={fontSize.body} leading={1}>
                    {toggle.label}
                  </Text>
                  <Text size={12.5} leading={1.2} tone="muted">
                    {toggle.description}
                  </Text>
                </View>
                <Toggle
                  value={catalogue[toggle.id] ?? toggle.defaultValue}
                  onValueChange={value => setToggle(toggle.id, value)}
                  accessibilityLabel={toggle.label}
                />
              </View>
            </View>
          ))}
        </Card>
      </View>

      <Card tone="alt" padded={15}>
        <Text size={12.5} leading={1.55} tone="muted">
          Urdu and Arabic switch the interface to right-to-left, including the reader’s page
          order and the tab bar.
        </Text>
      </Card>
    </ProfileSubScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 11,
  },
  group: {
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
});
