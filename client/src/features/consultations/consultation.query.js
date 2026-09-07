import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';
import consultationApi from './consultation.api.js';

const normalizeId = (value) => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'object') {
    return String(value?.id ?? value?._id ?? '').trim();
  }
  return String(value).trim();
};

const getResponseData = (response) =>
  response?.data?.data ?? response?.data ?? response ?? null;

const getConsultationFromResponse = (response) => {
  const payload = getResponseData(response);
  return payload?.consultation ?? payload ?? null;
};

const getConsultationIdFromResponse = (response) =>
  normalizeId(getConsultationFromResponse(response)?.id);

const getConvertedCaseId = (response) => {
  const payload = getResponseData(response);
  return normalizeId(
    payload?.case_id ??
      payload?.consultation?.converted_case_id ??
      payload?.converted_case_id
  );
};

const getClientId = (response) => {
  const payload = getResponseData(response);
  const consultation = payload?.consultation ?? payload;
  return normalizeId(
    payload?.client_id ??
      consultation?.client_id ??
      consultation?.client?.id
  );
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const toDetailResponse = (response) => {
  const consultation = getConsultationFromResponse(response);
  if (!consultation || typeof consultation !== 'object') return response;

  if (response?.data?.data !== undefined) {
    return {
      ...response,
      data: {
        ...response.data,
        data: consultation,
      },
    };
  }

  if (response?.data !== undefined) {
    return {
      ...response,
      data: consultation,
    };
  }

  return consultation;
};

export const CONSULTATION_QUERY_KEYS = Object.freeze({
  all: ['consultations'],
  lists: () => ['consultations'],
  list: (params = {}) => ['consultations', params],
  detail: (id) => ['consultation', normalizeId(id)],
  statistics: () => ['consultation-statistics'],
  assignableUsers: () => ['consultation-assignable-users'],
  tasks: (id) => ['consultation-tasks', normalizeId(id)],
  meetings: (id) => ['consultation-meetings', normalizeId(id)],
  documents: (id) => ['consultation-documents', normalizeId(id)],
  notes: (id) => ['consultation-notes', normalizeId(id)],
});

const CACHE = Object.freeze({
  NORMAL: 5 * 60 * 1000,
  LONG: 10 * 60 * 1000,
  GC: 10 * 60 * 1000,
  GC_LONG: 30 * 60 * 1000,
});

const invalidateCollections = async (queryClient) => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: CONSULTATION_QUERY_KEYS.all,
    }),
    queryClient.invalidateQueries({
      queryKey: CONSULTATION_QUERY_KEYS.statistics(),
    }),
  ]);
};

const invalidateExternalViews = async (
  queryClient,
  { clientId = '', caseId = '', includeChildren = false } = {}
) => {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: ['clients'] }),
  ];

  if (clientId) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['client', clientId] }),
      queryClient.invalidateQueries({ queryKey: ['clients', clientId, 'cases'] })
    );
  }

  if (caseId) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['cases'] }),
      queryClient.invalidateQueries({ queryKey: ['case', caseId] }),
      queryClient.invalidateQueries({ queryKey: ['case-statistics'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-cases'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    );
  }

  if (includeChildren) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['meetings'] }),
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    );

    if (caseId) {
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: ['case-tasks', caseId] }),
        queryClient.invalidateQueries({ queryKey: ['case-meetings', caseId] }),
        queryClient.invalidateQueries({ queryKey: ['case-documents', caseId] })
      );
    }
  }

  await Promise.all(invalidations);
};

const setDetailFromMutation = (queryClient, id, response) => {
  const normalizedId = normalizeId(id);
  if (!normalizedId) return;

  const consultation = getConsultationFromResponse(response);
  if (!consultation?.id) return;

  queryClient.setQueryData(
    CONSULTATION_QUERY_KEYS.detail(normalizedId),
    toDetailResponse(response)
  );
};

