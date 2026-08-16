import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import paymentApi from './payment.api.js';

import toast from 'react-hot-toast';

// ======================================================
// QUERY KEYS
// ======================================================

export const PAYMENT_QUERY_KEYS = {
  all: ['payments'],

  lists: () => [
    ...PAYMENT_QUERY_KEYS.all,
    'list',
  ],

  list: (params = {}) => [
    ...PAYMENT_QUERY_KEYS.lists(),
    params,
  ],

  detail: (id) => [
    ...PAYMENT_QUERY_KEYS.all,
    'detail',
    id,
  ],

  summary: () => [
    ...PAYMENT_QUERY_KEYS.all,
    'summary',
  ],

  client: (clientId) => [
    ...PAYMENT_QUERY_KEYS.all,
    'client',
    clientId,
  ],

  case: (caseId) => [
    ...PAYMENT_QUERY_KEYS.all,
    'case',
    caseId,
  ],

  plans: () => [
    ...PAYMENT_QUERY_KEYS.all,
    'plans',
  ],

  planList: (params = {}) => [
    ...PAYMENT_QUERY_KEYS.plans(),
    'list',
    params,
  ],

  planDetail: (id) => [
    ...PAYMENT_QUERY_KEYS.plans(),
    'detail',
    id,
  ],

  clientSummary: (clientId) => [
    ...PAYMENT_QUERY_KEYS.all,
    'client-summary',
    clientId,
  ],

  infinite: (params = {}) => [
    ...PAYMENT_QUERY_KEYS.all,
    'infinite',
    params,
  ],
};

// ======================================================
// CACHE
// ======================================================

