import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { DisplayText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

import { getBookSpineShadow } from '../constants';

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
  const { isDark } = useTheme();
  const color = isDark ? coverColorDark : coverColor;
  const height = width * 1.45;

  return (
    <View
      style={[
        styles.cover,
        getBookSpineShadow(isDark),
        {
          width,
          height,
          backgroundColor: color,
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
