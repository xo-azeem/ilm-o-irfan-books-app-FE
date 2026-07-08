import { memo } from 'react';
import { Platform, StyleSheet, View, useColorScheme } from 'react-native';

import { DisplayText } from '@/components/ui';

type BookSpineProps = {
  title: string;
  coverColor: string;
  coverColorDark: string;
  width: number;
};

export const BookSpine = memo(function BookSpine({
  title,
  coverColor,
  coverColorDark,
  width,
}: BookSpineProps) {
  const isDark = useColorScheme() === 'dark';
  const color = isDark ? coverColorDark : coverColor;
  const height = width * 1.45;

  return (
    <View
      style={[
        styles.cover,
        {
          width,
          height,
          backgroundColor: color,
          shadowOpacity: isDark ? 0.24 : 0.12,
        },
      ]}>
      <View style={styles.spine} />
      <View style={styles.gloss} />
      <View style={styles.titleWrap}>
        <DisplayText
          className="text-[11px] font-semibold leading-[14px] text-white"
          numberOfLines={3}>
          {title}
        </DisplayText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  cover: {
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 10,
    shadowColor: '#1C2B22',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    ...Platform.select({ android: { elevation: 4 } }),
  },
  spine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '38%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  titleWrap: {
    justifyContent: 'flex-end',
  },
});
