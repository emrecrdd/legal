import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  powerOfAttorneyApi,
} from '../../features/power-of-attorney/powerOfAttorney.api.js';

import clientApi from '../../features/clients/client.api.js';
import documentApi from '../../features/documents/document.api.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import {
  PERMISSION_KEYS,
  hasPermission,
} from '../../constants/roles.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  AlertTriangle,
  ArrowLeft,
  FilePlus2,
  KeyRound,
  Save,
  ScrollText,
  Trash2,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const INITIAL_FORM = {
  client_id: '',
  case_id: '',
  title: '',
  description: '',
  start_date: '',
  end_date: '',
  status: 'active',
  authorities: [],
  notes: '',
};

const STATUS_OPTIONS = [
  {
    value: 'active',
    label: 'Aktif',
  },
  {
    value: 'expired',
    label: 'Süresi Doldu',
  },
  {
    value: 'cancelled',
    label: 'İptal',
  },
];

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_DOCUMENT_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.mp4',
  '.webm',
  '.udf',
];

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
      value?.id;

    return objectId === null ||
      objectId === undefined ||
      objectId === ''
      ? ''
      : String(
          objectId
        );
  }

  return String(
    value
  );
};

const getArrayPayload = (
  response
) => {
  const payload =
    response?.data?.data ??
    response?.data ??
    response ??
    [];

  if (
    Array.isArray(
      payload
    )
  ) {
    return payload;
  }

  if (
    Array.isArray(
      payload?.data
    )
  ) {
    return payload.data;
  }

  if (
    Array.isArray(
      payload?.items
    )
  ) {
    return payload.items;
  }

  if (
    Array.isArray(
      payload?.results
    )
  ) {
    return payload.results;
  }

  return [];
};

const getExtension = (
  filename
) => {
  const value =
    String(
      filename ||
      ''
    );

  const index =
    value.lastIndexOf(
      '.'
    );

  if (
    index < 0
  ) {
    return '';
  }

  return value
    .slice(
      index
    )
    .toLowerCase();
};

const normalizeAuthorities = (
  values
) => {
  if (
    !Array.isArray(
      values
    )
  ) {
    return [];
  }

  const seen =
    new Set();

  return values
    .map(
      (value) =>
        String(
          value ||
          ''
        ).trim()
    )
    .filter(Boolean)
    .filter(
      (value) => {
        const key =
          value.toLocaleLowerCase(
            'tr-TR'
          );

        if (
          seen.has(
            key
          )
        ) {
          return false;
        }

        seen.add(
          key
        );

        return true;
      }
    );
};

// ======================================================
// HELPERS
// ======================================================

const getStatusVariant = (
  status
) => {
  switch (status) {
    case 'active':
      return 'success';

    case 'expired':
      return 'warning';

    case 'cancelled':
      return 'danger';

    default:
      return 'default';
  }
};

const getStatusLabel = (
  status
) => {
  return (
    STATUS_OPTIONS.find(
      (item) =>
        item.value ===
        status
    )?.label ||
    status ||
    'Bilinmiyor'
  );
};

const formatDateInput = (
  date
) => {
  if (
    !date
  ) {
    return '';
  }

  const raw =
    String(
      date
    ).trim();

  const directMatch =
    raw.match(
      /^(\d{4}-\d{2}-\d{2})/
    );

  if (
    directMatch?.[1]
  ) {
    return directMatch[1];
  }

  try {
    const parsed =
      new Date(
        date
      );

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return '';
    }

    const formatter =
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone:
            'Europe/Istanbul',
          year:
            'numeric',
          month:
            '2-digit',
          day:
            '2-digit',
        }
      );

    return formatter.format(
      parsed
    );
  } catch {
    return '';
  }
};

// ======================================================
// COMPONENT
// ======================================================

