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
  all: ['clients'],

  lists: () => [
    ...CLIENT_QUERY_KEYS.all,
    'list',
  ],

  list: (params = {}) => [
    ...CLIENT_QUERY_KEYS.lists(),
    params,
  ],

  detail: (id) => [
    ...CLIENT_QUERY_KEYS.all,
    'detail',
    id,
  ],

  statistics: () => [
    ...CLIENT_QUERY_KEYS.all,
    'statistics',
  ],

  caseHistory: (clientId) => [
    ...CLIENT_QUERY_KEYS.all,
    'case-history',
    clientId,
  ],

  payments: (clientId) => [
    ...CLIENT_QUERY_KEYS.all,
    'payments',
    clientId,
  ],

  notes: (clientId) => [
    ...CLIENT_QUERY_KEYS.all,
    'notes',
    clientId,
  ],

  infinite: (params = {}) => [
    ...CLIENT_QUERY_KEYS.all,
    'infinite',
    params,
  ],

  search: (
    query,
    params = {}
  ) => [
    ...CLIENT_QUERY_KEYS.all,
    'search',
    query,
    params,
  ],
};

// ======================================================
// CACHE
// ======================================================

const CACHE = {
  NORMAL:
    5 * 60 * 1000,

  LONG:
    10 * 60 * 1000,

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
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,

    /*
     * Pagination sırasında önceki listeyi
     * ekranda tutar.
     */
    placeholderData: (
      previousData
    ) => previousData,
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
      Boolean(id),

    staleTime:
      CACHE.NORMAL,

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
        CACHE.LONG,

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
      CACHE.NORMAL,

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
      CACHE.NORMAL,

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
      CACHE.NORMAL,

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
            queryClient.invalidateQueries({
              queryKey:
                CLIENT_QUERY_KEYS.lists(),
            }),

            queryClient.invalidateQueries({
              queryKey:
                CLIENT_QUERY_KEYS.statistics(),
            }),
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
          _response,
          variables
        ) => {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey:
                CLIENT_QUERY_KEYS.detail(
                  variables.id
                ),
            }),

            queryClient.invalidateQueries({
              queryKey:
                CLIENT_QUERY_KEYS.lists(),
            }),

            queryClient.invalidateQueries({
              queryKey:
                CLIENT_QUERY_KEYS.statistics(),
            }),

            queryClient.invalidateQueries({
              queryKey:
                CLIENT_QUERY_KEYS.caseHistory(
                  variables.id
                ),
            }),
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
          /*
           * Soft-delete sonrası client detay cache'ini
           * doğrudan kaldırıyoruz.
           */
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

          await Promise.all([
            queryClient.invalidateQueries({
              queryKey:
                CLIENT_QUERY_KEYS.lists(),
            }),

            queryClient.invalidateQueries({
              queryKey:
                CLIENT_QUERY_KEYS.statistics(),
            }),
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
//
// Backend'de bulk endpoint olmadığı için şimdilik
// Promise.allSettled kullanıyoruz.
//
// Böylece 5 kayıttan 4'ü başarılı, 1'i başarısız
// olursa başarılı işlemleri kaybetmiyoruz.
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
            }
          );

          await Promise.all([
            queryClient.invalidateQueries({
              queryKey:
                CLIENT_QUERY_KEYS.lists(),
            }),

            queryClient.invalidateQueries({
              queryKey:
                CLIENT_QUERY_KEYS.statistics(),
            }),
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
                icon: '⚠️',
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
// INFINITE LIST
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

      if (
        currentPage <
        totalPages
      ) {
        return (
          currentPage +
          1
        );
      }

      return undefined;
    },

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// SEARCH
// ======================================================

export const useSearchClients = (
  query,
  params = {}
) => {
  const normalizedQuery =
    query?.trim() ||
    '';

  return useQuery({
    queryKey:
      CLIENT_QUERY_KEYS.search(
        normalizedQuery,
        params
      ),

    queryFn: () =>
      clientApi.getAll({
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
      CACHE.NORMAL,
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
      CACHE.NORMAL,
  });
};