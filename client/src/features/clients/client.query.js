import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import clientApi from './client.api.js';

import toast from 'react-hot-toast';

// ======================================================
// QUERY KEYS
// ======================================================

export const CLIENT_QUERY_KEYS = {
  all: [
    'clients',
  ],

  lists: () => [
    ...CLIENT_QUERY_KEYS.all,
    'list',
  ],

  list: (
    params = {}
  ) => [
    ...CLIENT_QUERY_KEYS.lists(),
    params,
  ],

  detail: (
    id
  ) => [
    ...CLIENT_QUERY_KEYS.all,
    'detail',
    id,
  ],

  statistics: () => [
    ...CLIENT_QUERY_KEYS.all,
    'statistics',
  ],

  caseHistory: (
    clientId
  ) => [
    ...CLIENT_QUERY_KEYS.all,
    'case-history',
    clientId,
  ],

  payments: (
    clientId
  ) => [
    ...CLIENT_QUERY_KEYS.all,
    'payments',
    clientId,
  ],

  notes: (
    clientId
  ) => [
    ...CLIENT_QUERY_KEYS.all,
    'notes',
    clientId,
  ],

  infinite: (
    params = {}
  ) => [
    ...CLIENT_QUERY_KEYS.all,
    'infinite',
    params,
  ],
};

// ======================================================
// CACHE
// ======================================================

const CACHE = {
  LIST:
    2 * 60 * 1000,

  DETAIL:
    5 * 60 * 1000,

  STATISTICS:
    10 * 60 * 1000,

  RELATIONS:
    3 * 60 * 1000,

  GC:
    15 * 60 * 1000,
};

// ======================================================
// HELPERS
// ======================================================

const getErrorMessage = (
  error,
  fallback
) => {
  return (
    error?.response
      ?.data?.message ||
    error?.message ||
    fallback
  );
};

const invalidateClientLists = (
  queryClient
) => {
  return queryClient.invalidateQueries({
    queryKey:
      CLIENT_QUERY_KEYS.lists(),
  });
};

const invalidateClientStatistics = (
  queryClient
) => {
  return queryClient.invalidateQueries({
    queryKey:
      CLIENT_QUERY_KEYS.statistics(),
  });
};

const removeClientRelatedCache = (
  queryClient,
  id
) => {
  queryClient.removeQueries({
    queryKey:
      CLIENT_QUERY_KEYS.detail(
        id
      ),
  });

  queryClient.removeQueries({
    queryKey:
      CLIENT_QUERY_KEYS.caseHistory(
        id
      ),
  });

  queryClient.removeQueries({
    queryKey:
      CLIENT_QUERY_KEYS.payments(
        id
      ),
  });

  queryClient.removeQueries({
    queryKey:
      CLIENT_QUERY_KEYS.notes(
        id
      ),
  });
};

// ======================================================
// CLIENT LIST
// ======================================================

export const useClients = (
  params = {}
) => {
  return useQuery({
    queryKey:
      CLIENT_QUERY_KEYS.list(
        params
      ),

    queryFn: () =>
      clientApi.getAll(
        params
      ),

    staleTime:
      CACHE.LIST,

    gcTime:
      CACHE.GC,

    placeholderData: (
      previousData
    ) =>
      previousData,
  });
};

// ======================================================
// CLIENT DETAIL
// ======================================================

export const useClient = (
  id
) => {
  return useQuery({
    queryKey:
      CLIENT_QUERY_KEYS.detail(
        id
      ),

    queryFn: () =>
      clientApi.getOne(
        id
      ),

    enabled:
      Boolean(
        id
      ),

    staleTime:
      CACHE.DETAIL,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// STATISTICS
// ======================================================

export const useClientStatistics =
  () => {
    return useQuery({
      queryKey:
        CLIENT_QUERY_KEYS.statistics(),

      queryFn: () =>
        clientApi.getStatistics(),

      staleTime:
        CACHE.STATISTICS,

      gcTime:
        CACHE.GC,
    });
  };

// ======================================================
// CASE HISTORY
// ======================================================

export const useClientCaseHistory = (
  clientId
) => {
  return useQuery({
    queryKey:
      CLIENT_QUERY_KEYS.caseHistory(
        clientId
      ),

    queryFn: () =>
      clientApi.getCaseHistory(
        clientId
      ),

    enabled:
      Boolean(
        clientId
      ),

    staleTime:
      CACHE.RELATIONS,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// PAYMENTS
// ======================================================

export const useClientPayments = (
  clientId
) => {
  return useQuery({
    queryKey:
      CLIENT_QUERY_KEYS.payments(
        clientId
      ),

    queryFn: () =>
      clientApi.getPayments(
        clientId
      ),

    enabled:
      Boolean(
        clientId
      ),

    staleTime:
      CACHE.RELATIONS,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// NOTES
// ======================================================

export const useClientNotes = (
  clientId
) => {
  return useQuery({
    queryKey:
      CLIENT_QUERY_KEYS.notes(
        clientId
      ),

    queryFn: () =>
      clientApi.getNotes(
        clientId
      ),

    enabled:
      Boolean(
        clientId
      ),

    staleTime:
      CACHE.RELATIONS,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// CREATE
// ======================================================

export const useCreateClient =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        data
      ) =>
        clientApi.create(
          data
        ),

      onSuccess:
        async () => {
          await Promise.all([
            invalidateClientLists(
              queryClient
            ),

            invalidateClientStatistics(
              queryClient
            ),
          ]);

          toast.success(
            'Müvekkil başarıyla oluşturuldu'
          );
        },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Müvekkil oluşturulamadı'
          )
        );
      },
    });
  };

// ======================================================
// UPDATE
// ======================================================

export const useUpdateClient =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: ({
        id,
        data,
      }) =>
        clientApi.update(
          id,
          data
        ),

      onSuccess:
        async (
          response,
          variables
        ) => {
          const updatedClient =
            response?.data
              ?.data ??
            response?.data ??
            null;

          /*
           * Detail cache'i response ile doğrudan güncellenebilir.
           * Böylece detail ekranına dönünce gereksiz network
           * request beklemek zorunda kalmayız.
           */

          if (
            updatedClient
          ) {
            queryClient.setQueryData(
              CLIENT_QUERY_KEYS.detail(
                variables.id
              ),
              response
            );
          }

          await Promise.all([
            invalidateClientLists(
              queryClient
            ),

            /*
             * Status veya client_type değişmiş olabilir.
             * Statistics bundan etkilenebilir.
             */
            invalidateClientStatistics(
              queryClient
            ),
          ]);

          toast.success(
            'Müvekkil başarıyla güncellendi'
          );
        },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Müvekkil güncellenemedi'
          )
        );
      },
    });
  };

