import {
  BrowserRouter,
} from 'react-router-dom';

import {
  Toaster,
} from 'react-hot-toast';

import {
  QueryProvider,
} from './app/providers/query.provider.jsx';

import {
  AuthProvider,
} from './app/providers/auth.provider.jsx';

import {
  ThemeProvider,
} from './app/providers/theme.provider.jsx';

import AppRouter from './app/router/index.jsx';

function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <AuthProvider>
          <ThemeProvider>
            <AppRouter />

            <Toaster
              position="top-right"
              toastOptions={{
                duration:
                  3500,
              }}
            />
          </ThemeProvider>
        </AuthProvider>
      </QueryProvider>
    </BrowserRouter>
  );
}

export default App;