import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { Alert } from 'react-native';

import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ success: boolean; message?: string }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  verifyOtp: (
    email: string,
    token: string
  ) => Promise<{ success: boolean; message?: string }>;
  resendOtp: (
    email: string
  ) => Promise<{ success: boolean; message?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get the current session on mount
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName?: string
    ): Promise<{ success: boolean; message?: string }> => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || '',
            },
          },
        });

        if (error) {
          return { success: false, message: error.message };
        }

        // Check if email confirmation is required
        if (data.user && !data.session) {
          return {
            success: true,
            message:
              'Account created! Please check your email to verify your account before signing in.',
          };
        }

        return { success: true };
      } catch (err) {
        return {
          success: false,
          message: 'An unexpected error occurred. Please try again.',
        };
      }
    },
    []
  );

  const signIn = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ success: boolean; message?: string }> => {
      try {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          return { success: false, message: error.message };
        }

        return { success: true };
      } catch (err) {
        return {
          success: false,
          message: 'An unexpected error occurred. Please try again.',
        };
      }
    },
    []
  );

  const verifyOtp = useCallback(
    async (
      email: string,
      token: string
    ): Promise<{ success: boolean; message?: string }> => {
      try {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: 'email',
        });
        if (error) {
          return { success: false, message: error.message };
        }
        // On success, Supabase creates a session automatically
        // and the onAuthStateChange listener will update state
        return { success: true };
      } catch (err) {
        return {
          success: false,
          message: 'An unexpected error occurred. Please try again.',
        };
      }
    },
    []
  );

  const resendOtp = useCallback(
    async (
      email: string
    ): Promise<{ success: boolean; message?: string }> => {
      try {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
        });
        if (error) {
          return { success: false, message: error.message };
        }
        return { success: true, message: 'A new OTP has been sent to your email.' };
      } catch (err) {
        return {
          success: false,
          message: 'Failed to resend OTP. Please try again.',
        };
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error', error.message);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, isLoading, signUp, signIn, verifyOtp, resendOtp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
