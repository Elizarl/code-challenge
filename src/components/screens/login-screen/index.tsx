import { LoginForm } from '@/components/auth/login-form';
import { Main, PageShell } from '@/components/ui/layout';
import { copy } from '@/messages/es';

import styles from './style.module.css';

export function LoginScreen({ next }: { readonly next: string }) {
  return (
    <Main>
      <PageShell>
        <header className={styles['header']}>
          <span className={styles['mark']} aria-hidden="true">
            ◈
          </span>
          <h1 className={styles['title']}>{copy.login.heading}</h1>
          <p className={styles['subtitle']}>{copy.login.subtitle}</p>
        </header>
        <LoginForm next={next} />
      </PageShell>
    </Main>
  );
}
