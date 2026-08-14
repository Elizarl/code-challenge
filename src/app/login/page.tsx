import type { Metadata } from 'next';

import { LoginScreen } from '@/components/screens/login-screen';
import { copy } from '@/messages/es';

export const metadata: Metadata = {
  title: copy.titles.login,
};

export default async function LoginPage(props: PageProps<'/login'>) {
  const searchParams = await props.searchParams;
  const rawNext = searchParams['next'];
  const next = typeof rawNext === 'string' ? rawNext : '/home';

  return <LoginScreen next={next} />;
}