// ======================================================
// DELETE
// ======================================================

export const useDeleteClient =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        id
      ) =>
        clientApi.delete(
          id
        ),

      onSuccess:
        async (
          _response,
          id
        ) => {
          removeClientRelatedCache(
            queryClient,
            id
          );

          await Promise.all([
            invalidateClientLists(
              queryClient
            ),

            invalidateClientStatistics(
              queryClient
            ),
          ]);

          toast.success(
            'Müvekkil kaydı kaldırıldı'
          );
        },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Müvekkil kaldırılamadı'
          )
        );
      },
    });
  };

// ======================================================
// BULK DELETE
// ======================================================

export const useBulkDeleteClients =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn:
        async (
          ids
        ) => {
          if (
            !Array.isArray(
              ids
            ) ||
            ids.length ===
              0
          ) {
            throw new Error(
              'Kaldırılacak müvekkil seçilmedi'
            );
          }

          const results =
            await Promise.allSettled(
              ids.map(
                (id) =>
                  clientApi.delete(
                    id
                  )
              )
            );

          const succeeded =
            [];

          const failed =
            [];

          results.forEach(
            (
              result,
              index
            ) => {
              const id =
                ids[index];

              if (
                result.status ===
                'fulfilled'
              ) {
                succeeded.push(
                  id
                );

                return;
              }

              failed.push({
                id,
                error:
                  result.reason,
              });
            }
          );

          return {
            succeeded,
            failed,
          };
        },

      onSuccess:
        async (
          result
        ) => {
          result.succeeded.forEach(
            (id) => {
              removeClientRelatedCache(
                queryClient,
                id
              );
            }
          );

          await Promise.all([
            invalidateClientLists(
              queryClient
            ),

            invalidateClientStatistics(
              queryClient
            ),
          ]);

          if (
            result.failed.length ===
            0
          ) {
            toast.success(
              `${result.succeeded.length} müvekkil kaydı kaldırıldı`
            );

            return;
          }

          if (
            result.succeeded.length >
            0
          ) {
            toast(
              `${result.succeeded.length} kayıt kaldırıldı, ${result.failed.length} kayıt kaldırılamadı`,
              {
                icon:
                  '⚠️',
              }
            );

            return;
          }

          toast.error(
            'Seçilen müvekkiller kaldırılamadı'
          );
        },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Toplu kaldırma işlemi başarısız'
          )
        );
      },
    });
  };

// ======================================================
// INFINITE CLIENTS
// ======================================================

export const useInfiniteClients = (
  params = {}
) => {
  return useInfiniteQuery({
    queryKey:
      CLIENT_QUERY_KEYS.infinite(
        params
      ),

    queryFn: ({
      pageParam,
    }) =>
      clientApi.getAll({
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

      if (
        !pagination
      ) {
        return undefined;
      }

      const currentPage =
        Number(
          pagination.page
        ) || 1;

      const totalPages =
        Number(
          pagination.totalPages
        ) || 1;

      return currentPage <
        totalPages
        ? currentPage +
            1
        : undefined;
    },

    staleTime:
      CACHE.LIST,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// SEARCH
//
// Ayrı search namespace yerine aynı list cache yapısını
// kullanıyoruz. Böylece aynı request iki ayrı cache'te
// tutulmaz.
// ======================================================

export const useSearchClients = (
  query,
  params = {}
) => {
  const normalizedQuery =
    String(
      query || ''
    ).trim();

  const queryParams = {
    ...params,

    search:
      normalizedQuery,
  };

  return useQuery({
    queryKey:
      CLIENT_QUERY_KEYS.list(
        queryParams
      ),

    queryFn: () =>
      clientApi.getAll(
        queryParams
      ),

    enabled:
      normalizedQuery.length >=
      2,

    staleTime:
      CACHE.LIST,

    gcTime:
      CACHE.GC,

    placeholderData: (
      previousData
    ) =>
      previousData,
  });
};

// ======================================================
// PREFETCH DETAIL
// ======================================================

export const prefetchClient = (
  queryClient,
  id
) => {
  if (!id) {
    return Promise.resolve();
  }

  return queryClient.prefetchQuery({
    queryKey:
      CLIENT_QUERY_KEYS.detail(
        id
      ),

    queryFn: () =>
      clientApi.getOne(
        id
      ),

    staleTime:
      CACHE.DETAIL,
  });
};

// ======================================================
// PREFETCH LIST
// ======================================================

export const prefetchClients = (
  queryClient,
  params = {}
) => {
  return queryClient.prefetchQuery({
    queryKey:
      CLIENT_QUERY_KEYS.list(
        params
      ),

    queryFn: () =>
      clientApi.getAll(
        params
      ),

    staleTime:
      CACHE.LIST,
  });
};