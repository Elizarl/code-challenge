import type { Metadata } from 'next';

import { HomeScreen } from '@/components/screens/home-screen';
import { copy } from '@/messages/es';
import { requireSessionOrRedirect } from '@/server/guards';
import { findUser } from '@/server/store';

export const metadata: Metadata = {
  title: copy.titles.home,
};

export default async function HomePage() {
  const session = await requireSessionOrRedirect('/home');

  const user = findUser(session.userId);

  return <HomeScreen displayName={user?.fullName ?? session.handle} />;
}
