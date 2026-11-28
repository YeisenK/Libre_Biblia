import type { Metadata } from 'next';
import { DiaryPage } from '@/components/diary/DiaryPage';

export const metadata: Metadata = { title: 'Mi diario' };

export default function Page() {
  return <DiaryPage />;
}
