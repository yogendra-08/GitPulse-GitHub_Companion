import type { ReactNode } from 'react';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@/styles/index.css';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { DataProvider } from '@/features/data/DataProvider';
import { SettingsProvider } from '@/features/SettingsProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <DataProvider>
          <AuthProvider>{children}</AuthProvider>
        </DataProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