const removeRelationCaches = (queryClient, consultationId) => {
  const id = normalizeId(consultationId);
  if (!id) return;

  [
    CONSULTATION_QUERY_KEYS.tasks(id),
    CONSULTATION_QUERY_KEYS.meetings(id),
    CONSULTATION_QUERY_KEYS.documents(id),
    CONSULTATION_QUERY_KEYS.notes(id),
  ].forEach((queryKey) => {
    queryClient.removeQueries({ queryKey, exact: true });
  });
};

export const useConsultations = (params = {}) =>
  useQuery({
    queryKey: CONSULTATION_QUERY_KEYS.list(params),
    queryFn: () => consultationApi.getAll(params),
    staleTime: CACHE.NORMAL,
    gcTime: CACHE.GC,
    placeholderData: (previousData) => previousData,
  });

export const useConsultation = (id) => {
  const normalizedId = normalizeId(id);
  return useQuery({
    queryKey: CONSULTATION_QUERY_KEYS.detail(normalizedId),
    queryFn: () => consultationApi.getOne(normalizedId),
    enabled: Boolean(normalizedId),
    staleTime: CACHE.NORMAL,
    gcTime: CACHE.GC,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useConsultationStatistics = () =>
  useQuery({
    queryKey: CONSULTATION_QUERY_KEYS.statistics(),
    queryFn: consultationApi.getStatistics,
    staleTime: CACHE.LONG,
    gcTime: CACHE.GC_LONG,
  });

export const useConsultationAssignableUsers = () =>
  useQuery({
    queryKey: CONSULTATION_QUERY_KEYS.assignableUsers(),
    queryFn: consultationApi.getAssignableUsers,
    staleTime: CACHE.LONG,
    gcTime: CACHE.GC_LONG,
  });

export const useConsultationTasks = (consultationId) => {
  const id = normalizeId(consultationId);
  return useQuery({
    queryKey: CONSULTATION_QUERY_KEYS.tasks(id),
    queryFn: () => consultationApi.getTasks(id),
    enabled: Boolean(id),
    staleTime: CACHE.NORMAL,
    gcTime: CACHE.GC,
  });
};

export const useConsultationMeetings = (consultationId) => {
  const id = normalizeId(consultationId);
  return useQuery({
    queryKey: CONSULTATION_QUERY_KEYS.meetings(id),
    queryFn: () => consultationApi.getMeetings(id),
    enabled: Boolean(id),
    staleTime: CACHE.NORMAL,
    gcTime: CACHE.GC,
  });
};

export const useConsultationDocuments = (consultationId) => {
  const id = normalizeId(consultationId);
  return useQuery({
    queryKey: CONSULTATION_QUERY_KEYS.documents(id),
    queryFn: () => consultationApi.getDocuments(id),
    enabled: Boolean(id),
    staleTime: CACHE.NORMAL,
    gcTime: CACHE.GC,
  });
};

// Notes mevcut ekran uyumluluğu için korunuyor; Notes hardening sonraki aşamada.
export const useConsultationNotes = (consultationId) => {
  const id = normalizeId(consultationId);
  return useQuery({
    queryKey: CONSULTATION_QUERY_KEYS.notes(id),
    queryFn: () => consultationApi.getNotes(id),
    enabled: Boolean(id),
    staleTime: CACHE.NORMAL,
    gcTime: CACHE.GC,
  });
};

export const useCreateConsultation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: consultationApi.create,
    onSuccess: async (response) => {
      const id = getConsultationIdFromResponse(response);
      if (id) setDetailFromMutation(queryClient, id, response);
      await invalidateCollections(queryClient);
      toast.success('Danışmanlık başarıyla oluşturuldu');
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Danışmanlık oluşturulamadı')),
  });
};

export const useUpdateConsultation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => {
      const normalizedId = normalizeId(id);
      if (!normalizedId) throw new Error('Geçerli danışmanlık kaydı bulunamadı');
      return consultationApi.update(normalizedId, data);
    },
    onSuccess: async (response, variables) => {
      const id = normalizeId(variables?.id);
      setDetailFromMutation(queryClient, id, response);
      await Promise.all([
        invalidateCollections(queryClient),
        invalidateExternalViews(queryClient, {
          clientId: getClientId(response),
        }),
      ]);
      if (!variables?.silent) toast.success('Danışmanlık başarıyla güncellendi');
    },
    onError: (error, variables) => {
      if (!variables?.silent) {
        toast.error(getErrorMessage(error, 'Danışmanlık güncellenemedi'));
      }
    },
  });
};

