import { useEffect, useState } from 'react';
import { subscribeToLoading } from '../api/axios';

/**
 * Subscribes to the global Axios request counter so any component
 * (e.g. a top progress bar) can show a loading indicator automatically,
 * without every page having to manage its own "isLoading" flag for
 * network activity.
 */
export default function useGlobalLoading() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToLoading(setIsLoading);
    return unsubscribe;
  }, []);

  return isLoading;
}
