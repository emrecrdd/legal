import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import meetingApi from './meeting.api.js';

import toast from 'react-hot-toast';

// ======================================================
// HELPERS
// ======================================================

const normalizeId = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '';
  }

  if (
    typeof value ===
    'object'
  ) {
    const objectId =
      value?.id ??
      value?._id;

    if (
      objectId === null ||
      objectId === undefined ||
      objectId === ''
    ) {
      return '';
    }

    return String(
      objectId
    );
  }

  return String(
    value
  );
};

const getResponseItem = (
  response
) => {
  return (
    response?.data?.data ??
    response?.data ??
    response ??
    null
  );
};

const isLikelyTechnicalMeetingMessage = (
  message
) => {
  const value =
    String(
      message ||
      ''
    ).trim();

  if (!value) {
    return false;
  }

  return /sequelize|validation error|constraint|foreign key|unique constraint|notnull|invalid input syntax|uuid|database|sql|column|relation .* does not exist|syntax error|axioserror|network error|request failed with status code|econn|etimedout|timeout|cannot read properties|typeerror|referenceerror|stack trace/i.test(
    value
  );
};

const isSafeTurkishMeetingMessage = (
  message
) => {
  const value =
    String(
      message ||
      ''
    ).trim();

  if (
    !value ||
    isLikelyTechnicalMeetingMessage(
      value
    )
  ) {
    return false;
  }

  return /[çğıöşüÇĞİÖŞÜ]|toplantı|kullanıcı|müvekkil|dava|atan|sorumlu|başlangıç|bitiş|tarih|konum|bağlantı|katılımcı|durum|erişim|yetki|işlem|bulunamadı|gereklidir|geçersiz/i.test(
    value
  );
};

const getMeetingErrorMessage = (
  error,
  fallback
) => {
  const status =
    Number(
      error?.response
        ?.status
    ) ||
    null;

  const backendMessage =
    String(
      error?.response
        ?.data
        ?.message ||
      ''
    ).trim();

  /*
   * Backend business-rule mesajları Türkçe ve güvenliyse
   * aynen kullanıcıya taşınır. Örn:
   * - Toplantı için sorumlu kişi seçilmelidir
   * - Toplantı başlangıç tarihi geçmiş bir tarih olamaz
   */
  if (
    isSafeTurkishMeetingMessage(
      backendMessage
    )
  ) {
    return backendMessage;
  }

  if (
    backendMessage
      .toLowerCase() ===
    'meeting not found'
  ) {
    return 'Toplantı bulunamadı veya artık erişilebilir değil';
  }

  if (status === 401) {
    return 'Oturumunuz sona ermiş olabilir. Lütfen yeniden giriş yapın.';
  }

  if (status === 403) {
    return 'Bu işlem için gerekli yetkiye sahip değilsiniz';
  }

  if (status === 404) {
    return 'Toplantı bulunamadı veya artık erişilebilir değil';
  }

  if (status === 409) {
    return 'Bu işlem mevcut toplantı durumu nedeniyle tamamlanamadı';
  }

  if (status === 429) {
    return 'Çok fazla istek gönderildi. Lütfen kısa bir süre sonra tekrar deneyin.';
  }

  if (
    status &&
    status >= 500
  ) {
    return 'Sunucu tarafında geçici bir sorun oluştu. Lütfen tekrar deneyin.';
  }

  if (
    !error?.response &&
    (
      error?.code ===
        'ERR_NETWORK' ||
      /network|failed to fetch|econn|timeout/i.test(
        String(
          error?.message ||
          ''
        )
      )
    )
  ) {
    return 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
  }

  const localMessage =
    String(
      error?.message ||
      ''
    ).trim();

  if (
    isSafeTurkishMeetingMessage(
      localMessage
    )
  ) {
    return localMessage;
  }

  return fallback;
};

const failure = (
  error,
  fallback
) => {
  toast.error(
    getMeetingErrorMessage(
      error,
      fallback
    )
  );
};

const getMeetingRelationIds = (
  source
) => {
  const item =
    getResponseItem(
      source
    );

  return {
    clientId:
      normalizeId(
        item?.client_id ??
        item?.client?.id
      ),

    caseId:
      normalizeId(
        item?.case_id ??
        item?.case?.id
      ),
  };
};

const getExistingMeetingRelations =
  async (
    queryClient,
    id
  ) => {
    const cached =
      queryClient.getQueryData(
        MEETING_QUERY_KEYS.detail(
          id
        )
      );

    if (cached) {
      return getMeetingRelationIds(
        cached
      );
    }

    try {
      const response =
        await meetingApi.getOne(
          id
        );

      return getMeetingRelationIds(
        response
      );
    } catch {
      /*
       * Eski ilişki okunamazsa mutation'ı engellemiyoruz.
       * Yeni ilişki yine onSuccess içinde invalidate edilir.
       */
      return {
        clientId:
          '',
        caseId:
          '',
      };
    }
  };

