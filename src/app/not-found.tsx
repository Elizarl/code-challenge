import type { Metadata } from 'next';

import { NotFoundScreen } from '@/components/screens/not-found-screen';
import { copy } from '@/messages/es';

export const metadata: Metadata = {
  title: copy.titles.notFound,
};

export default function NotFound() {
  return <NotFoundScreen />;
}
