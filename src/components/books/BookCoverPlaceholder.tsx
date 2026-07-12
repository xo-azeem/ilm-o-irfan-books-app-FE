import { memo, type ReactNode } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui';
import { bookCoverPlaceholder } from '@/constants/images';
import { palette } from '@/theme/palette';

type BookCoverPlaceholderProps = {
  width: number;
  height: number;
  coverColor?: string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  showSpine?: boolean;
  showSheen?: boolean;
  tag?: string;
  tagPlacement?: 'top-right' | 'bottom-left';
  children?: ReactNode;
};

export const BookCoverPlaceholder = memo(function BookCoverPlaceholder({
  width,
  height,
  coverColor,
  borderRadius = 14,
  style,
  showSpine = true,
  showSheen = true,
  tag,
  tagPlacement = 'top-right',
  children,
}: BookCoverPlaceholderProps) {
  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
          backgroundColor: coverColor ?? palette.green,
        },
        style,
      ]}>
      <Image
        source={bookCoverPlaceholder}
        style={styles.image}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />

      {coverColor ? (
        <View
          pointerEvents="none"
          style={[styles.tint, { backgroundColor: coverColor }]}
        />
      ) : null}

      {showSheen ? <View pointerEvents="none" style={styles.sheen} /> : null}
      {showSpine ? <View pointerEvents="none" style={styles.spine} /> : null}

      {tag ? (
        <View
          style={[
            styles.tag,
            tagPlacement === 'bottom-left' ? styles.tagBottomLeft : styles.tagTopRight,
          ]}>
          <Text style={styles.tagText} className="text-[10px] font-semibold">
            {tag}
          </Text>
        </View>
      ) : null}

      {children ? <View style={styles.childrenOverlay}>{children}</View> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.14,
  },
  sheen: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: '100%',
    width: '34%',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  spine: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  tag: {
    position: 'absolute',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  tagTopRight: {
    right: 10,
    top: 10,
  },
  tagBottomLeft: {
    left: 14,
    bottom: 14,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    color: palette.green,
  },
  childrenOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
