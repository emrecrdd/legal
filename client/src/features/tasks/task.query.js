import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';

import taskApi from './task.api.js';
import toast from 'react-hot-toast';

// ======================================================
// QUERY KEYS
// ======================================================

export const TASK_QUERY_KEYS = {
  all: ['tasks'],

  list: (params = {}) => [
    'tasks',
    params,
  ],

  detail: (id) => [
    'task',
    id,
  ],

  myTasks: (params = {}) => [
    'my-tasks',
    params,
  ],

  overdue: () => [
    'my-overdue-tasks',
  ],

  upcoming: () => [
    'my-upcoming-tasks',
  ],

  statistics: () => [
    'task-statistics',
  ],

  notes: (id) => [
    'task-notes',
    id,
  ],

  byClient: (
    clientId,
    params = {}
  ) => [
    'client-tasks',
    clientId,
    params,
  ],

  clientOverview: (
    clientId,
    params = {}
  ) => [
    'client-task-overview',
    clientId,
    params,
  ],

  infinite: (params = {}) => [
    'tasks-infinite',
    params,
  ],

  search: (
    query,
    params = {}
  ) => [
    'tasks-search',
    query,
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

  LONG:
    10 * 60 * 1000,

  GC:
    10 * 60 * 1000,
};

// ======================================================
// INVALIDATE HELPERS
// ======================================================

const invalidateTaskLists = (
  queryClient
) => {
  queryClient.invalidateQueries({
    queryKey: [
      'tasks',
    ],
  });

  queryClient.invalidateQueries({
    queryKey: [
      'my-tasks',
    ],
  });

  queryClient.invalidateQueries({
    queryKey: [
      'my-overdue-tasks',
    ],
  });

  queryClient.invalidateQueries({
    queryKey: [
      'my-upcoming-tasks',
    ],
  });
};

const invalidateTask = (
  queryClient,
  id
) => {
  if (!id) {
    return;
  }

  queryClient.invalidateQueries({
    queryKey:
      TASK_QUERY_KEYS.detail(
        id
      ),
  });
};

const invalidateTaskNotes = (
  queryClient,
  id
) => {
  if (!id) {
    return;
  }

  queryClient.invalidateQueries({
    queryKey:
      TASK_QUERY_KEYS.notes(
        id
      ),
  });
};

const invalidateClientTasks = (
  queryClient,
  clientId
) => {
  if (clientId) {
    queryClient.invalidateQueries({
      queryKey: [
        'client-tasks',
        clientId,
      ],
    });

    queryClient.invalidateQueries({
      queryKey: [
        'client-task-overview',
        clientId,
      ],
    });

    queryClient.invalidateQueries({
      queryKey: [
        'client',
        clientId,
      ],
    });

    return;
  }

  /*
   * Mutation response/variables client_id vermiyorsa
   * mevcut client cockpit cache'lerini genel olarak
   * stale işaretle.
   */
  queryClient.invalidateQueries({
    queryKey: [
      'client-tasks',
    ],
  });

  queryClient.invalidateQueries({
    queryKey: [
      'client-task-overview',
    ],
  });
};

const invalidateCaseTasks = (
  queryClient,
  caseId
) => {
  if (!caseId) {
    return;
  }

  queryClient.invalidateQueries({
    queryKey: [
      'case',
      caseId,
    ],
  });
};

// ======================================================
// TOAST
// ======================================================

const success = (
  message
) => {
  toast.success(
    message
  );
};

const failure = (
  error,
  fallback
) => {
  toast.error(
    error?.response
      ?.data?.message ||
      error?.message ||
      fallback
  );
};

// ======================================================
// QUERIES
// ======================================================

export const useTasks = (
  params = {}
) => {
  return useQuery({
    queryKey:
      TASK_QUERY_KEYS.list(
        params
      ),

    queryFn: () =>
      taskApi.getAll(
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

export const useTask = (
  id
) => {
  return useQuery({
    queryKey:
      TASK_QUERY_KEYS.detail(
        id
      ),

    queryFn: () =>
      taskApi.getOne(
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

export const useMyTasks = (
  params = {}
) => {
  return useQuery({
    queryKey:
      TASK_QUERY_KEYS.myTasks(
        params
      ),

    queryFn: () =>
      taskApi.getMyTasks(
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

export const useMyOverdueTasks =
  () => {
    return useQuery({
      queryKey:
        TASK_QUERY_KEYS.overdue(),

      queryFn: () =>
        taskApi.getMyOverdue(),

      staleTime:
        CACHE.SHORT,

      gcTime:
        CACHE.GC,
    });
  };

export const useMyUpcomingTasks =
  () => {
    return useQuery({
      queryKey:
        TASK_QUERY_KEYS.upcoming(),

      queryFn: () =>
        taskApi.getMyUpcoming(),

      staleTime:
        CACHE.SHORT,

      gcTime:
        CACHE.GC,
    });
  };

export const useTaskStatistics =
  () => {
    return useQuery({
      queryKey:
        TASK_QUERY_KEYS.statistics(),

      queryFn: () =>
        taskApi.getStatistics(),

      staleTime:
        CACHE.LONG,

      gcTime:
        CACHE.GC,
    });
  };

export const useTaskNotes = (
  taskId
) => {
  return useQuery({
    queryKey:
      TASK_QUERY_KEYS.notes(
        taskId
      ),

    queryFn: () =>
      taskApi.getNotes(
        taskId
      ),

    enabled:
      Boolean(
        taskId
      ),

    staleTime:
      CACHE.SHORT,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// CLIENT TASKS
// ======================================================

export const useClientTasks = (
  clientId,
  params = {}
) => {
  return useQuery({
    queryKey:
      TASK_QUERY_KEYS.byClient(
        clientId,
        params
      ),

    queryFn: () =>
      taskApi.getByClient(
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
// CLIENT COCKPIT OVERVIEW
// ======================================================

export const useClientTaskOverview = (
  clientId,
  params = {
    active_limit: 5,
    recent_limit: 5,
  }
) => {
  return useQuery({
    queryKey:
      TASK_QUERY_KEYS.clientOverview(
        clientId,
        params
      ),

    queryFn: () =>
      taskApi.getClientOverview(
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

export const useCreateTask =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        data
      ) =>
        taskApi.create(
          data
        ),

      onSuccess: (
        _,
        variables
      ) => {
        invalidateTaskLists(
          queryClient
        );

        invalidateClientTasks(
          queryClient,
          variables?.client_id
        );

        invalidateCaseTasks(
          queryClient,
          variables?.case_id
        );

        queryClient.invalidateQueries({
          queryKey:
            TASK_QUERY_KEYS.statistics(),
        });

        success(
          'Görev başarıyla oluşturuldu'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'Görev oluşturulamadı'
        );
      },
    });
  };

// ======================================================
// UPDATE
// ======================================================

export const useUpdateTask =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          id,
          data,
        }) =>
          taskApi.update(
            id,
            data
          ),

      onSuccess: (
        _,
        variables
      ) => {
        invalidateTaskLists(
          queryClient
        );

        invalidateTask(
          queryClient,
          variables.id
        );

        invalidateClientTasks(
          queryClient,
          variables?.data
            ?.client_id
        );

        invalidateCaseTasks(
          queryClient,
          variables?.data
            ?.case_id
        );

        success(
          'Görev başarıyla güncellendi'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'Görev güncellenemedi'
        );
      },
    });
  };

// ======================================================
// DELETE
// ======================================================

export const useDeleteTask =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        id
      ) =>
        taskApi.delete(
          id
        ),

      onSuccess: (
        _,
        id
      ) => {
        invalidateTaskLists(
          queryClient
        );

        invalidateClientTasks(
          queryClient
        );

        queryClient.removeQueries({
          queryKey:
            TASK_QUERY_KEYS.detail(
              id
            ),
        });

        queryClient.invalidateQueries({
          queryKey:
            TASK_QUERY_KEYS.statistics(),
        });

        success(
          'Görev başarıyla silindi'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'Görev silinemedi'
        );
      },
    });
  };

// ======================================================
// STATUS
// ======================================================

export const useUpdateTaskStatus =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          id,
          status,
        }) =>
          taskApi.updateStatus(
            id,
            status
          ),

      onSuccess: (
        _,
        variables
      ) => {
        invalidateTaskLists(
          queryClient
        );

        invalidateTask(
          queryClient,
          variables.id
        );

        invalidateClientTasks(
          queryClient
        );

        success(
          'Görev durumu güncellendi'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'Durum güncellenemedi'
        );
      },
    });
  };

// ======================================================
// ASSIGN
// ======================================================

export const useAssignTask =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          id,
          assigned_to,
        }) =>
          taskApi.assignTask(
            id,
            assigned_to
          ),

      onSuccess: (
        _,
        variables
      ) => {
        invalidateTaskLists(
          queryClient
        );

        invalidateTask(
          queryClient,
          variables.id
        );

        invalidateClientTasks(
          queryClient
        );

        success(
          'Görev başarıyla atandı'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'Görev atanamadı'
        );
      },
    });
  };

// ======================================================
// START
// ======================================================

export const useStartTask =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        id
      ) =>
        taskApi.startTask(
          id
        ),

      onSuccess: (
        _,
        id
      ) => {
        invalidateTaskLists(
          queryClient
        );

        invalidateTask(
          queryClient,
          id
        );

        invalidateTaskNotes(
          queryClient,
          id
        );

        invalidateClientTasks(
          queryClient
        );

        success(
          'Görev başlatıldı'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'Görev başlatılamadı'
        );
      },
    });
  };

