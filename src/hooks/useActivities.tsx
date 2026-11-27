
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getActivityUserName, listRecentActivities, type ActivityRecord } from '@/data/activities';
import { subscribeToActivityInserts } from '@/data/realtime';
import { useAuth } from '@/hooks/useAuth';

export function useActivities(active = true) {
  const { user } = useAuth();
  const userId = user?.id;
  const [liveState, setLiveState] = useState<{ userId: string | undefined; items: ActivityRecord[] }>({
    userId,
    items: [],
  });

  const {
    data: initialActivities,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['activities', user?.id],
    queryFn: listRecentActivities,
    staleTime: 60_000,
    enabled: active && Boolean(user?.id),
  });

  useEffect(() => {
    if (!active || !userId) return;
    let subscribed = true;
    const unsubscribe = subscribeToActivityInserts((activity) => {
      void getActivityUserName(activity.user_id).then((userName) => {
          if (!subscribed) return;
          const newActivity = {
            ...activity,
            user_name: userName,
          };

          setLiveState((previous) => {
            const previousItems = previous.userId === userId ? previous.items : [];
            return {
              userId,
              items: [
                newActivity,
                ...previousItems.filter((item) => item.id !== activity.id).slice(0, 9),
              ],
            };
          });
        }).catch((error: unknown) => {
          console.error('Failed to load activity author:', error);
        });
    });

    return () => {
      subscribed = false;
      unsubscribe();
    };
  }, [active, userId]);

  const liveActivities = liveState.userId === userId ? liveState.items : [];
  const activities = new Map<string, ActivityRecord>();
  for (const activity of liveActivities) activities.set(activity.id, activity);
  for (const activity of initialActivities ?? []) {
    if (!activities.has(activity.id)) activities.set(activity.id, activity);
  }

  return {
    activities: [...activities.values()].slice(0, 10),
    isLoading,
    isError,
    refetch,
  };
}
