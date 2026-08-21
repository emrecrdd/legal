import {
  useQuery,
} from '@tanstack/react-query';

import performanceApi from './performance.api.js';

// ======================================================
// QUERY KEYS
// ======================================================

export const performanceQueryKeys = {
  all: [
    'performance',
  ],

  my: () => [
    ...performanceQueryKeys.all,
    'me',
  ],

  overview: () => [
    ...performanceQueryKeys.all,
    'overview',
  ],

  users: () => [
    ...performanceQueryKeys.all,
    'users',
  ],

  user: (
    userId
  ) => [
    ...performanceQueryKeys.all,
    'user',
    userId,
  ],
};

// ======================================================
// MY PERFORMANCE
// ======================================================

export const useMyPerformance = (
  options = {}
) => {
  return useQuery({
    queryKey:
      performanceQueryKeys.my(),

    queryFn:
      performanceApi.getMyPerformance,

    ...options,
  });
};

// ======================================================
// TEAM OVERVIEW
// ======================================================

export const useTeamPerformanceOverview = (
  options = {}
) => {
  return useQuery({
    queryKey:
      performanceQueryKeys.overview(),

    queryFn:
      performanceApi.getTeamOverview,

    ...options,
  });
};

// ======================================================
// ALL USERS PERFORMANCE
// ======================================================

export const useUsersPerformance = (
  options = {}
) => {
  return useQuery({
    queryKey:
      performanceQueryKeys.users(),

    queryFn:
      performanceApi.getUsersPerformance,

    ...options,
  });
};

// ======================================================
// SINGLE USER PERFORMANCE
// ======================================================

export const useUserPerformance = (
  userId,
  options = {}
) => {
  return useQuery({
    queryKey:
      performanceQueryKeys.user(
        userId
      ),

    queryFn: () =>
      performanceApi.getUserPerformance(
        userId
      ),

    enabled:
      Boolean(
        userId
      ) &&
      (
        options.enabled ??
        true
      ),

    ...options,
  });
};