export const useDeleteConsultation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => {
      const normalizedId = normalizeId(id);
      if (!normalizedId) throw new Error('Geçerli danışmanlık kaydı bulunamadı');
      return consultationApi.delete(normalizedId);
    },
    onSuccess: async (_response, id) => {
      const normalizedId = normalizeId(id);
      queryClient.removeQueries({
        queryKey: CONSULTATION_QUERY_KEYS.detail(normalizedId),
        exact: true,
      });
      removeRelationCaches(queryClient, normalizedId);
      await Promise.all([
        invalidateCollections(queryClient),
        invalidateExternalViews(queryClient),
      ]);
      toast.success('Danışmanlık başarıyla silindi');
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Danışmanlık silinemedi')),
  });
};

export const useUpdateConsultationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }) => {
      const normalizedId = normalizeId(id);
      if (!normalizedId) throw new Error('Geçerli danışmanlık kaydı bulunamadı');
      return consultationApi.updateStatus(normalizedId, status);
    },
    onSuccess: async (response, variables) => {
      const id = normalizeId(variables?.id);
      setDetailFromMutation(queryClient, id, response);
      await invalidateCollections(queryClient);
      if (!variables?.silent) toast.success('Danışmanlık durumu güncellendi');
    },
    onError: (error, variables) => {
      if (!variables?.silent) {
        toast.error(getErrorMessage(error, 'Danışmanlık durumu güncellenemedi'));
      }
    },
  });
};

export const useAddConsultationAssignee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => {
      const normalizedId = normalizeId(id);
      if (!normalizedId) throw new Error('Geçerli danışmanlık kaydı bulunamadı');
      return consultationApi.addAssignee(normalizedId, data);
    },
    onSuccess: async (response, variables) => {
      const id = normalizeId(variables?.id);
      setDetailFromMutation(queryClient, id, response);
      await invalidateCollections(queryClient);
      toast.success('Sorumlu başarıyla eklendi');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Sorumlu eklenemedi')),
  });
};

export const useRemoveConsultationAssignee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId }) => {
      const consultationId = normalizeId(id);
      const assigneeId = normalizeId(userId);
      if (!consultationId || !assigneeId) {
        throw new Error('Geçerli danışmanlık veya sorumlu kaydı bulunamadı');
      }
      return consultationApi.removeAssignee(consultationId, assigneeId);
    },
    onSuccess: async (response, variables) => {
      const id = normalizeId(variables?.id);
      setDetailFromMutation(queryClient, id, response);
      await invalidateCollections(queryClient);
      toast.success('Sorumlu başarıyla kaldırıldı');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Sorumlu kaldırılamadı')),
  });
};

export const useAddConsultationNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => {
      const normalizedId = normalizeId(id);
      if (!normalizedId) throw new Error('Geçerli danışmanlık kaydı bulunamadı');
      return consultationApi.addNote(normalizedId, data || {});
    },
    onSuccess: async (_response, variables) => {
      const id = normalizeId(variables?.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CONSULTATION_QUERY_KEYS.notes(id) }),
        queryClient.invalidateQueries({ queryKey: ['consultation-audit-logs', id] }),
      ]);
      toast.success('Not eklendi');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Not eklenemedi')),
  });
};

