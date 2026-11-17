import { createRoot } from 'react-dom/client';
import { Providers } from '@/app/Providers';
import { PopupApp } from './PopupApp';

createRoot(document.getElementById('root')!).render(
  <Providers>
    <PopupApp />
  </Providers>,
);