const CACHE = {
  SHORT:
    2 * 60 * 1000,

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

const invalidatePaymentLists = (
  queryClient
) => {
  queryClient.invalidateQueries({
    queryKey:
      PAYMENT_QUERY_KEYS.lists(),
  });

  queryClient.invalidateQueries({
    queryKey:
      PAYMENT_QUERY_KEYS.infinite(),
    exact: false,
  });
};

const invalidateSummary = (
  queryClient
) => {
  queryClient.invalidateQueries({
    queryKey:
      PAYMENT_QUERY_KEYS.summary(),
  });
};

const invalidatePlans = (
  queryClient
) => {
  queryClient.invalidateQueries({
    queryKey:
      PAYMENT_QUERY_KEYS.plans(),
  });
};

const invalidateClientFinance = (
  queryClient,
  clientId
) => {
  if (!clientId) {
    return;
  }

  queryClient.invalidateQueries({
    queryKey:
      PAYMENT_QUERY_KEYS.client(
        clientId
      ),
  });

  queryClient.invalidateQueries({
    queryKey:
      PAYMENT_QUERY_KEYS.clientSummary(
        clientId
      ),
  });

  /*
   * ClientDetail kendi client query'sini de kullanıyor.
   * Finans hareketi sonrasında detay ekranındaki ilişkisel
   * verilerin yenilenmesi için invalidate ediyoruz.
   */
  queryClient.invalidateQueries({
    queryKey: [
      'clients',
      'detail',
      clientId,
    ],
  });
};

const invalidateCaseFinance = (
  queryClient,
  caseId
) => {
  if (!caseId) {
    return;
  }

  queryClient.invalidateQueries({
    queryKey:
      PAYMENT_QUERY_KEYS.case(
        caseId
      ),
  });

  /*
   * Case query key'iniz farklıysa burayı daha sonra
   * CASE_QUERY_KEYS.detail(caseId) ile değiştirebiliriz.
   */
  queryClient.invalidateQueries({
    queryKey: [
      'case',
      caseId,
    ],
  });
};

const invalidateGlobalFinance = (
  queryClient
) => {
  invalidatePaymentLists(
    queryClient
  );

  invalidatePlans(
    queryClient
  );

  invalidateSummary(
    queryClient
  );
};

// ======================================================
// PAYMENT QUERIES
// ======================================================

export const usePayments = (
  params = {}
) => {
  return useQuery({
    queryKey:
      PAYMENT_QUERY_KEYS.list(
        params
      ),

    queryFn: () =>
      paymentApi.getAll(
        params
      ),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,

    placeholderData: (
      previousData
    ) => previousData,
  });
};

export const usePayment = (
  id
) => {
  return useQuery({
    queryKey:
      PAYMENT_QUERY_KEYS.detail(
        id
      ),

    queryFn: () =>
      paymentApi.getOne(
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
// GLOBAL FINANCE SUMMARY
// ======================================================

export const usePaymentSummary =
  () => {
    return useQuery({
      queryKey:
        PAYMENT_QUERY_KEYS.summary(),

      queryFn: () =>
        paymentApi.getSummary(),

      staleTime:
        CACHE.SHORT,

      gcTime:
        CACHE.GC,
    });
  };

export const useClientPayments = (
  clientId,
  params = {}
) => {
  return useQuery({
    queryKey: [
      ...PAYMENT_QUERY_KEYS.client(
        clientId
      ),
      params,
    ],

    queryFn: () =>
      paymentApi.getByClient(
        clientId,
        params
      ),

    enabled:
      Boolean(clientId),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,
  });
};

export const useCasePayments = (
  caseId,
  params = {}
) => {
  return useQuery({
    queryKey: [
      ...PAYMENT_QUERY_KEYS.case(
        caseId
      ),
      params,
    ],

    queryFn: () =>
      paymentApi.getByCase(
        caseId,
        params
      ),

    enabled:
      Boolean(caseId),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// PAYMENT PLAN QUERIES
// ======================================================

export const usePaymentPlans = (
  params = {}
) => {
  return useQuery({
    queryKey:
      PAYMENT_QUERY_KEYS.planList(
        params
      ),

    queryFn: () =>
      paymentApi.getPlans(
        params
      ),

    staleTime:
      CACHE.NORMAL,

    gcTime:
      CACHE.GC,

    placeholderData: (
      previousData
    ) => previousData,
  });
};

export const usePaymentPlan = (
  id
) => {
  return useQuery({
    queryKey:
      PAYMENT_QUERY_KEYS.planDetail(
        id
      ),

    queryFn: () =>
      paymentApi.getPlan(
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

export const useClientFinancialSummary = (
  clientId
) => {
  return useQuery({
    queryKey:
      PAYMENT_QUERY_KEYS.clientSummary(
        clientId
      ),

    queryFn: () =>
      paymentApi.getClientSummary(
        clientId
      ),

    enabled:
      Boolean(clientId),

    staleTime:
      CACHE.SHORT,

    gcTime:
      CACHE.GC,
  });
};

// ======================================================
// CREATE PAYMENT
// ======================================================

export const useCreatePayment =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        data
      ) =>
        paymentApi.create(
          data
        ),

      onSuccess: (
        response,
        variables
      ) => {
        const payment =
          response?.data?.data ??
          response?.data ??
          null;

        invalidateGlobalFinance(
          queryClient
        );

        invalidateClientFinance(
          queryClient,
          payment?.client_id ||
            variables?.client_id
        );

        invalidateCaseFinance(
          queryClient,
          payment?.case_id ||
            variables?.case_id
        );

        if (
          payment?.payment_plan_id
        ) {
          queryClient.invalidateQueries({
            queryKey:
              PAYMENT_QUERY_KEYS.planDetail(
                payment.payment_plan_id
              ),
          });
        }

        toast.success(
          'Finans hareketi başarıyla kaydedildi'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Finans hareketi kaydedilemedi'
          )
        );
      },
    });
  };

// ======================================================
// UPDATE PAYMENT
// ======================================================

export const useUpdatePayment =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: ({
        id,
        data,
      }) =>
        paymentApi.update(
          id,
          data
        ),

      onSuccess: (
        response,
        variables
      ) => {
        const payment =
          response?.data?.data ??
          response?.data ??
          null;

        queryClient.invalidateQueries({
          queryKey:
            PAYMENT_QUERY_KEYS.detail(
              variables.id
            ),
        });

        invalidateGlobalFinance(
          queryClient
        );

        invalidateClientFinance(
          queryClient,
          payment?.client_id
        );

        invalidateCaseFinance(
          queryClient,
          payment?.case_id
        );

        if (
          payment?.payment_plan_id
        ) {
          queryClient.invalidateQueries({
            queryKey:
              PAYMENT_QUERY_KEYS.planDetail(
                payment.payment_plan_id
              ),
          });
        }

        toast.success(
          'Finans hareketi güncellendi'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Finans hareketi güncellenemedi'
          )
        );
      },
    });
  };

// ======================================================
// DELETE PAYMENT
// ======================================================

export const useDeletePayment =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: ({
        id,
        clientId,
        caseId,
        paymentPlanId,
      }) =>
        paymentApi
          .remove(
            id
          )
          .then(
            (
              response
            ) => ({
              response,
              id,
              clientId,
              caseId,
              paymentPlanId,
            })
          ),

      onSuccess: (
        result
      ) => {
        queryClient.removeQueries({
          queryKey:
            PAYMENT_QUERY_KEYS.detail(
              result.id
            ),
        });

        invalidateGlobalFinance(
          queryClient
        );

        invalidateClientFinance(
          queryClient,
          result.clientId
        );

        invalidateCaseFinance(
          queryClient,
          result.caseId
        );

        if (
          result.paymentPlanId
        ) {
          queryClient.invalidateQueries({
            queryKey:
              PAYMENT_QUERY_KEYS.planDetail(
                result.paymentPlanId
              ),
          });
        }

        toast.success(
          'Finans hareketi kaldırıldı'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Finans hareketi kaldırılamadı'
          )
        );
      },
    });
  };

// ======================================================
// REVERSE PAYMENT
// ======================================================

