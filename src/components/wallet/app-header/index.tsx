'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { logout } from '@/api/client';
import { Button } from '@/components/ui/button';
import { copy } from '@/messages/es';

import styles from './style.module.css';

export function AppHeader({ name }: { readonly name: string }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    setSigningOut(true);
    await logout();
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className={styles['header']}>
      <div className={styles['greeting']}>
        <span className={styles['label']}>{copy.home.greeting}</span>
        <h1 className={styles['name']}>{name}</h1>
      </div>

      <Button variant="ghost" onClick={() => void handleLogout()} loading={signingOut}>
        {copy.home.signOut}
      </Button>
    </header>
  );
}
