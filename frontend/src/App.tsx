import { RouterProvider } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthProvider.js';
import { ToastProvider } from './components/feedback/ToastProvider.js';
import { router } from './routes/router.js';
import { ThemeProvider } from './theme/ThemeProvider.js';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