export const useReversePayment =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: ({
        id,
        reason,
        payment_date,
      }) =>
        paymentApi.reverse(
          id,
          {
            reason,
            payment_date,
          }
        ),

      onSuccess: (
        response
      ) => {
        const reversal =
          response?.data?.data ??
          response?.data ??
          null;

        invalidateGlobalFinance(
          queryClient
        );

        invalidateClientFinance(
          queryClient,
          reversal?.client_id
        );

        invalidateCaseFinance(
          queryClient,
          reversal?.case_id
        );

        if (
          reversal?.payment_plan_id
        ) {
          queryClient.invalidateQueries({
            queryKey:
              PAYMENT_QUERY_KEYS.planDetail(
                reversal.payment_plan_id
              ),
          });
        }

        if (
          reversal?.reversed_payment_id
        ) {
          queryClient.invalidateQueries({
            queryKey:
              PAYMENT_QUERY_KEYS.detail(
                reversal.reversed_payment_id
              ),
          });
        }

        toast.success(
          'Finans hareketi ters kayda alındı'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Ters kayıt oluşturulamadı'
          )
        );
      },
    });
  };

// ======================================================
// CREATE PAYMENT PLAN
// ======================================================

export const useCreatePaymentPlan =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        data
      ) =>
        paymentApi.createPlan(
          data
        ),

      onSuccess: (
        response,
        variables
      ) => {
        const plan =
          response?.data?.data ??
          response?.data ??
          null;

        invalidatePlans(
          queryClient
        );

        invalidateSummary(
          queryClient
        );

        invalidateClientFinance(
          queryClient,
          plan?.client_id ||
            variables?.client_id
        );

        invalidateCaseFinance(
          queryClient,
          plan?.case_id ||
            variables?.case_id
        );

        toast.success(
          'Ödeme planı başarıyla oluşturuldu'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Ödeme planı oluşturulamadı'
          )
        );
      },
    });
  };

// ======================================================
// ACTIVATE PAYMENT PLAN
// ======================================================

export const useActivatePaymentPlan =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: (
        id
      ) =>
        paymentApi.activatePlan(
          id
        ),

      onSuccess: (
        response,
        id
      ) => {
        const plan =
          response?.data?.data ??
          response?.data ??
          null;

        queryClient.invalidateQueries({
          queryKey:
            PAYMENT_QUERY_KEYS.planDetail(
              id
            ),
        });

        invalidatePlans(
          queryClient
        );

        invalidateSummary(
          queryClient
        );

        invalidateClientFinance(
          queryClient,
          plan?.client_id
        );

        invalidateCaseFinance(
          queryClient,
          plan?.case_id
        );

        toast.success(
          'Ödeme planı aktive edildi'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Ödeme planı aktive edilemedi'
          )
        );
      },
    });
  };

// ======================================================
// CANCEL PAYMENT PLAN
// ======================================================

export const useCancelPaymentPlan =
  () => {
    const queryClient =
      useQueryClient();

    return useMutation({
      mutationFn: ({
        id,
        reason,
      }) =>
        paymentApi.cancelPlan(
          id,
          reason
        ),

      onSuccess: (
        response,
        variables
      ) => {
        const plan =
          response?.data?.data ??
          response?.data ??
          null;

        queryClient.invalidateQueries({
          queryKey:
            PAYMENT_QUERY_KEYS.planDetail(
              variables.id
            ),
        });

        invalidateGlobalFinance(
          queryClient
        );

        invalidateClientFinance(
          queryClient,
          plan?.client_id
        );

        invalidateCaseFinance(
          queryClient,
          plan?.case_id
        );

        toast.success(
          'Ödeme planı iptal edildi'
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          getErrorMessage(
            error,
            'Ödeme planı iptal edilemedi'
          )
        );
      },
    });
  };

// ======================================================
// INFINITE PAYMENTS
// ======================================================

export const useInfinitePayments = (
  params = {}
) => {
  return useInfiniteQuery({
    queryKey:
      PAYMENT_QUERY_KEYS.infinite(
        params
      ),

    queryFn: ({
      pageParam,
    }) =>
      paymentApi.getAll({
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

      const page =
        Number(
          pagination.page
        ) || 1;

      const totalPages =
        Number(
          pagination.totalPages
        ) || 1;

      return page <
        totalPages
        ? page + 1
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

export const prefetchPayment = (
  queryClient,
  id
) => {
  if (!id) {
    return Promise.resolve();
  }

  return queryClient.prefetchQuery({
    queryKey:
      PAYMENT_QUERY_KEYS.detail(
        id
      ),

    queryFn: () =>
      paymentApi.getOne(
        id
      ),

    staleTime:
      CACHE.NORMAL,
  });
};

export const prefetchPaymentPlan = (
  queryClient,
  id
) => {
  if (!id) {
    return Promise.resolve();
  }

  return queryClient.prefetchQuery({
    queryKey:
      PAYMENT_QUERY_KEYS.planDetail(
        id
      ),

    queryFn: () =>
      paymentApi.getPlan(
        id
      ),

    staleTime:
      CACHE.NORMAL,
  });
};

export const prefetchPaymentSummary = (
  queryClient
) => {
  return queryClient.prefetchQuery({
    queryKey:
      PAYMENT_QUERY_KEYS.summary(),

    queryFn: () =>
      paymentApi.getSummary(),

    staleTime:
      CACHE.SHORT,
  });
};