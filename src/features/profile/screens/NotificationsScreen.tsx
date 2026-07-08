import { memo, useState } from 'react';

import { Section } from '@/components/layout';
import { ProfileSubScreenLayout } from '@/features/profile/components/ProfileSubScreenLayout';
import { ProfileToggleRow } from '@/features/profile/components/ProfileToggleRow';

export const NotificationsScreen = memo(function NotificationsScreen() {
  const [dailyReminder, setDailyReminder] = useState(true);
  const [newBooks, setNewBooks] = useState(true);
  const [readingGoals, setReadingGoals] = useState(true);
  const [promotions, setPromotions] = useState(false);

  return (
    <ProfileSubScreenLayout
      title="Notifications"
      subtitle="Choose what you want to be notified about.">
      <Section title="Reading">
        <ProfileToggleRow
          label="Daily reminder"
          description="A gentle nudge to keep your streak going"
          value={dailyReminder}
          onValueChange={setDailyReminder}
        />
        <ProfileToggleRow
          label="Reading goals"
          description="Updates on your weekly progress"
          value={readingGoals}
          onValueChange={setReadingGoals}
          isLast
        />
      </Section>

      <Section title="Library" className="mt-7">
        <ProfileToggleRow
          label="New book releases"
          description="When fresh titles are added"
          value={newBooks}
          onValueChange={setNewBooks}
        />
        <ProfileToggleRow
          label="Offers & updates"
          description="Occasional news from Ilm o Irfan"
          value={promotions}
          onValueChange={setPromotions}
          isLast
        />
      </Section>
    </ProfileSubScreenLayout>
  );
});
