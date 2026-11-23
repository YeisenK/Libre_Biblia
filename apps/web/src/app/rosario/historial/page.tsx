import { RosaryHistory } from '@/components/rosary/RosaryHistory';
import { PrayerScreen } from '@/components/ui';

export const metadata = { title: 'Historial del Rosario' };

export default function Page() {
  return (
    <PrayerScreen>
      <RosaryHistory />
    </PrayerScreen>
  );
}