const invalidateMeetingRelations =
  async (
    queryClient,
    {
      clientIds = [],
      caseIds = [],
    } = {}
  ) => {
    const normalizedClientIds = [
      ...new Set(
        clientIds
          .map(
            normalizeId
          )
          .filter(
            Boolean
          )
      ),
    ];

    const normalizedCaseIds = [
      ...new Set(
        caseIds
          .map(
            normalizeId
          )
          .filter(
            Boolean
          )
      ),
    ];

    const invalidations =
      [];

    normalizedClientIds.forEach(
      (
        clientId
      ) => {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: [
              'client-meetings',
              clientId,
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'client-meeting-timeline',
              clientId,
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'client',
              clientId,
            ],
          })
        );
      }
    );

    normalizedCaseIds.forEach(
      (
        caseId
      ) => {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: [
              'case-meetings',
              caseId,
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'case',
              caseId,
            ],
          })
        );
      }
    );

    await Promise.all(
      invalidations
    );
  };

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

        queryClient.invalidateQueries({
          queryKey: [
            'dashboard-meetings',
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            'dashboard-monthly-meetings',
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
        failure(
          error,
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

      onMutate: async (
        variables
      ) => {
        const id =
          normalizeId(
            variables?.id
          );

        if (!id) {
          return {
            oldClientId:
              '',
            oldCaseId:
              '',
          };
        }

        await queryClient.cancelQueries({
          queryKey:
            MEETING_QUERY_KEYS.detail(
              id
            ),
          exact:
            true,
        });

        const {
          clientId,
          caseId,
        } =
          await getExistingMeetingRelations(
            queryClient,
            id
          );

        return {
          oldClientId:
            clientId,
          oldCaseId:
            caseId,
        };
      },

      onSuccess: async (
        response,
        variables,
        context
      ) => {
        const id =
          normalizeId(
            variables?.id
          );

        const responseRelations =
          getMeetingRelationIds(
            response
          );

        const newClientId =
          normalizeId(
            responseRelations.clientId ||
            variables?.data?.client_id
          );

        const newCaseId =
          normalizeId(
            responseRelations.caseId ||
            variables?.data?.case_id
          );

        const oldClientId =
          normalizeId(
            context?.oldClientId
          );

        const oldCaseId =
          normalizeId(
            context?.oldCaseId
          );

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey:
              MEETING_QUERY_KEYS.all,
          }),

          queryClient.invalidateQueries({
            queryKey:
              MEETING_QUERY_KEYS.detail(
                id
              ),
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'my-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'upcoming-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'calendar-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'dashboard-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'dashboard-monthly-meetings',
            ],
          }),

          invalidateMeetingRelations(
            queryClient,
            {
              clientIds: [
                oldClientId,
                newClientId,
              ],

              caseIds: [
                oldCaseId,
                newCaseId,
              ],
            }
          ),
        ]);

        toast.success(
          'Toplantı güncellendi'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
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

      onMutate: async (
        variables
      ) => {
        const id =
          normalizeId(
            variables?.id
          );

        if (!id) {
          return {
            clientId:
              '',
            caseId:
              '',
          };
        }

        await queryClient.cancelQueries({
          queryKey:
            MEETING_QUERY_KEYS.detail(
              id
            ),
          exact:
            true,
        });

        return getExistingMeetingRelations(
          queryClient,
          id
        );
      },

      onSuccess: async (
        _response,
        variables,
        context
      ) => {
        const id =
          normalizeId(
            variables?.id
          );

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey:
              MEETING_QUERY_KEYS.all,
          }),

          queryClient.invalidateQueries({
            queryKey:
              MEETING_QUERY_KEYS.detail(
                id
              ),
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'my-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'upcoming-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'calendar-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'dashboard-meetings',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'dashboard-monthly-meetings',
            ],
          }),

          invalidateMeetingRelations(
            queryClient,
            {
              clientIds: [
                context?.clientId,
              ],

              caseIds: [
                context?.caseId,
              ],
            }
          ),
        ]);

        toast.success(
          'Toplantı durumu güncellendi'
        );
      },

      onError: (
        error
      ) => {
        failure(
          error,
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
          exact: true,
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
            'dashboard-meetings',
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            'dashboard-monthly-meetings',
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
        failure(
          error,
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