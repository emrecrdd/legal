import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import documentApi from './document.api.js';

import toast from 'react-hot-toast';

// ======================================================
// QUERY KEYS
// ======================================================

export const DOCUMENT_QUERY_KEYS = {
  all: ['documents'],

  lists: () => [
    ...DOCUMENT_QUERY_KEYS.all,
    'list',
  ],

  list: (params = {}) => [
    ...DOCUMENT_QUERY_KEYS.lists(),
    params,
  ],

  detail: (id) => [
    ...DOCUMENT_QUERY_KEYS.all,
    'detail',
    id,
  ],

  categories: () => [
    ...DOCUMENT_QUERY_KEYS.all,
    'categories',
  ],

  statistics: () => [
    ...DOCUMENT_QUERY_KEYS.all,
    'statistics',
  ],

  versions: (documentId) => [
    ...DOCUMENT_QUERY_KEYS.all,
    'versions',
    documentId,
  ],

  infinite: (params = {}) => [
    ...DOCUMENT_QUERY_KEYS.all,
    'infinite',
    params,
  ],

  search: (query, params = {}) => [
    ...DOCUMENT_QUERY_KEYS.all,
    'search',
    query,
    params,
  ],
};

// ======================================================
// CACHE SETTINGS
// ======================================================

const CACHE = {
  NORMAL: 5 * 60 * 1000,
  LONG: 10 * 60 * 1000,
  GC: 15 * 60 * 1000,
};

// ======================================================
// ERROR HELPER
// ======================================================

const getErrorMessage = (
  error,
  fallback
) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

// ======================================================
// DOCUMENT LIST
// ======================================================

export const useDocuments = (
  params = {}
) => {
  return useQuery({
    queryKey:
      DOCUMENT_QUERY_KEYS.list(
        params
      ),

    queryFn: () =>
      documentApi.getAll(params),

    staleTime: CACHE.NORMAL,

    gcTime: CACHE.GC,

    placeholderData: (
      previousData
    ) => previousData,
  });
};

// ======================================================
// DOCUMENT DETAIL
// ======================================================

export const useDocument = (
  id
) => {
  return useQuery({
    queryKey:
      DOCUMENT_QUERY_KEYS.detail(
        id
      ),

    queryFn: () =>
      documentApi.getOne(id),

    enabled: Boolean(id),

    staleTime: CACHE.NORMAL,

    gcTime: CACHE.GC,
  });
};

// ======================================================
// CATEGORIES
// ======================================================

export const useDocumentCategories =
  () => {
    return useQuery({
      queryKey:
        DOCUMENT_QUERY_KEYS.categories(),

      queryFn: () =>
        documentApi.getCategories(),

      staleTime: CACHE.LONG,

      gcTime: CACHE.GC,
    });
  };

// ======================================================
// STATISTICS
// ======================================================

export const useDocumentStatistics =
  () => {
    return useQuery({
      queryKey:
        DOCUMENT_QUERY_KEYS.statistics(),

      queryFn: () =>
        documentApi.getStatistics(),

      staleTime: CACHE.LONG,

      gcTime: CACHE.GC,
    });
  };

// ======================================================
// DOCUMENT VERSIONS
// ======================================================

export const useDocumentVersions = (
  documentId
) => {
  return useQuery({
    queryKey:
      DOCUMENT_QUERY_KEYS.versions(
        documentId
      ),

    queryFn: () =>
      documentApi.getVersions(
        documentId
      ),

    enabled:
      Boolean(documentId),

    staleTime: CACHE.NORMAL,

    gcTime: CACHE.GC,
  });
};

// ======================================================
// UPLOAD DOCUMENT
// ======================================================

export const useUploadDocument =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (formData) =>
        documentApi.upload(
          formData
        ),

      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey:
              DOCUMENT_QUERY_KEYS.lists(),
          }),

          queryClient.invalidateQueries({
            queryKey:
              DOCUMENT_QUERY_KEYS.categories(),
          }),

          queryClient.invalidateQueries({
            queryKey:
              DOCUMENT_QUERY_KEYS.statistics(),
          }),
        ]);

        toast.success(
          'Belge başarıyla yüklendi'
        );
      },

      onError: (error) => {
        toast.error(
          getErrorMessage(
            error,
            'Belge yüklenemedi'
          )
        );
      },
    });
  };

