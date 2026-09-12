import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { SkeletonBone, SkeletonPulse } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Admin loading states.
 *
 * The skeleton keeps the real layout — same cover block, same three lines — so
 * nothing reflows when the rows land, and the list fades out down the page
 * rather than filling the screen with equal-weight noise.
 */

const FADE = [1, 1, 0.7, 0.4, 0.25, 0.15];
const WIDTHS = ['78%', '64%', '71%', '60%', '68%', '58%'] as const;

/** Rows shaped like the book list — a cover, a title and two meta lines. */
export const AdminRowsSkeleton = memo(function AdminRowsSkeleton({
  count = 4,
}: {
  count?: number;
}) {
  const { colors } = useTheme();

  return (
    <SkeletonPulse>
      <View style={styles.list}>
        {Array.from({ length: count }, (_, index) => (
          <View
            key={index}
            style={[
              styles.row,
              { backgroundColor: colors.surface, opacity: FADE[index] ?? 0.15 },
            ]}
          >
            <SkeletonBone
              width={48}
              height={68}
              radius={8}
              shimmer={index === 0}
            />
            <View style={styles.body}>
              <SkeletonBone
                width={WIDTHS[index] ?? '70%'}
                height={11}
                radius={5}
              />
              <SkeletonBone width="52%" height={9} radius={5} />
              {index < 2 ? (
                <SkeletonBone width="38%" height={9} radius={5} />
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </SkeletonPulse>
  );
});

/** Rows shaped like a settings or menu group. */
export const AdminMenuSkeleton = memo(function AdminMenuSkeleton({
  count = 4,
  height = 56,
}: {
  count?: number;
  height?: number;
}) {
  return (
    <SkeletonPulse>
      <View style={styles.menu}>
        {Array.from({ length: count }, (_, index) => (
          <SkeletonBone
            key={index}
            height={height}
            radius={16}
            shimmer={index === 0}
            style={{ opacity: FADE[index] ?? 0.15 }}
          />
        ))}
      </View>
    </SkeletonPulse>
  );
});

const styles = StyleSheet.create({
  list: {
    gap: 9,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 16,
  },
  body: {
    flex: 1,
    gap: 9,
    paddingTop: 4,
  },
  menu: {
    gap: 9,
  },
});
