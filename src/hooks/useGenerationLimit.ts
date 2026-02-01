import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ANONYMOUS_DAILY_LIMIT = 5;
const SIGNED_IN_LIMIT = 8; // 5 base + 3 bonus

interface GenerationStatus {
  generationsUsed: number;
  generationsLimit: number | null;
  hasSubscription: boolean;
  isSignedIn: boolean;
  remainingGenerations: number;
  limitReached: boolean;
  showSignUpPrompt: boolean;
  showProPrompt: boolean;
}

export function useGenerationLimit() {
  const { user, subscription } = useAuth();
  const [status, setStatus] = useState<GenerationStatus>({
    generationsUsed: 0,
    generationsLimit: ANONYMOUS_DAILY_LIMIT,
    hasSubscription: false,
    isSignedIn: false,
    remainingGenerations: ANONYMOUS_DAILY_LIMIT,
    limitReached: false,
    showSignUpPrompt: false,
    showProPrompt: false,
  });
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    // If user has active subscription, unlimited access
    if (subscription?.subscribed) {
      setStatus({
        generationsUsed: 0,
        generationsLimit: null,
        hasSubscription: true,
        isSignedIn: true,
        remainingGenerations: Infinity,
        limitReached: false,
        showSignUpPrompt: false,
        showProPrompt: false,
      });
      setLoading(false);
      return;
    }

    // For anonymous users, check localStorage
    if (!user) {
      const today = new Date().toISOString().split('T')[0];
      const storedData = localStorage.getItem('visionary_anonymous_generations');
      let anonymousCount = 0;
      
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          if (parsed.date === today) {
            anonymousCount = parsed.count;
          }
        } catch (e) {
          console.error('Error parsing localStorage:', e);
        }
      }

      const remaining = Math.max(0, ANONYMOUS_DAILY_LIMIT - anonymousCount);
      const limitReached = remaining === 0;

      setStatus({
        generationsUsed: anonymousCount,
        generationsLimit: ANONYMOUS_DAILY_LIMIT,
        hasSubscription: false,
        isSignedIn: false,
        remainingGenerations: remaining,
        limitReached,
        showSignUpPrompt: limitReached,
        showProPrompt: false,
      });
      setLoading(false);
      return;
    }

    // For signed-in users without subscription, fetch from backend
    try {
      const { data, error } = await supabase.functions.invoke('get-generation-status');
      
      if (error) {
        console.error('Error fetching generation status:', error);
        setLoading(false);
        return;
      }

      const remaining = data.generationsLimit 
        ? Math.max(0, data.generationsLimit - data.generationsUsed)
        : Infinity;
      const limitReached = data.generationsLimit !== null && remaining === 0;

      setStatus({
        generationsUsed: data.generationsUsed,
        generationsLimit: data.generationsLimit,
        hasSubscription: data.hasSubscription,
        isSignedIn: true,
        remainingGenerations: remaining,
        limitReached,
        showSignUpPrompt: false,
        showProPrompt: limitReached && !data.hasSubscription,
      });
    } catch (error) {
      console.error('Error fetching generation status:', error);
    } finally {
      setLoading(false);
    }
  }, [user, subscription]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const incrementAnonymousCount = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const storedData = localStorage.getItem('visionary_anonymous_generations');
    let currentCount = 0;
    
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        if (parsed.date === today) {
          currentCount = parsed.count;
        }
      } catch (e) {
        console.error('Error parsing localStorage:', e);
      }
    }

    const newCount = currentCount + 1;
    localStorage.setItem('visionary_anonymous_generations', JSON.stringify({
      date: today,
      count: newCount,
    }));

    const remaining = Math.max(0, ANONYMOUS_DAILY_LIMIT - newCount);
    const limitReached = remaining === 0;

    setStatus(prev => ({
      ...prev,
      generationsUsed: newCount,
      remainingGenerations: remaining,
      limitReached,
      showSignUpPrompt: limitReached,
    }));
  }, []);

  const updateFromResponse = useCallback((responseData: {
    generationsUsed?: number;
    generationsLimit?: number | null;
    hasSubscription?: boolean;
  }) => {
    if (responseData.generationsLimit === null || responseData.hasSubscription) {
      setStatus(prev => ({
        ...prev,
        hasSubscription: true,
        remainingGenerations: Infinity,
        limitReached: false,
        showProPrompt: false,
      }));
      return;
    }

    if (responseData.generationsUsed !== undefined && responseData.generationsLimit !== undefined) {
      const remaining = Math.max(0, responseData.generationsLimit - responseData.generationsUsed);
      const limitReached = remaining === 0;

      setStatus(prev => ({
        ...prev,
        generationsUsed: responseData.generationsUsed!,
        generationsLimit: responseData.generationsLimit!,
        remainingGenerations: remaining,
        limitReached,
        showProPrompt: limitReached,
      }));
    }
  }, []);

  return {
    ...status,
    loading,
    refresh: fetchStatus,
    incrementAnonymousCount,
    updateFromResponse,
  };
}