// ======================================================
// MULTIPLE DOCUMENT UPLOAD
// ======================================================

export const useUploadDocuments =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (formData) =>
        documentApi.uploadMultiple(
          formData
        ),

      onSuccess: async (
        response
      ) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey:
              DOCUMENT_QUERY_KEYS.lists(),
          }),

          queryClient.invalidateQueries({
            queryKey:
              DOCUMENT_QUERY_KEYS.categories(),
          }),

          queryClient.invalidateQueries({
            queryKey:
              DOCUMENT_QUERY_KEYS.statistics(),
          }),
        ]);

        const result =
          response?.data?.data;

        const success =
          result?.success;

        const failed =
          result?.failed;

        if (
          typeof success ===
            'number' &&
          typeof failed === 'number'
        ) {
          if (failed > 0) {
            toast.success(
              `${success} belge yüklendi, ${failed} belge yüklenemedi`
            );
          } else {
            toast.success(
              `${success} belge başarıyla yüklendi`
            );
          }

          return;
        }

        toast.success(
          'Belgeler başarıyla yüklendi'
        );
      },

      onError: (error) => {
        toast.error(
          getErrorMessage(
            error,
            'Belgeler yüklenemedi'
          )
        );
      },
    });
  };

// ======================================================
// UPLOAD NEW VERSION
// ======================================================

export const useUploadDocumentVersion =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: ({
        documentId,
        formData,
      }) =>
        documentApi.uploadVersion(
          documentId,
          formData
        ),

      onSuccess: async (
        _response,
        variables
      ) => {
        const documentId =
          variables.documentId;

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey:
              DOCUMENT_QUERY_KEYS.detail(
                documentId
              ),
          }),

          queryClient.invalidateQueries({
            queryKey:
              DOCUMENT_QUERY_KEYS.versions(
                documentId
              ),
          }),

          queryClient.invalidateQueries({
            queryKey:
              DOCUMENT_QUERY_KEYS.lists(),
          }),

          queryClient.invalidateQueries({
            queryKey:
              DOCUMENT_QUERY_KEYS.statistics(),
          }),
        ]);

        toast.success(
          'Yeni belge versiyonu yüklendi'
        );
      },

      onError: (error) => {
        toast.error(
          getErrorMessage(
            error,
            'Yeni versiyon yüklenemedi'
          )
        );
      },
    });
  };

// ======================================================
// UPDATE DOCUMENT
// ======================================================

export const useUpdateDocument =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: ({
        id,
        data,
      }) =>
        documentApi.update(
          id,
          data
        ),

      onSuccess: async (
        _response,
        variables
      ) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey:
              DOCUMENT_QUERY_KEYS.detail(
                variables.id
              ),
          }),

          queryClient.invalidateQueries({
            queryKey:
              DOCUMENT_QUERY_KEYS.lists(),
          }),

          queryClient.invalidateQueries({
            queryKey:
              DOCUMENT_QUERY_KEYS.categories(),
          }),
        ]);

        toast.success(
          'Belge başarıyla güncellendi'
        );
      },

      onError: (error) => {
        toast.error(
          getErrorMessage(
            error,
            'Belge güncellenemedi'
          )
        );
      },
    });
  };

// ======================================================
// DELETE DOCUMENT
// ======================================================

export const useDeleteDocument =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (id) =>
        documentApi.delete(id),

      onSuccess: async (
        _response,
        id
      ) => {
        queryClient.removeQueries({
          queryKey:
            DOCUMENT_QUERY_KEYS.detail(
              id
            ),
        });

        queryClient.removeQueries({
          queryKey:
            DOCUMENT_QUERY_KEYS.versions(
              id
            ),
        });

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey:
              DOCUMENT_QUERY_KEYS.lists(),
          }),

          queryClient.invalidateQueries({
            queryKey:
              DOCUMENT_QUERY_KEYS.categories(),
          }),

          queryClient.invalidateQueries({
            queryKey:
              DOCUMENT_QUERY_KEYS.statistics(),
          }),
        ]);

        toast.success(
          'Belge kaldırıldı'
        );
      },

      onError: (error) => {
        toast.error(
          getErrorMessage(
            error,
            'Belge kaldırılamadı'
          )
        );
      },
    });
  };