// ======================================================
// COMPLETE
// ======================================================

export const useCompleteTask =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          id,
          note,
          actual_hours,
        }) =>
          taskApi.completeTask(
            id,
            {
              note,
              actual_hours,
            }
          ),

      onSuccess: (
        _,
        variables
      ) => {
        invalidateTaskLists(
          queryClient
        );

        invalidateTask(
          queryClient,
          variables.id
        );

        invalidateTaskNotes(
          queryClient,
          variables.id
        );

        invalidateClientTasks(
          queryClient
        );

        success(
          'Görev tamamlandı. Onay bekleniyor.'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'Görev tamamlanamadı'
        );
      },
    });
  };

// ======================================================
// APPROVE
// ======================================================

export const useApproveTask =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        id
      ) =>
        taskApi.approveTask(
          id
        ),

      onSuccess: (
        _,
        id
      ) => {
        invalidateTaskLists(
          queryClient
        );

        invalidateTask(
          queryClient,
          id
        );

        invalidateTaskNotes(
          queryClient,
          id
        );

        invalidateClientTasks(
          queryClient
        );

        success(
          'Görev onaylandı'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'Görev onaylanamadı'
        );
      },
    });
  };

// ======================================================
// NOTES
// ======================================================

export const useAddNote =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          id,
          content,
        }) =>
          taskApi.addNote(
            id,
            content
          ),

      onSuccess: (
        _,
        variables
      ) => {
        invalidateTaskNotes(
          queryClient,
          variables.id
        );

        invalidateTask(
          queryClient,
          variables.id
        );

        success(
          'Not eklendi'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'Not eklenemedi'
        );
      },
    });
  };

