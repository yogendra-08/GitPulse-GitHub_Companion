import { createRoot } from 'react-dom/client';
import { Providers } from '@/app/Providers';
import SettingsPage from '@/pages/SettingsPage';

createRoot(document.getElementById('root')!).render(
  <Providers>
    <SettingsPage standalone />
  </Providers>,
);