// ======================================================
// BULK DELETE
// ======================================================

export const useBulkDeleteDocuments =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: async (
        ids
      ) => {
        if (
          !Array.isArray(ids) ||
          ids.length === 0
        ) {
          throw new Error(
            'Silinecek belge seçilmedi'
          );
        }

        const results =
          await Promise.allSettled(
            ids.map((id) =>
              documentApi.delete(
                id
              )
            )
          );

        const succeeded = [];
        const failed = [];

        results.forEach(
          (result, index) => {
            const id =
              ids[index];

            if (
              result.status ===
              'fulfilled'
            ) {
              succeeded.push(id);
            } else {
              failed.push({
                id,
                error:
                  result.reason,
              });
            }
          }
        );

        return {
          succeeded,
          failed,
        };
      },

      onSuccess: async (
        result
      ) => {
        result.succeeded.forEach(
          (id) => {
            queryClient.removeQueries({
              queryKey:
                DOCUMENT_QUERY_KEYS.detail(
                  id
                ),
            });

            queryClient.removeQueries({
              queryKey:
                DOCUMENT_QUERY_KEYS.versions(
                  id
                ),
            });
          }
        );

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey:
              DOCUMENT_QUERY_KEYS.lists(),
          }),

          queryClient.invalidateQueries({
            queryKey:
              DOCUMENT_QUERY_KEYS.categories(),
          }),

          queryClient.invalidateQueries({
            queryKey:
              DOCUMENT_QUERY_KEYS.statistics(),
          }),
        ]);

        if (
          result.failed.length ===
          0
        ) {
          toast.success(
            `${result.succeeded.length} belge kaldırıldı`
          );

          return;
        }

        if (
          result.succeeded.length >
          0
        ) {
          toast.error(
            `${result.succeeded.length} belge kaldırıldı, ${result.failed.length} belge kaldırılamadı`
          );

          return;
        }

        toast.error(
          'Seçilen belgeler kaldırılamadı'
        );
      },

      onError: (error) => {
        toast.error(
          getErrorMessage(
            error,
            'Toplu silme işlemi başarısız'
          )
        );
      },
    });
  };

// ======================================================
// INFINITE DOCUMENTS
// ======================================================

export const useInfiniteDocuments = (
  params = {}
) => {
  return useInfiniteQuery({
    queryKey:
      DOCUMENT_QUERY_KEYS.infinite(
        params
      ),

    queryFn: ({
      pageParam,
    }) =>
      documentApi.getAll({
        ...params,
        page: pageParam,
      }),

    initialPageParam: 1,

    getNextPageParam: (
      lastPage
    ) => {
      const pagination =
        lastPage?.data
          ?.pagination;

      if (!pagination) {
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
          currentPage + 1
        );
      }

      return undefined;
    },

    staleTime: CACHE.NORMAL,

    gcTime: CACHE.GC,
  });
};

// ======================================================
// SEARCH DOCUMENTS
// ======================================================

export const useSearchDocuments = (
  query,
  params = {}
) => {
  const normalizedQuery =
    query?.trim() || '';

  return useQuery({
    queryKey:
      DOCUMENT_QUERY_KEYS.search(
        normalizedQuery,
        params
      ),

    queryFn: () =>
      documentApi.getAll({
        ...params,
        search:
          normalizedQuery,
      }),

    enabled:
      normalizedQuery.length >=
      2,

    staleTime: CACHE.NORMAL,

    gcTime: CACHE.GC,
  });
};

// ======================================================
// PREFETCH DETAIL
// ======================================================

export const prefetchDocument = (
  queryClient,
  id
) => {
  if (!id) {
    return Promise.resolve();
  }

  return queryClient.prefetchQuery({
    queryKey:
      DOCUMENT_QUERY_KEYS.detail(
        id
      ),

    queryFn: () =>
      documentApi.getOne(id),

    staleTime: CACHE.NORMAL,
  });
};

// ======================================================
// PREFETCH LIST
// ======================================================

export const prefetchDocuments = (
  queryClient,
  params = {}
) => {
  return queryClient.prefetchQuery({
    queryKey:
      DOCUMENT_QUERY_KEYS.list(
        params
      ),

    queryFn: () =>
      documentApi.getAll(params),

    staleTime: CACHE.NORMAL,
  });
};