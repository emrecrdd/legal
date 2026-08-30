import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import meetingApi from './meeting.api.js';

import toast from 'react-hot-toast';

// ======================================================
// QUERY KEYS
// ======================================================

export const MEETING_QUERY_KEYS = {
  all: [
    'meetings',
  ],

  list: (
    params = {}
  ) => [
    'meetings',
    params,
  ],

  detail: (
    id
  ) => [
    'meeting',
    id,
  ],

  my: (
    params = {}
  ) => [
    'my-meetings',
    params,
  ],

  upcoming: (
    params = {}
  ) => [
    'upcoming-meetings',
    params,
  ],

  byCase: (
    caseId,
    params = {}
  ) => [
    'case-meetings',
    caseId,
    params,
  ],

  byClient: (
    clientId,
    params = {}
  ) => [
    'client-meetings',
    clientId,
    params,
  ],

  clientTimeline: (
    clientId,
    params = {}
  ) => [
    'client-meeting-timeline',
    clientId,
    params,
  ],
};

// ======================================================
// CACHE
// ======================================================

const CACHE = {
  SHORT:
    60 * 1000,

  NORMAL:
    5 * 60 * 1000,

  GC:
    10 * 60 * 1000,
};

// ======================================================
// QUERIES
// ======================================================

export const useMeetings = (
  params = {}
) => {
  return useQuery({
    queryKey:
      MEETING_QUERY_KEYS.list(
        params
      ),

    queryFn: () =>
      meetingApi.getAll(
        params
      ),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,

    placeholderData:
      (
        previousData
      ) =>
        previousData,
  });
};

export const useMeeting = (
  id
) => {
  return useQuery({
    queryKey:
      MEETING_QUERY_KEYS.detail(
        id
      ),

    queryFn: () =>
      meetingApi.getOne(
        id
      ),

    enabled:
      Boolean(id),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,
  });
};

export const useMyMeetings = (
  params = {}
) => {
  return useQuery({
    queryKey:
      MEETING_QUERY_KEYS.my(
        params
      ),

    queryFn: () =>
      meetingApi.getMyMeetings(
        params
      ),

    staleTime:
      CACHE.SHORT,

    gcTime:
      CACHE.GC,

    placeholderData:
      (
        previousData
      ) =>
        previousData,
  });
};

export const useUpcomingMeetings = (
  params = {}
) => {
  return useQuery({
    queryKey:
      MEETING_QUERY_KEYS.upcoming(
        params
      ),

    queryFn: () =>
      meetingApi.getUpcoming(
        params
      ),

    staleTime:
      CACHE.SHORT,

    gcTime:
      CACHE.GC,
  });
};

export const useCaseMeetings = (
  caseId,
  params = {}
) => {
  return useQuery({
    queryKey:
      MEETING_QUERY_KEYS.byCase(
        caseId,
        params
      ),

    queryFn: () =>
      meetingApi.getByCase(
        caseId,
        params
      ),

    enabled:
      Boolean(
        caseId
      ),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,

    placeholderData:
      (
        previousData
      ) =>
        previousData,
  });
};

export const useClientMeetings = (
  clientId,
  params = {}
) => {
  return useQuery({
    queryKey:
      MEETING_QUERY_KEYS.byClient(
        clientId,
        params
      ),

    queryFn: () =>
      meetingApi.getByClient(
        clientId,
        params
      ),

    enabled:
      Boolean(
        clientId
      ),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,

    placeholderData:
      (
        previousData
      ) =>
        previousData,
  });
};

// ======================================================
// CLIENT COCKPIT TIMELINE
// ======================================================

export const useClientMeetingTimeline = (
  clientId,
  params = {
    upcoming_limit: 5,
    recent_limit: 5,
  }
) => {
  return useQuery({
    queryKey:
      MEETING_QUERY_KEYS.clientTimeline(
        clientId,
        params
      ),

    queryFn: () =>
      meetingApi.getClientTimeline(
        clientId,
        params
      ),

    enabled:
      Boolean(
        clientId
      ),

    staleTime:
      CACHE.SHORT,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// CREATE
// ======================================================

export const useCreateMeeting =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        data
      ) =>
        meetingApi.create(
          data
        ),

      onSuccess: (
        _,
        variables
      ) => {
        queryClient.invalidateQueries({
          queryKey:
            MEETING_QUERY_KEYS.all,
        });

        queryClient.invalidateQueries({
          queryKey: [
            'my-meetings',
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            'upcoming-meetings',
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            'calendar-meetings',
          ],
        });

        if (
          variables?.client_id
        ) {
          queryClient.invalidateQueries({
            queryKey: [
              'client-meetings',
              variables.client_id,
            ],
          });

          queryClient.invalidateQueries({
            queryKey: [
              'client-meeting-timeline',
              variables.client_id,
            ],
          });

          queryClient.invalidateQueries({
            queryKey: [
              'client',
              variables.client_id,
            ],
          });
        }

        if (
          variables?.case_id
        ) {
          queryClient.invalidateQueries({
            queryKey: [
              'case-meetings',
              variables.case_id,
            ],
          });

          queryClient.invalidateQueries({
            queryKey: [
              'case',
              variables.case_id,
            ],
          });
        }

        toast.success(
          'Toplantı başarıyla oluşturuldu'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          error?.response
            ?.data?.message ||
            'Toplantı oluşturulamadı'
        );
      },
    });
  };

