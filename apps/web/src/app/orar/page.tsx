import type { Metadata } from 'next';
import { PrayerHub } from '@/components/prayer/PrayerHub';

export const metadata: Metadata = { title: 'Orar' };
export default function Page() {
  return <PrayerHub />;
}