// ======================================================
// PROGRESS
// ======================================================

export const useUpdateProgress =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          id,
          progress,
        }) =>
          taskApi.updateProgress(
            id,
            progress
          ),

      onSuccess: (
        _,
        variables
      ) => {
        invalidateTask(
          queryClient,
          variables.id
        );

        invalidateTaskLists(
          queryClient
        );

        invalidateClientTasks(
          queryClient
        );

        success(
          'İlerleme güncellendi'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'İlerleme güncellenemedi'
        );
      },
    });
  };

// ======================================================
// BULK STATUS
// ======================================================

export const useBulkUpdateTaskStatus =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        ({
          ids,
          status,
        }) =>
          Promise.allSettled(
            ids.map(
              (id) =>
                taskApi.updateStatus(
                  id,
                  status
                )
            )
          ),

      onSuccess: (
        results,
        variables
      ) => {
        invalidateTaskLists(
          queryClient
        );

        invalidateClientTasks(
          queryClient
        );

        const successful =
          results.filter(
            (result) =>
              result.status ===
              'fulfilled'
          ).length;

        const failed =
          results.length -
          successful;

        if (
          failed === 0
        ) {
          success(
            `${successful} görevin durumu güncellendi`
          );

          return;
        }

        if (
          successful > 0
        ) {
          toast(
            `${successful} görev güncellendi, ${failed} görev güncellenemedi`,
            {
              icon: '⚠️',
            }
          );

          return;
        }

        toast.error(
          'Toplu güncelleme başarısız'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
          'Toplu güncelleme başarısız'
        );
      },
    });
  };

// ======================================================
// INFINITE QUERY
// ======================================================

export const useInfiniteTasks = (
  params = {}
) => {
  return useInfiniteQuery({
    queryKey:
      TASK_QUERY_KEYS.infinite(
        params
      ),

    queryFn: ({
      pageParam = 1,
    }) =>
      taskApi.getAll({
        ...params,

        page:
          pageParam,
      }),

    initialPageParam:
      1,

    getNextPageParam: (
      lastPage
    ) => {
      const pagination =
        lastPage?.data
          ?.pagination;

      if (!pagination) {
        return undefined;
      }

      return pagination.page <
        pagination.totalPages
        ? pagination.page +
            1
        : undefined;
    },

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// PREFETCH
// ======================================================

export const prefetchTask = (
  queryClient,
  id
) => {
  return queryClient.prefetchQuery({
    queryKey:
      TASK_QUERY_KEYS.detail(
        id
      ),

    queryFn: () =>
      taskApi.getOne(
        id
      ),

    staleTime:
      CACHE.NORMAL,
  });
};

export const prefetchTasks = (
  queryClient,
  params = {}
) => {
  return queryClient.prefetchQuery({
    queryKey:
      TASK_QUERY_KEYS.list(
        params
      ),

    queryFn: () =>
      taskApi.getAll(
        params
      ),

    staleTime:
      CACHE.NORMAL,
  });
};

// ======================================================
// SEARCH
// ======================================================

export const useSearchTasks = (
  query,
  params = {}
) => {
  const normalizedQuery =
    typeof query ===
    'string'
      ? query.trim()
      : '';

  return useQuery({
    queryKey:
      TASK_QUERY_KEYS.search(
        normalizedQuery,
        params
      ),

    queryFn: () =>
      taskApi.getAll({
        ...params,

        search:
          normalizedQuery,
      }),

    enabled:
      normalizedQuery.length >=
      2,

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// EXPORT
// ======================================================

export default {
  useTasks,
  useTask,

  useMyTasks,
  useMyOverdueTasks,
  useMyUpcomingTasks,

  useTaskStatistics,
  useTaskNotes,

  useClientTasks,
  useClientTaskOverview,

  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useUpdateTaskStatus,
  useAssignTask,
  useStartTask,
  useCompleteTask,
  useApproveTask,
  useAddNote,
  useUpdateProgress,
  useBulkUpdateTaskStatus,

  useInfiniteTasks,
  useSearchTasks,

  prefetchTask,
  prefetchTasks,
};