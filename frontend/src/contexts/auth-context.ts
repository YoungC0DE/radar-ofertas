import { createContext } from 'react';

import type { PublicUser } from '../types/api.js';

export type AuthContextValue = {
  readonly user: PublicUser | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly login: (
    username: string,
    password: string,
    options?: { rememberMe?: boolean },
  ) => Promise<void>;
  readonly logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