export const useConvertConsultationToClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data = {} }) => {
      const normalizedId = normalizeId(id);
      if (!normalizedId) throw new Error('Geçerli danışmanlık kaydı bulunamadı');
      return consultationApi.convertToClient(normalizedId, data);
    },
    onSuccess: async (response, variables) => {
      const id = normalizeId(variables?.id);
      setDetailFromMutation(queryClient, id, response);
      await Promise.all([
        invalidateCollections(queryClient),
        invalidateExternalViews(queryClient, {
          clientId: getClientId(response),
        }),
      ]);
      toast.success('Talep sahibi müvekkile dönüştürüldü');
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Müvekkile dönüştürme başarısız')),
  });
};

export const useConvertConsultationToCase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => {
      const normalizedId = normalizeId(id);
      if (!normalizedId) throw new Error('Geçerli danışmanlık kaydı bulunamadı');
      return consultationApi.convertToCase(normalizedId, data);
    },
    onSuccess: async (response, variables) => {
      const id = normalizeId(variables?.id);
      const caseId = getConvertedCaseId(response);
      const clientId = getClientId(response);
      setDetailFromMutation(queryClient, id, response);

      await Promise.all([
        invalidateCollections(queryClient),
        queryClient.invalidateQueries({ queryKey: CONSULTATION_QUERY_KEYS.tasks(id) }),
        queryClient.invalidateQueries({ queryKey: CONSULTATION_QUERY_KEYS.meetings(id) }),
        queryClient.invalidateQueries({ queryKey: CONSULTATION_QUERY_KEYS.documents(id) }),
        invalidateExternalViews(queryClient, {
          clientId,
          caseId,
          includeChildren: true,
        }),
      ]);

      toast.success('Danışmanlık başarıyla davaya dönüştürüldü');
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Davaya dönüştürme başarısız')),
  });
};

export const prefetchConsultation = (queryClient, id) => {
  const normalizedId = normalizeId(id);
  if (!normalizedId) return Promise.resolve();
  return queryClient.prefetchQuery({
    queryKey: CONSULTATION_QUERY_KEYS.detail(normalizedId),
    queryFn: () => consultationApi.getOne(normalizedId),
    staleTime: CACHE.NORMAL,
    gcTime: CACHE.GC,
  });
};

export const prefetchConsultations = (queryClient, params = {}) =>
  queryClient.prefetchQuery({
    queryKey: CONSULTATION_QUERY_KEYS.list(params),
    queryFn: () => consultationApi.getAll(params),
    staleTime: CACHE.NORMAL,
    gcTime: CACHE.GC,
  });

export const updateConsultationCache = (queryClient, id, updater) => {
  const normalizedId = normalizeId(id);
  if (!normalizedId || typeof updater !== 'function') return;

  queryClient.setQueryData(
    CONSULTATION_QUERY_KEYS.detail(normalizedId),
    (current) => {
      if (!current) return current;
      const currentConsultation = getConsultationFromResponse(current);
      const nextConsultation = updater(currentConsultation);
      if (!nextConsultation) return current;

      if (current?.data?.data !== undefined) {
        return {
          ...current,
          data: {
            ...current.data,
            data: nextConsultation,
          },
        };
      }

      if (current?.data !== undefined) {
        return { ...current, data: nextConsultation };
      }

      return nextConsultation;
    }
  );
};

export const removeConsultationFromCache = (queryClient, id) => {
  const normalizedId = normalizeId(id);
  if (!normalizedId) return;
  queryClient.removeQueries({
    queryKey: CONSULTATION_QUERY_KEYS.detail(normalizedId),
    exact: true,
  });
};

export default {
  useConsultations,
  useConsultation,
  useConsultationStatistics,
  useConsultationAssignableUsers,
  useConsultationTasks,
  useConsultationMeetings,
  useConsultationDocuments,
  useConsultationNotes,
  useCreateConsultation,
  useUpdateConsultation,
  useDeleteConsultation,
  useUpdateConsultationStatus,
  useAddConsultationAssignee,
  useRemoveConsultationAssignee,
  useAddConsultationNote,
  useConvertConsultationToClient,
  useConvertConsultationToCase,
};
