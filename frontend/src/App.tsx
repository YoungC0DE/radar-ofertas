import { RouterProvider } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthProvider.js';
import { ConfirmProvider } from './components/feedback/ConfirmProvider.js';
import { ToastProvider } from './components/feedback/ToastProvider.js';
import { router } from './routes/router.js';
import { ThemeProvider } from './theme/ThemeProvider.js';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <RouterProvider router={router} />
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