const PowerOfAttorneyEdit = () => {
  const {
    id: idParam,
  } =
    useParams();

  const id =
    normalizeId(
      idParam
    );

  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

  const {
    user,
  } = useAuth();

  const canDelete =
    hasPermission(
      user,
      PERMISSION_KEYS.DELETE_POWER_OF_ATTORNEY
    );

  const [
    formData,
    setFormData,
  ] = useState(
    INITIAL_FORM
  );

  const [
    authorityInput,
    setAuthorityInput,
  ] = useState('');

  const [
    errors,
    setErrors,
  ] = useState({});

  const [
    selectedFile,
    setSelectedFile,
  ] = useState(null);

  const [
    fileInputKey,
    setFileInputKey,
  ] = useState(0);

  const [
    initializedId,
    setInitializedId,
  ] = useState(null);

  // ======================================================
  // POA QUERY
  // ======================================================

  const {
    data: poaData,
    isLoading:
      poaLoading,
    error:
      poaError,
  } = useQuery({
    queryKey: [
      'powerOfAttorney',
      id,
    ],

    queryFn: () =>
      powerOfAttorneyApi.getOne(
        id
      ),

    enabled:
      Boolean(
        id
      ),
  });

  // ======================================================
  // CLIENTS
  // ======================================================

  const {
    data: clientsData,
    isLoading:
      clientsLoading,
  } = useQuery({
    queryKey: [
      'clients',
      {
        limit: 100,
      },
    ],

    queryFn: () =>
      clientApi.getAll({
        limit: 100,
      }),

    staleTime:
      5 * 60 * 1000,
  });

  // ======================================================
  // CLIENT CASES
  // ======================================================

  const {
    data:
      clientCasesData,

    isLoading:
      casesLoading,
  } = useQuery({
    queryKey: [
      'clients',
      normalizeId(
        formData.client_id
      ),
      'cases',
    ],

    queryFn: () =>
      clientApi.getCaseHistory(
        normalizeId(
          formData.client_id
        )
      ),

    enabled:
      Boolean(
        normalizeId(
          formData.client_id
        )
      ),

    staleTime:
      3 * 60 * 1000,
  });

  // ======================================================
  // DATA
  // ======================================================

  const poa =
    poaData?.data?.data ??
    poaData?.data ??
    null;

  const clients =
    getArrayPayload(
      clientsData
    );

  const clientCasesPayload =
    clientCasesData?.data?.data ??
    clientCasesData?.data ??
    clientCasesData ??
    [];

  const cases =
    Array.isArray(
      clientCasesPayload?.cases
    )
      ? clientCasesPayload.cases
      : getArrayPayload(
          clientCasesPayload
        );

  // ======================================================
  // INITIALIZE FORM
  // ======================================================

  useEffect(() => {
    const poaId =
      normalizeId(
        poa?.id
      );

    if (
      !poa ||
      !poaId ||
      initializedId ===
        poaId
    ) {
      return;
    }

    setFormData({
      client_id:
        normalizeId(
          poa.client_id ??
          poa.client?.id
        ),

      case_id:
        normalizeId(
          poa.case_id ??
          poa.case?.id
        ),

      title:
        poa.title ||
        '',

      description:
        poa.description ||
        '',

      start_date:
        formatDateInput(
          poa.start_date
        ),

      end_date:
        formatDateInput(
          poa.end_date
        ),

      status:
        poa.status ||
        'active',

      authorities:
        normalizeAuthorities(
          poa.authorities
        ),

      notes:
        poa.notes ||
        '',
    });

    setInitializedId(
      poaId
    );
  }, [
    poa,
    initializedId,
  ]);

  const refreshPowerOfAttorneyViews =
    async ({
      includeDocuments = false,
      clientId = '',
      caseId = '',
    } = {}) => {
      const normalizedClientId =
        normalizeId(
          clientId
        );

      const normalizedCaseId =
        normalizeId(
          caseId
        );

      const invalidations = [
        queryClient.invalidateQueries({
          queryKey: [
            'powerOfAttorneys',
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            'powerOfAttorney',
            id,
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            'dashboard-stats',
          ],
        }),
      ];

      if (
        includeDocuments
      ) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: [
              'documents',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'case-documents',
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'client-documents',
            ],
          })
        );
      }

      if (
        normalizedClientId
      ) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: [
              'client',
              normalizedClientId,
            ],
          }),

          queryClient.invalidateQueries({
            queryKey: [
              'clients',
              normalizedClientId,
              'cases',
            ],
          })
        );
      }

      if (
        normalizedCaseId
      ) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: [
              'case',
              normalizedCaseId,
            ],
          })
        );
      }

      await Promise.all(
        invalidations
      );
    };

  // ======================================================
  // MUTATIONS
  // ======================================================

  const updateMutation =
    useMutation({
      mutationFn:
        async ({
          data,
          file,
        }) => {
          if (
            !id
          ) {
            throw new Error(
              'Geçerli vekaletname kaydı bulunamadı'
            );
          }

          const updateResponse =
            await powerOfAttorneyApi.update(
              id,
              data
            );

          let documentWarning =
            null;

          if (
            file
          ) {
            try {
              const uploadData =
                new FormData();

              uploadData.append(
                'file',
                file
              );

              uploadData.append(
                'name',
                data.title ||
                file.name ||
                'Vekaletname belgesi'
              );

              uploadData.append(
                'category',
                'general'
              );

              uploadData.append(
                'power_of_attorney_id',
                id
              );

              if (
                data.client_id
              ) {
                uploadData.append(
                  'client_id',
                  data.client_id
                );
              }

              if (
                data.case_id
              ) {
                uploadData.append(
                  'case_id',
                  data.case_id
                );
              }

              uploadData.append(
                'is_public',
                'false'
              );

              uploadData.append(
                'tags',
                'vekaletname'
              );

              await documentApi.upload(
                uploadData
              );
            } catch (
              documentError
            ) {
              documentWarning =
                documentError
                  ?.response
                  ?.data
                  ?.message ||
                documentError
                  ?.message ||
                'Belge yüklenemedi';
            }
          }

          return {
            updateResponse,
            documentWarning,
          };
        },

      onSuccess:
        async (
          result
        ) => {
          await refreshPowerOfAttorneyViews({
            includeDocuments:
              Boolean(
                selectedFile
              ),
            clientId:
              formData.client_id,
            caseId:
              formData.case_id,
          });

          if (
            result?.documentWarning
          ) {
            toast(
              `Vekaletname güncellendi ancak belge yüklenemedi: ${result.documentWarning}`,
              {
                icon:
                  '⚠️',
              }
            );
          } else {
            toast.success(
              selectedFile
                ? 'Vekaletname ve belge başarıyla güncellendi'
                : 'Vekaletname başarıyla güncellendi'
            );
          }

          navigate(
            `/power-of-attorney/${id}`
          );
        },

      onError: (error) => {
        toast.error(
          error?.response
            ?.data?.message ||
            'Vekaletname güncellenemedi'
        );
      },
    });

  const deleteMutation =
    useMutation({
      mutationFn: () => {
        if (
          !id
        ) {
          throw new Error(
            'Geçerli vekaletname kaydı bulunamadı'
          );
        }

        return powerOfAttorneyApi.delete(
          id
        );
      },

      onSuccess: async () => {
        await queryClient.cancelQueries({
          queryKey: [
            'powerOfAttorney',
            id,
          ],
        });

        queryClient.removeQueries({
          queryKey: [
            'powerOfAttorney',
            id,
          ],
          exact: true,
        });

        await refreshPowerOfAttorneyViews({
          includeDocuments:
            true,
          clientId:
            formData.client_id,
          caseId:
            formData.case_id,
        });

        toast.success(
          'Vekaletname silindi'
        );

        navigate(
          '/power-of-attorney'
        );
      },

      onError: (error) => {
        toast.error(
          error?.response
            ?.data?.message ||
            'Vekaletname silinemedi'
        );
      },
    });

  // ======================================================
  // HANDLERS
  // ======================================================

  const handleChange = (
    event
  ) => {
    if (
      updateMutation.isPending ||
      deleteMutation.isPending
    ) {
      return;
    }

    const {
      name,
      value,
    } = event.target;

    const nextValue =
      [
        'client_id',
        'case_id',
      ].includes(
        name
      )
        ? normalizeId(
            value
          )
        : value;

    setFormData(
      (
        current
      ) => {
        if (
          name ===
          'client_id'
        ) {
          return {
            ...current,

            client_id:
              nextValue,

            case_id:
              '',
          };
        }

        return {
          ...current,

          [name]:
            nextValue,
        };
      }
    );

    if (
      errors[name]
    ) {
      setErrors(
        (current) => ({
          ...current,
          [name]: '',
        })
      );
    }
  };

  // ======================================================
  // AUTHORITIES
  // ======================================================

  const handleAddAuthority =
    () => {
      if (
        updateMutation.isPending ||
        deleteMutation.isPending
      ) {
        return;
      }

      const value =
        authorityInput.trim();

      if (!value) {
        return;
      }

      const alreadyExists =
        formData.authorities.some(
          (authority) =>
            authority
              .toLocaleLowerCase(
                'tr'
              )
              .trim() ===
            value
              .toLocaleLowerCase(
                'tr'
              )
              .trim()
        );

      if (alreadyExists) {
        toast.error(
          'Bu yetki zaten eklenmiş'
        );

        return;
      }

      setFormData(
        (current) => ({
          ...current,

          authorities: [
            ...current.authorities,
            value,
          ],
        })
      );

      setAuthorityInput('');
    };

  const handleRemoveAuthority =
    (index) => {
      if (
        updateMutation.isPending ||
        deleteMutation.isPending
      ) {
        return;
      }

      setFormData(
        (current) => ({
          ...current,

          authorities:
            current.authorities.filter(
              (
                _authority,
                currentIndex
              ) =>
                currentIndex !==
                index
            ),
        })
      );
    };

  // ======================================================
  // DOCUMENT
  // ======================================================

  const handleFileChange =
    (
      event
    ) => {
      if (
        updateMutation.isPending ||
        deleteMutation.isPending
      ) {
        return;
      }

      const file =
        event.target.files?.[0] ||
        null;

      if (
        !file
      ) {
        setSelectedFile(
          null
        );

        return;
      }

      if (
        Number(
          file.size
        ) <= 0
      ) {
        toast.error(
          'Boş dosya yüklenemez'
        );

        setSelectedFile(
          null
        );

        setFileInputKey(
          (
            current
          ) =>
            current + 1
        );

        return;
      }

      if (
        file.size >
        MAX_FILE_SIZE
      ) {
        toast.error(
          'Belge boyutu 10MB’dan büyük olamaz'
        );

        setSelectedFile(
          null
        );

        setFileInputKey(
          (
            current
          ) =>
            current + 1
        );

        return;
      }

      const extension =
        getExtension(
          file.name
        );

      if (
        !ALLOWED_DOCUMENT_EXTENSIONS.includes(
          extension
        )
      ) {
        toast.error(
          'Desteklenmeyen belge türü'
        );

        setSelectedFile(
          null
        );

        setFileInputKey(
          (
            current
          ) =>
            current + 1
        );

        return;
      }

      setSelectedFile(
        file
      );
    };

  const clearSelectedFile =
    () => {
      if (
        updateMutation.isPending ||
        deleteMutation.isPending
      ) {
        return;
      }

      setSelectedFile(
        null
      );

      setFileInputKey(
        (
          current
        ) =>
          current + 1
      );
    };

  // ======================================================
  // VALIDATION
  // ======================================================

  const validateForm =
    () => {
      const nextErrors =
        {};

      const clientId =
        normalizeId(
          formData.client_id
        );

      const caseId =
        normalizeId(
          formData.case_id
        );

      if (
        !clientId
      ) {
        nextErrors.client_id =
          'Müvekkil seçimi zorunludur';
      }

      const title =
        formData.title.trim();

      if (
        title.length >
        255
      ) {
        nextErrors.title =
          'Başlık en fazla 255 karakter olabilir';
      }

      if (
        !STATUS_OPTIONS.some(
          (item) =>
            item.value ===
            formData.status
        )
      ) {
        nextErrors.status =
          'Geçersiz vekaletname durumu';
      }

      if (
        caseId &&
        !cases.some(
          (caseItem) =>
            normalizeId(
              caseItem?.id
            ) ===
            caseId
        )
      ) {
        nextErrors.case_id =
          'Seçilen dava bu müvekkille ilişkili değil veya artık erişilemiyor';
      }

      if (
        formData.start_date &&
        formData.end_date &&
        formData.end_date <
          formData.start_date
      ) {
        nextErrors.end_date =
          'Bitiş tarihi başlangıç tarihinden önce olamaz';
      }

      setErrors(
        nextErrors
      );

      return (
        Object.keys(
          nextErrors
        ).length === 0
      );
    };

  // ======================================================
  // SUBMIT
  // ======================================================

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    if (
      updateMutation.isPending ||
      deleteMutation.isPending
    ) {
      return;
    }

    if (
      !id
    ) {
      toast.error(
        'Geçerli vekaletname kaydı bulunamadı'
      );

      return;
    }

    if (
      !validateForm()
    ) {
      toast.error(
        'Formdaki alanları kontrol edin'
      );

      return;
    }

    /*
     * Vekaletname metadata'sı normal update endpoint'ine gider.
     * Seçilen yeni belge varsa güncelleme başarılı olduktan sonra
     * Document modülünün upload endpoint'i üzerinden ilişkilendirilir.
     */
    const submitData = {
      client_id:
        normalizeId(
          formData.client_id
        ),

      case_id:
        normalizeId(
          formData.case_id
        ) ||
        null,

      title:
        formData.title.trim() ||
        null,

      description:
        formData.description
          .trim() ||
        null,

      start_date:
        formData.start_date ||
        null,

      end_date:
        formData.end_date ||
        null,

      status:
        formData.status,

      authorities:
        normalizeAuthorities(
          formData.authorities
        ),

      notes:
        formData.notes
          .trim() ||
        null,
    };

    updateMutation.mutate({
      data:
        submitData,

      file:
        selectedFile,
    });
  };

  // ======================================================
  // DELETE
  // ======================================================

  const handleDelete =
    () => {
      if (
        updateMutation.isPending ||
        deleteMutation.isPending
      ) {
        return;
      }

      if (!canDelete) {
        toast.error(
          'Bu vekaletnameyi silme yetkiniz bulunmuyor'
        );

        return;
      }

      if (
        !id
      ) {
        toast.error(
          'Geçerli vekaletname kaydı bulunamadı'
        );

        return;
      }

      const confirmed =
        window.confirm(
          `"${poa?.title || 'Bu vekaletname'}" kaydını silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`
        );

      if (!confirmed) {
        return;
      }

      deleteMutation.mutate();
    };

  // ======================================================
  // LOADING
  // ======================================================

  if (poaLoading) {
    return (
      <div className="flex h-64 items-center justify-center">

        <div className="text-center">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600" />

          <p className="mt-4 text-sm text-gray-500">
            Vekaletname yükleniyor...
          </p>

        </div>

      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (
    poaError ||
    !poa
  ) {
    return (
      <div className="py-12 text-center">

        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-800">
          <ScrollText className="h-6 w-6" />
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Vekaletname Bulunamadı
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {poaError?.response
            ?.data?.message ||
            poaError?.message ||
            'Vekaletname bilgileri yüklenemedi'}
        </p>

        <Link
          to="/power-of-attorney"
          className="mt-4 inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />

          Vekaletnamelere Dön
        </Link>

      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      {/* HEADER */}

      <div>

        <Link
          to={`/power-of-attorney/${id}`}
          className="
            inline-flex
            items-center
            gap-1.5
            text-xs
            font-medium
            text-gray-500
            transition
            hover:text-blue-600
            dark:text-slate-500
            dark:hover:text-blue-400
          "
        >
          <ArrowLeft className="h-3.5 w-3.5" />

          Vekaletname Detayı
        </Link>

        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
          Vekaletname Düzenle
        </h1>

        <div className="mt-2 flex flex-wrap items-center gap-2">

          <Badge
            variant={getStatusVariant(
              formData.status
            )}
          >
            {getStatusLabel(
              formData.status
            )}
          </Badge>

          <Badge variant="default">
            <span className="inline-flex items-center gap-1">
              <ScrollText className="h-3.5 w-3.5" />
              Vekaletname
            </span>
          </Badge>

        </div>

        <p className="mt-2 text-sm text-gray-500">
          {poa.title ||
            poa.client?.name ||
            'Vekaletname'}
        </p>

      </div>

      {/* DOCUMENT */}

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">

        <div className="flex items-start gap-3">

          <FilePlus2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />

          <div className="min-w-0 flex-1">

            <p className="font-medium text-blue-900 dark:text-blue-200">
              Vekaletname Belgesi
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-300">
              İsterseniz bu güncelleme sırasında yeni bir belge ekleyebilirsiniz.
              Belge, bu vekaletname ve seçili müvekkil/dava ile ilişkilendirilir.
            </p>

            {Array.isArray(
              poa.documents
            ) &&
              poa.documents.length >
                0 && (
                <div className="mt-3 space-y-2">

                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                    Mevcut Belgeler
                  </p>

                  {poa.documents.map(
                    (
                      document
                    ) => {
                      const documentItem =
                        document?.document ||
                        document;

                      return (
                      <div
                        key={
                          normalizeId(
                            documentItem?.id
                          ) ||
                          documentItem?.original_name ||
                          documentItem?.name
                        }
                        className="rounded-lg border border-blue-200/70 bg-white/70 px-3 py-2 dark:border-blue-800 dark:bg-slate-900/30"
                      >
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {documentItem?.original_name ||
                            documentItem?.name ||
                            'Belge'}
                        </p>
                      </div>
                      );
                    }
                  )}

                </div>
              )}

            <div className="mt-4">

              <label className="mb-1.5 block text-sm font-medium text-blue-900 dark:text-blue-200">
                Yeni Belge Ekle
              </label>

              <input
                key={
                  fileInputKey
                }
                type="file"
                onChange={
                  handleFileChange
                }
                disabled={
                  updateMutation.isPending ||
                  deleteMutation.isPending
                }
                accept={ALLOWED_DOCUMENT_EXTENSIONS.join(
                  ','
                )}
                className="block w-full text-sm text-blue-900 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700 disabled:opacity-60 dark:text-blue-200"
              />

              <p className="mt-1 text-xs text-blue-700/80 dark:text-blue-300/80">
                PDF, Word, Excel, görsel, video ve UDF · Maksimum 10MB
              </p>

              {selectedFile && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-white/80 px-3 py-2 dark:border-blue-800 dark:bg-slate-900/40">

                  <p className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white">
                    {selectedFile.name}
                  </p>

                  <button
                    type="button"
                    onClick={
                      clearSelectedFile
                    }
                    disabled={
                      updateMutation.isPending
                    }
                    className="shrink-0 text-gray-400 transition hover:text-red-600 disabled:opacity-50"
                    aria-label="Seçili belgeyi kaldır"
                  >
                    <X className="h-4 w-4" />
                  </button>

                </div>
              )}

            </div>

          </div>

        </div>

      </div>

      {/* FORM */}

      <Card>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6 p-6"
        >

          {/* CLIENT */}

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Müvekkil *
            </label>

            <select
              name="client_id"
              value={
                formData.client_id
              }
              onChange={
                handleChange
              }
              disabled={
                clientsLoading ||
                updateMutation.isPending
              }
              className={`w-full rounded-md border ${
                errors.client_id
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-wait disabled:bg-gray-100 dark:bg-gray-700 dark:text-white`}
            >

              <option value="">
                Müvekkil seçin
              </option>

              {clients.map(
                (client) => (
                  <option
                    key={
                      client.id
                    }
                    value={
                      normalizeId(
                        client.id
                      )
                    }
                  >
                    {
                      client.name
                    }

                    {client.company_name &&
                      ` (${client.company_name})`}
                  </option>
                )
              )}

            </select>

            {errors.client_id && (
              <p className="mt-1 text-sm text-red-600">
                {
                  errors.client_id
                }
              </p>
            )}

          </div>

          {/* CASE */}

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              İlişkili Dava
            </label>

            <select
              name="case_id"
              value={
                formData.case_id
              }
              onChange={
                handleChange
              }
              disabled={
                !formData.client_id ||
                casesLoading ||
                updateMutation.isPending
              }
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >

              <option value="">
                {!formData.client_id
                  ? 'Önce müvekkil seçin'
                  : casesLoading
                    ? 'Davalar yükleniyor...'
                    : cases.length >
                        0
                      ? 'Dava seçin (isteğe bağlı)'
                      : 'Bu müvekkile ait dava bulunamadı'}
              </option>

              {cases.map(
                (caseItem) => (
                  <option
                    key={
                      caseItem.id
                    }
                    value={
                      normalizeId(
                        caseItem.id
                      )
                    }
                  >
                    {
                      caseItem.title
                    }

                    {caseItem.case_number &&
                      ` · ${caseItem.case_number}`}
                  </option>
                )
              )}

            </select>

            {errors.case_id && (
              <p className="mt-1 text-sm text-red-600">
                {errors.case_id}
              </p>
            )}

          </div>

          {/* TITLE */}

          <Input
            label="Vekaletname Başlığı"
            name="title"
            value={
              formData.title
            }
            onChange={
              handleChange
            }
            error={
              errors.title
            }
            disabled={
              updateMutation.isPending
            }
            placeholder="Örn: Arsa Davası Vekaleti"
          />

          {/* DESCRIPTION */}

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Açıklama
            </label>

            <textarea
              name="description"
              value={
                formData.description
              }
              onChange={
                handleChange
              }
              rows="4"
              disabled={
                updateMutation.isPending
              }
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Vekaletname ile ilgili açıklama..."
            />

          </div>

          {/* DATES */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <Input
              label="Başlangıç Tarihi"
              name="start_date"
              type="date"
              value={
                formData.start_date
              }
              onChange={
                handleChange
              }
              disabled={
                updateMutation.isPending
              }
            />

            <Input
              label="Bitiş Tarihi"
              name="end_date"
              type="date"
              value={
                formData.end_date
              }
              onChange={
                handleChange
              }
              error={
                errors.end_date
              }
              disabled={
                updateMutation.isPending
              }
            />

          </div>

          {/* STATUS */}

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Durum
            </label>

            <select
              name="status"
              value={
                formData.status
              }
              onChange={
                handleChange
              }
              disabled={
                updateMutation.isPending
              }
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >

              {STATUS_OPTIONS.map(
                (status) => (
                  <option
                    key={
                      status.value
                    }
                    value={
                      status.value
                    }
                  >
                    {
                      status.label
                    }
                  </option>
                )
              )}

            </select>

            {errors.status && (
              <p className="mt-1 text-sm text-red-600">
                {errors.status}
              </p>
            )}

          </div>

          {/* AUTHORITIES */}

          <div>

            <label className="mb-1 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">

              <KeyRound className="h-4 w-4" />

              Yetkiler

            </label>

            <div className="flex flex-col gap-2 sm:flex-row">

              <input
                type="text"
                value={
                  authorityInput
                }
                onChange={(event) =>
                  setAuthorityInput(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    event.preventDefault();

                    handleAddAuthority();
                  }
                }}
                disabled={
                  updateMutation.isPending ||
                  deleteMutation.isPending
                }
                placeholder="Yetki ekle, örn: tahsilat"
                className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />

              <Button
                type="button"
                variant="secondary"
                onClick={
                  handleAddAuthority
                }
                disabled={
                  updateMutation.isPending ||
                  deleteMutation.isPending
                }
              >
                Ekle
              </Button>

            </div>

            {formData.authorities.length >
              0 && (
              <div className="mt-3 flex flex-wrap gap-2">

                {formData.authorities.map(
                  (
                    authority,
                    index
                  ) => (
                    <Badge
                      key={`${authority}-${index}`}
                      variant="default"
                      className="flex items-center gap-1"
                    >
                      {
                        authority
                      }

                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveAuthority(
                            index
                          )
                        }
                        disabled={
                          updateMutation.isPending
                        }
                        className="ml-1 text-gray-400 hover:text-red-600"
                        aria-label={`${authority} yetkisini kaldır`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>

                    </Badge>
                  )
                )}

              </div>
            )}

          </div>

          {/* NOTES */}

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Notlar
            </label>

            <textarea
              name="notes"
              value={
                formData.notes
              }
              onChange={
                handleChange
              }
              rows="4"
              disabled={
                updateMutation.isPending
              }
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Ek notlar..."
            />

          </div>

          {/* WARNING */}

          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">

            <div className="flex items-start gap-2">

              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

              <p>
                Müvekkil veya dava ilişkisini değiştirmeniz vekaletnamenin dosya bağlamını etkiler. Kaydetmeden önce seçilen kayıtları kontrol edin.
              </p>

            </div>

          </div>

          {/* ACTIONS */}

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">

            <Button
              type="submit"
              loading={
                updateMutation.isPending
              }
              disabled={
                updateMutation.isPending ||
                deleteMutation.isPending
              }
            >
              <Save className="mr-2 h-4 w-4" />

              Değişiklikleri Kaydet
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                navigate(
                  `/power-of-attorney/${id}`
                )
              }
              disabled={
                updateMutation.isPending ||
                deleteMutation.isPending
              }
            >
              Vazgeç
            </Button>

            {canDelete && (
              <Button
                type="button"
                variant="danger"
                onClick={
                  handleDelete
                }
                loading={
                  deleteMutation.isPending
                }
                disabled={
                  deleteMutation.isPending ||
                  updateMutation.isPending
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />

                Vekaletnameyi Sil
              </Button>
            )}

          </div>

        </form>

      </Card>

    </div>
  );
};

export default PowerOfAttorneyEdit;