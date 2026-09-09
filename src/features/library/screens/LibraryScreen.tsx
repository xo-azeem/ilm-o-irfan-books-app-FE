import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/app/navigation/types';
import { api } from '@/api';
import { Screen, ScreenHeader, Section } from '@/components/layout';
import { DisplayText, Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import type { ReadingBook } from '@/features/library/data/libraryContent';
import { palette } from '@/theme/palette';

import { FinishedBookCard } from '../components/FinishedBookCard';
import { InProgressSection } from '../components/InProgressSection';
import { LibraryShelfRow } from '../components/LibraryShelfRow';
import {
  Bookmark,
  CheckCircle2,
  Download,
  Heart,
  Highlighter,
} from 'lucide-react-native';

type ShelfCounts = {
  wishlist: number;
  downloads: number;
  highlights: number;
  finished: number;
};

function SectionHeading({ title, action }: { title: string; action?: string }) {
  return (
    <View className="mb-3 flex-row items-end justify-between">
      <DisplayText className="text-[20px] font-semibold tracking-tight text-app-ink dark:text-app-ink-dark">
        {title}
      </DisplayText>
      {action ? (
        <Text className="text-[14px] font-medium text-app-primary dark:text-app-primary-dark">
          {action}
        </Text>
      ) : null}
    </View>
  );
}

function mapProgressItem(item: {
  book_id?: string;
  progress?: number;
  current_page?: number | null;
  total_pages?: number | null;
  chapter_label?: string | null;
  book?: {
    id?: string;
    title?: string;
    cover_color?: string | null;
    cover_color_dark?: string | null;
    coverUrl?: string | null;
    author?: { name?: string } | null;
    author_name?: string | null;
  };
}): ReadingBook {
  const book = item.book ?? {};
  const progress = typeof item.progress === 'number' ? item.progress : 0;
  const remaining = Math.max(0, 1 - progress);
  const mins = Math.round(remaining * 45);
  return {
    id: book.id ?? item.book_id ?? '',
    title: book.title ?? 'Untitled',
    author: book.author?.name ?? book.author_name ?? 'Unknown author',
    chapter: item.chapter_label ?? (item.current_page ? `Page ${item.current_page}` : 'Continue'),
    timeLeft: mins > 0 ? `~${mins} min left` : 'Almost done',
    progress,
    coverColor: book.cover_color ?? palette.green,
    coverColorDark: book.cover_color_dark ?? '#1A332C',
  };
}

export function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [inProgress, setInProgress] = useState<ReadingBook[]>([]);
  const [finished, setFinished] = useState<ReadingBook[]>([]);
  const [counts, setCounts] = useState<ShelfCounts>({
    wishlist: 0,
    downloads: 0,
    highlights: 0,
    finished: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await api.libraryOverview();
      const reading = (overview.readingProgress as { items?: unknown[] })?.items ?? [];
      const done = (overview.finished as { items?: unknown[] })?.items ?? [];
      const wishlist = (overview.wishlist as { totalCount?: number })?.totalCount ?? 0;
      const downloads = (overview.downloads as { totalCount?: number })?.totalCount ?? 0;
      const highlights = (overview.highlights as { totalCount?: number })?.totalCount ?? 0;
      const finishedCount =
        (overview.finished as { totalCount?: number })?.totalCount ?? done.length;

      setInProgress(reading.map(row => mapProgressItem(row as never)));
      setFinished(done.map(row => mapProgressItem(row as never)));
      setCounts({
        wishlist,
        downloads,
        highlights,
        finished: finishedCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load library');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shelves = [
    {
      id: 'wishlist',
      label: 'Wishlist',
      count: `${counts.wishlist}`,
      icon: Heart,
      accent: palette.green,
      accentDark: palette.yellowGreen,
      onPress: () => navigation.navigate(ROUTES.WISHLIST),
    },
    {
      id: 'downloads',
      label: 'Downloads',
      count: `${counts.downloads}`,
      icon: Download,
      accent: palette.green,
      accentDark: palette.yellowGreen,
    },
    {
      id: 'highlights',
      label: 'Highlights',
      count: `${counts.highlights}`,
      icon: Highlighter,
      accent: palette.green,
      accentDark: palette.yellowGreen,
    },
    {
      id: 'finished',
      label: 'Finished',
      count: `${counts.finished}`,
      icon: CheckCircle2,
      accent: palette.green,
      accentDark: palette.yellowGreen,
    },
  ];

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg dark:bg-app-bg-dark">
        <ActivityIndicator size="large" color={palette.green} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-app-bg px-6 dark:bg-app-bg-dark">
        <Text className="text-center text-app-muted dark:text-app-muted-dark">{error}</Text>
        <Pressable onPress={() => void load()} className="rounded-xl bg-app-primary px-4 py-2">
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="My Library" subtitle="Pick up where you left off." />

      <InProgressSection books={inProgress} />

      <View className="mb-8">
        <SectionHeading title="Shelves" />
        <Section>
          {shelves.map((shelf, index) => (
            <LibraryShelfRow
              key={shelf.id}
              shelf={{
                id: shelf.id,
                label: shelf.label,
                count: shelf.count,
                icon: shelf.icon,
                accent: shelf.accent,
                accentDark: shelf.accentDark,
              }}
              isLast={index === shelves.length - 1}
              onPress={shelf.onPress}
            />
          ))}
        </Section>
      </View>

      {finished.length > 0 ? (
        <View className="mb-2">
          <SectionHeading title="Recently finished" />
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-4 pr-5">
            {finished.map(book => (
              <Pressable
                key={book.id}
                onPress={() =>
                  navigation.navigate(ROUTES.BOOK_DETAIL, { bookId: book.id })
                }>
                <FinishedBookCard book={book} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {inProgress.length === 0 && finished.length === 0 ? (
        <View className="items-center rounded-[16px] border border-app-border bg-app-surface px-6 py-12 dark:border-app-border-dark dark:bg-app-surface-dark">
          <Bookmark size={22} color={palette.green} />
          <DisplayText className="mt-3 text-center text-[17px] font-semibold text-app-ink dark:text-app-ink-dark">
            Your library is empty
          </DisplayText>
          <Text className="mt-2 text-center text-[14px] text-app-muted dark:text-app-muted-dark">
            Open a book to start tracking progress.
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}