// ======================================================
// UPDATE
// ======================================================

export const useUpdateMeeting =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          id,
          data,
        }) =>
          meetingApi.update(
            id,
            data
          ),

      onSuccess: (
        _,
        variables
      ) => {
        queryClient.invalidateQueries({
          queryKey:
            MEETING_QUERY_KEYS.all,
        });

        queryClient.invalidateQueries({
          queryKey:
            MEETING_QUERY_KEYS.detail(
              variables.id
            ),
        });

        queryClient.invalidateQueries({
          queryKey: [
            'my-meetings',
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            'upcoming-meetings',
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            'calendar-meetings',
          ],
        });

        if (
          variables?.data
            ?.client_id
        ) {
          queryClient.invalidateQueries({
            queryKey: [
              'client-meetings',
              variables.data
                .client_id,
            ],
          });

          queryClient.invalidateQueries({
            queryKey: [
              'client-meeting-timeline',
              variables.data
                .client_id,
            ],
          });

          queryClient.invalidateQueries({
            queryKey: [
              'client',
              variables.data
                .client_id,
            ],
          });
        }

        if (
          variables?.data
            ?.case_id
        ) {
          queryClient.invalidateQueries({
            queryKey: [
              'case-meetings',
              variables.data
                .case_id,
            ],
          });

          queryClient.invalidateQueries({
            queryKey: [
              'case',
              variables.data
                .case_id,
            ],
          });
        }

        toast.success(
          'Toplantı güncellendi'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          error?.response
            ?.data?.message ||
            'Toplantı güncellenemedi'
        );
      },
    });
  };

// ======================================================
// STATUS
// ======================================================

export const useUpdateMeetingStatus =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          id,
          status,
        }) =>
          meetingApi.updateStatus(
            id,
            status
          ),

      onSuccess: (
        _,
        variables
      ) => {
        queryClient.invalidateQueries({
          queryKey:
            MEETING_QUERY_KEYS.all,
        });

        queryClient.invalidateQueries({
          queryKey:
            MEETING_QUERY_KEYS.detail(
              variables.id
            ),
        });

        queryClient.invalidateQueries({
          queryKey: [
            'my-meetings',
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            'upcoming-meetings',
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            'calendar-meetings',
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            'client-meeting-timeline',
          ],
        });

        toast.success(
          'Toplantı durumu güncellendi'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          error?.response
            ?.data?.message ||
            'Toplantı durumu güncellenemedi'
        );
      },
    });
  };

// ======================================================
// DELETE
// ======================================================

export const useDeleteMeeting =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        id
      ) =>
        meetingApi.delete(
          id
        ),

      onSuccess: (
        _,
        id
      ) => {
        queryClient.invalidateQueries({
          queryKey:
            MEETING_QUERY_KEYS.all,
        });

        queryClient.removeQueries({
          queryKey:
            MEETING_QUERY_KEYS.detail(
              id
            ),
        });

        queryClient.invalidateQueries({
          queryKey: [
            'my-meetings',
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            'upcoming-meetings',
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            'calendar-meetings',
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            'client-meetings',
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            'client-meeting-timeline',
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            'case-meetings',
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            'client',
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            'case',
          ],
        });

        toast.success(
          'Toplantı kaldırıldı'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          error?.response
            ?.data?.message ||
            'Toplantı kaldırılamadı'
        );
      },
    });
  };

// ======================================================
// PREFETCH
// ======================================================

export const prefetchMeeting = (
  queryClient,
  id
) => {
  return queryClient.prefetchQuery({
    queryKey:
      MEETING_QUERY_KEYS.detail(
        id
      ),

    queryFn: () =>
      meetingApi.getOne(
        id
      ),

    staleTime:
      CACHE.NORMAL,
  });
};