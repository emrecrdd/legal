import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import eventApi from './event.api.js';
import toast from 'react-hot-toast';

// ======================================================
// QUERY KEYS
// ======================================================

export const EVENT_QUERY_KEYS = {
  all: ['events'],

  list: (params = {}) => [
    'events',
    params,
  ],

  detail: (id) => [
    'event',
    id,
  ],

  myEvents: () => [
    'my-events',
  ],

  calendar: (params = {}) => [
    'calendar-events',
    params,
  ],

  byCase: (caseId) => [
    'case-events',
    caseId,
  ],
};

// ======================================================
// INVALIDATION
// ======================================================

const invalidateEventLists = (
  queryClient
) => {
  queryClient.invalidateQueries({
    queryKey: ['events'],
  });

  queryClient.invalidateQueries({
    queryKey: ['my-events'],
  });

  queryClient.invalidateQueries({
    queryKey: ['calendar-events'],
  });

  queryClient.invalidateQueries({
    queryKey: ['case-events'],
  });
};

const invalidateEventCrossViews = (
  queryClient
) => {
  // Dashboard sayaçları
  queryClient.invalidateQueries({
    queryKey: ['dashboard-stats'],
  });

  // Dava detay ekranları
  queryClient.invalidateQueries({
    queryKey: ['case'],
  });

  /*
   * Dashboard duruşmaları ayrı bir query key
   * kullanıyorsa buraya GERÇEK key'i ekle.
   *
   * Örnek:
   *
   * queryClient.invalidateQueries({
   *   queryKey: ['dashboard-events'],
   * });
   *
   * Ama dashboard kodunu görmeden
   * bu key'i uydurmuyoruz.
   */
};

// ======================================================
// QUERIES
// ======================================================

export const useEvents = (
  params = {}
) => {
  return useQuery({
    queryKey:
      EVENT_QUERY_KEYS.list(params),

    queryFn: () =>
      eventApi.getAll(params),
  });
};

export const useEvent = (
  id
) => {
  return useQuery({
    queryKey:
      EVENT_QUERY_KEYS.detail(id),

    queryFn: () =>
      eventApi.getOne(id),

    enabled:
      Boolean(id),
  });
};

export const useMyEvents =
  () => {
    return useQuery({
      queryKey:
        EVENT_QUERY_KEYS.myEvents(),

      queryFn: () =>
        eventApi.getMyEvents(),
    });
  };

export const useCalendarEvents = (
  params = {}
) => {
  return useQuery({
    queryKey:
      EVENT_QUERY_KEYS.calendar(
        params
      ),

    queryFn: () =>
      eventApi.getCalendarEvents(
        params
      ),
  });
};

export const useCaseEvents = (
  caseId
) => {
  return useQuery({
    queryKey:
      EVENT_QUERY_KEYS.byCase(
        caseId
      ),

    queryFn: () =>
      eventApi.getByCase(
        caseId
      ),

    enabled:
      Boolean(caseId),
  });
};

// ======================================================
// CREATE
// ======================================================

export const useCreateEvent =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (data) =>
        eventApi.create(data),

      onSuccess: () => {
        invalidateEventLists(
          queryClient
        );

        invalidateEventCrossViews(
          queryClient
        );

        toast.success(
          'Duruşma başarıyla oluşturuldu'
        );
      },

      onError: (error) => {
        toast.error(
          error?.response?.data?.message ||
          error?.message ||
          'Duruşma oluşturulamadı'
        );
      },
    });
  };

// ======================================================
// UPDATE
// ======================================================

export const useUpdateEvent =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: ({
        id,
        data,
      }) =>
        eventApi.update(
          id,
          data
        ),

      onSuccess: (
        _,
        variables
      ) => {
        queryClient.invalidateQueries({
          queryKey:
            EVENT_QUERY_KEYS.detail(
              variables.id
            ),
        });

        invalidateEventLists(
          queryClient
        );

        invalidateEventCrossViews(
          queryClient
        );

        toast.success(
          'Duruşma başarıyla güncellendi'
        );
      },

      onError: (error) => {
        toast.error(
          error?.response?.data?.message ||
          error?.message ||
          'Duruşma güncellenemedi'
        );
      },
    });
  };

// ======================================================
// STATUS
// ======================================================

export const useUpdateEventStatus =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: ({
        id,
        status,
      }) =>
        eventApi.updateStatus(
          id,
          status
        ),

      onSuccess: (
        _,
        variables
      ) => {
        queryClient.invalidateQueries({
          queryKey:
            EVENT_QUERY_KEYS.detail(
              variables.id
            ),
        });

        invalidateEventLists(
          queryClient
        );

        invalidateEventCrossViews(
          queryClient
        );

        toast.success(
          'Duruşma durumu güncellendi'
        );
      },

      onError: (error) => {
        toast.error(
          error?.response?.data?.message ||
          error?.message ||
          'Duruşma durumu güncellenemedi'
        );
      },
    });
  };

// ======================================================
// DELETE
// ======================================================

export const useDeleteEvent =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (id) =>
        eventApi.remove(id),

      onSuccess: (
        _,
        id
      ) => {
        queryClient.removeQueries({
          queryKey:
            EVENT_QUERY_KEYS.detail(
              id
            ),
          exact: true,
        });

        invalidateEventLists(
          queryClient
        );

        invalidateEventCrossViews(
          queryClient
        );

        toast.success(
          'Duruşma başarıyla silindi'
        );
      },

      onError: (error) => {
        toast.error(
          error?.response?.data?.message ||
          error?.message ||
          'Duruşma silinemedi'
        );
      },
    });
  };

export default {
  useEvents,
  useEvent,
  useMyEvents,
  useCalendarEvents,
  useCaseEvents,

  useCreateEvent,
  useUpdateEvent,
  useUpdateEventStatus,
  useDeleteEvent,
};