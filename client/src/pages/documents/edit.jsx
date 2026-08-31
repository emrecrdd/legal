import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  useQuery,
} from '@tanstack/react-query';

import {
  useDocument,
  useUpdateDocument,
} from '../../features/documents/document.query.js';

import caseApi from '../../features/cases/case.api.js';
import clientApi from '../../features/clients/client.api.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  AlertTriangle,
  ArrowLeft,
  BriefcaseBusiness,
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  Gavel,
  Image,
  LockKeyhole,
  Mail,
  Paperclip,
  Pin,
  Save,
  Search,
  Send,
  ShieldCheck,
  Tags,
  UserRound,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const INITIAL_FORM = {
  name: '',
  description: '',
  category: 'general',
  tags: '',
  case_id: '',
  client_id: '',
  is_public: false,
};

const CATEGORY_OPTIONS = [
  {
    value: 'general',
    label: 'Genel',
    icon: Folder,
  },
  {
    value: 'petition',
    label: 'Dilekçe',
    icon: FileText,
  },
  {
    value: 'expert_report',
    label: 'Bilirkişi Raporu',
    icon: FileSpreadsheet,
  },
  {
    value: 'court_decision',
    label: 'Mahkeme Kararı',
    icon: Gavel,
  },
  {
    value: 'notification',
    label: 'Tebligat',
    icon: Send,
  },
  {
    value: 'evidence',
    label: 'Delil',
    icon: Search,
  },
  {
    value: 'correspondence',
    label: 'Yazışma',
    icon: Mail,
  },
  {
    value: 'other',
    label: 'Diğer',
    icon: Pin,
  },
];

// ======================================================
// HELPERS
// ======================================================

const getCategoryVariant = (
  category
) => {
  switch (category) {
    case 'petition':
      return 'info';

    case 'court_decision':
      return 'success';

    case 'notification':
      return 'warning';

    case 'evidence':
      return 'danger';

    default:
      return 'default';
  }
};

const getFileIcon = (
  fileType
) => {
  switch (
    fileType
  ) {
    case 'pdf':
      return FileText;

    case 'word':
      return FileText;

    case 'excel':
      return FileSpreadsheet;

    case 'udf':
      return FileArchive;

    case 'image':
      return FileImage;

    default:
      return Paperclip;
  }
};

const getFileTypeLabel = (
  fileType
) => {
  const labels = {
    pdf: 'PDF',
    word: 'Word',
    excel: 'Excel',
    udf: 'UDF',
    image: 'Görsel',
    other: 'Dosya',
  };

  return (
    labels[fileType] ||
    fileType?.toUpperCase() ||
    'Dosya'
  );
};

const formatFileSize = (
  bytes
) => {
  const size =
    Number(bytes) || 0;

  if (size <= 0) {
    return '0 B';
  }

  const units = [
    'B',
    'KB',
    'MB',
    'GB',
  ];

  const index = Math.min(
    Math.floor(
      Math.log(size) /
        Math.log(1024)
    ),
    units.length - 1
  );

  const value =
    size /
    1024 ** index;

  return `${Number(
    value.toFixed(2)
  )} ${units[index]}`;
};

const normalizeTags = (
  value
) => {
  if (!value) {
    return [];
  }

  return [
    ...new Set(
      value
        .split(',')
        .map((tag) =>
          tag.trim()
        )
        .filter(Boolean)
    ),
  ];
};

const getCaseDisplayName = (
  caseItem
) => {
  if (
    !caseItem
  ) {
    return 'Dava';
  }

  const courtName =
    String(
      caseItem.court_name ||
      ''
    ).trim();

  const caseNumber =
    String(
      caseItem.case_number ||
      ''
    ).trim();

  if (
    courtName &&
    caseNumber
  ) {
    return `${courtName} · ${caseNumber}`;
  }

  return (
    courtName ||
    caseNumber ||
    caseItem.title ||
    'Dava'
  );
};

const getCaseSecondaryInfo = (
  caseItem
) => {
  if (
    !caseItem
  ) {
    return '';
  }

  return [
    caseItem.judiciary_type,
    caseItem.judiciary_unit,
  ]
    .filter(Boolean)
    .join(' · ');
};

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

const normalizeFormForComparison = (
  form
) => ({
  name:
    String(
      form?.name ||
      ''
    ).trim(),

  description:
    String(
      form?.description ||
      ''
    ).trim(),

  category:
    form?.category ||
    'general',

  tags:
    normalizeTags(
      form?.tags ||
      ''
    )
      .map(
        (tag) =>
          tag.toLocaleLowerCase(
            'tr-TR'
          )
      )
      .sort(),

  case_id:
    normalizeId(
      form?.case_id
    ),

  client_id:
    normalizeId(
      form?.client_id
    ),

  is_public:
    Boolean(
      form?.is_public
    ),
});

// ======================================================
// COMPONENT
// ======================================================

const DocumentEdit = () => {
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

  const [
    formData,
    setFormData,
  ] = useState(
    INITIAL_FORM
  );

  const [
    initialFormData,
    setInitialFormData,
  ] = useState(
    INITIAL_FORM
  );

  const [
    errors,
    setErrors,
  ] = useState({});

  const [
    initializedDocumentId,
    setInitializedDocumentId,
  ] = useState(null);

  // ======================================================
  // DOCUMENT
  // ======================================================

  const {
    data:
      documentData,
    isLoading:
      documentLoading,
    error:
      documentError,
  } = useDocument(id);

  const updateMutation =
    useUpdateDocument();

  // ======================================================
  // CASES
  // ======================================================

  const {
    data: casesData,
    isLoading:
      casesLoading,
    error:
      casesError,
  } = useQuery({
    queryKey: [
      'cases',
      {
        limit: 100,
      },
    ],

    queryFn: () =>
      caseApi.getAll({
        limit: 100,
      }),

    staleTime:
      5 * 60 * 1000,
  });

  // ======================================================
  // CLIENTS
  // ======================================================

  const {
    data: clientsData,
    isLoading:
      clientsLoading,
    error:
      clientsError,
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
  // DATA
  // ======================================================

  const documentItem =
    documentData?.data?.data ??
    documentData?.data ??
    null;

  const cases =
    getArrayPayload(
      casesData
    );

  const clients =
    getArrayPayload(
      clientsData
    );

  // ======================================================
  // CLIENT CASES
  //
  // Müvekkil seçildiğinde yalnızca o müvekkile bağlı
  // davaları getiriyoruz.
  // ======================================================

  const {
    data:
      clientCasesData,

    isLoading:
      clientCasesLoading,

    error:
      clientCasesError,
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

  const clientCases =
    useMemo(() => {
      const payload =
        clientCasesData?.data?.data ??
        clientCasesData?.data ??
        clientCasesData ??
        [];

      if (
        Array.isArray(
          payload?.cases
        )
      ) {
        return payload.cases;
      }

      return getArrayPayload(
        payload
      );
    }, [
      clientCasesData,
    ]);

  // ======================================================
  // SELECTED CASE DETAIL
  //
  // Dava önce seçilirse o davaya bağlı müvekkilleri
  // gösterebilmek için dava detayını alıyoruz.
  // ======================================================

  const {
    data:
      selectedCaseData,

    isLoading:
      selectedCaseDetailLoading,

    error:
      selectedCaseDetailError,
  } = useQuery({
    queryKey: [
      'case',
      normalizeId(
        formData.case_id
      ),
    ],

    queryFn: () =>
      caseApi.getOne(
        normalizeId(
          formData.case_id
        )
      ),

    enabled:
      Boolean(
        normalizeId(
          formData.case_id
        )
      ),

    staleTime:
      3 * 60 * 1000,
  });

  const selectedCaseDetail =
    selectedCaseData?.data?.data ??
    selectedCaseData?.data ??
    null;

  const caseClients =
    useMemo(() => {
      if (
        !selectedCaseDetail
      ) {
        return [];
      }

      const candidates = [
        selectedCaseDetail.clients,
        selectedCaseDetail.case_clients,
        selectedCaseDetail.related_clients,
      ];

      for (
        const candidate of
        candidates
      ) {
        if (
          Array.isArray(
            candidate
          )
        ) {
          return candidate
            .map(
              (
                item
              ) =>
                item?.client ||
                item
            )
            .filter(
              (
                item
              ) =>
                item?.id
            );
        }
      }

      if (
        selectedCaseDetail.client?.id
      ) {
        return [
          selectedCaseDetail.client,
        ];
      }

      if (
        selectedCaseDetail.client_id
      ) {
        const matched =
          clients.find(
            (
              client
            ) =>
              normalizeId(
                client.id
              ) ===
              normalizeId(
                selectedCaseDetail.client_id
              )
          );

        return matched
          ? [
              matched,
            ]
          : [];
      }

      return [];
    }, [
      selectedCaseDetail,
      clients,
    ]);

  const relationCases =
    formData.client_id
      ? clientCases
      : cases;

  const relationCasesLoading =
    formData.client_id
      ? clientCasesLoading
      : casesLoading;

  const relationClients =
    formData.case_id
      ? caseClients
      : clients;

  const relationClientsLoading =
    formData.case_id
      ? selectedCaseDetailLoading
      : clientsLoading;

  // ======================================================
  // FORM INITIALIZATION
  // ======================================================

  useEffect(() => {
    const documentId =
      normalizeId(
        documentItem?.id
      );

    if (
      !documentItem ||
      !documentId ||
      initializedDocumentId ===
        documentId
    ) {
      return;
    }

    const nextForm = {
      name:
        documentItem.name ||
        '',

      description:
        documentItem.description ||
        '',

      category:
        documentItem.category ||
        'general',

      tags:
        Array.isArray(
          documentItem.tags
        )
          ? documentItem.tags.join(
              ', '
            )
          : String(
              documentItem.tags ||
              ''
            ),

      case_id:
        normalizeId(
          documentItem.case_id ??
          documentItem.case?.id
        ),

      client_id:
        normalizeId(
          documentItem.client_id ??
          documentItem.client?.id
        ),

      is_public:
        Boolean(
          documentItem.is_public
        ),
    };

    setFormData(
      nextForm
    );

    setInitialFormData(
      nextForm
    );

    setInitializedDocumentId(
      documentId
    );

    setErrors(
      {}
    );
  }, [
    documentItem,
    initializedDocumentId,
  ]);

  // ======================================================
  // DERIVED
  // ======================================================

  const selectedCategory =
    useMemo(() => {
      return (
        CATEGORY_OPTIONS.find(
          (item) =>
            item.value ===
            formData.category
        ) ||
        CATEGORY_OPTIONS[0]
      );
    }, [
      formData.category,
    ]);


  const SelectedCategoryIcon =
    selectedCategory.icon;

  const tagsPreview =
    useMemo(() => {
      return normalizeTags(
        formData.tags
      );
    }, [
      formData.tags,
    ]);

  const selectedCase =
    useMemo(() => {
      return (
        relationCases.find(
          (
            item
          ) =>
            normalizeId(
              item.id
            ) ===
            normalizeId(
              formData.case_id
            )
        ) ||
        (
          selectedCaseDetail &&
          normalizeId(
            selectedCaseDetail.id
          ) ===
          normalizeId(
            formData.case_id
          )
            ? selectedCaseDetail
            : null
        )
      );
    }, [
      relationCases,
      selectedCaseDetail,
      formData.case_id,
    ]);

  const selectedClient =
    useMemo(() => {
      return clients.find(
        (
          item
        ) =>
          normalizeId(
            item.id
          ) ===
          normalizeId(
            formData.client_id
          )
      );
    }, [
      clients,
      formData.client_id,
    ]);

  const hasRelationLoadError =
    Boolean(
      casesError ||
      clientsError ||
      clientCasesError ||
      selectedCaseDetailError
    );

  const isDirty =
    useMemo(() => {
      return (
        JSON.stringify(
          normalizeFormForComparison(
            formData
          )
        ) !==
        JSON.stringify(
          normalizeFormForComparison(
            initialFormData
          )
        )
      );
    }, [
      formData,
      initialFormData,
    ]);

  const selectedClientBelongsToCase =
    useMemo(() => {
      const caseId =
        normalizeId(
          formData.case_id
        );

      const clientId =
        normalizeId(
          formData.client_id
        );

      if (
        !caseId ||
        !clientId
      ) {
        return true;
      }

      return caseClients.some(
        (
          client
        ) =>
          normalizeId(
            client?.id
          ) ===
          clientId
      );
    }, [
      caseClients,
      formData.case_id,
      formData.client_id,
    ]);

  const relationDataLoading =
    Boolean(
      casesLoading ||
      clientsLoading ||
      (
        formData.client_id &&
        clientCasesLoading
      ) ||
      (
        formData.case_id &&
        selectedCaseDetailLoading
      )
    );

  const PhysicalFileIcon =
    getFileIcon(
      documentItem?.file_type
    );

  // ======================================================
  // HANDLERS
  // ======================================================

  const handleChange = (
    event
  ) => {
    if (
      updateMutation.isPending
    ) {
      return;
    }

    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    const nextValue =
      type ===
      'checkbox'
        ? checked
        : [
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
        /*
         * Müvekkil değiştiğinde mevcut dava artık
         * o müvekkile ait olmayabilir.
         */
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

    if (errors[name]) {
      setErrors(
        (current) => ({
          ...current,
          [name]: '',
        })
      );
    }
  };

  // ======================================================
  // VALIDATION
  // ======================================================

  const validateForm =
    () => {
      const nextErrors =
        {};

      const name =
        formData.name.trim();

      if (!name) {
        nextErrors.name =
          'Belge adı gereklidir';
      }

      if (
        name.length > 255
      ) {
        nextErrors.name =
          'Belge adı en fazla 255 karakter olabilir';
      }

      const caseId =
        normalizeId(
          formData.case_id
        );

      const clientId =
        normalizeId(
          formData.client_id
        );

      if (
        caseId &&
        !selectedCase
      ) {
        nextErrors.case_id =
          'Seçilen dava artık erişilemiyor veya ilişki listesinde bulunmuyor';
      }

      if (
        clientId &&
        !selectedClient
      ) {
        nextErrors.client_id =
          'Seçilen müvekkil artık erişilemiyor';
      }

      if (
        caseId &&
        clientId &&
        selectedCaseDetail &&
        !selectedClientBelongsToCase
      ) {
        nextErrors.client_id =
          'Seçilen müvekkil bu davayla ilişkili değil';
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
      updateMutation.isPending
    ) {
      return;
    }

    if (
      !id
    ) {
      toast.error(
        'Geçerli belge kaydı bulunamadı'
      );

      return;
    }

    if (
      !isDirty
    ) {
      toast(
        'Kaydedilecek bir değişiklik bulunmuyor'
      );

      return;
    }

    const relationsChanged =
      normalizeId(
        formData.case_id
      ) !==
        normalizeId(
          initialFormData.case_id
        ) ||
      normalizeId(
        formData.client_id
      ) !==
        normalizeId(
          initialFormData.client_id
        );

    if (
      relationsChanged &&
      relationDataLoading
    ) {
      toast.error(
        'İlişkili kayıtlar yüklenirken değişiklik kaydedilemez'
      );

      return;
    }

    if (
      relationsChanged &&
      hasRelationLoadError
    ) {
      toast.error(
        'İlişkili kayıtlar doğrulanamadı. Dava ve müvekkil bilgilerini kontrol edin.'
      );

      return;
    }

    if (
      !validateForm()
    ) {
      toast.error(
        'Formdaki eksik veya hatalı alanları kontrol edin'
      );

      return;
    }

    const updateData = {
      name:
        formData.name.trim(),

      description:
        formData.description
          .trim() ||
        null,

      category:
        formData.category,

      tags:
        normalizeTags(
          formData.tags
        ),

      case_id:
        normalizeId(
          formData.case_id
        ) ||
        null,

      client_id:
        normalizeId(
          formData.client_id
        ) ||
        null,

      is_public:
        Boolean(
          formData.is_public
        ),
    };

    updateMutation.mutate(
      {
        id,
        data:
          updateData,
      },
      {
        onSuccess: () => {
          setInitialFormData(
            formData
          );

          navigate(
            `/documents/${id}`
          );
        },
      }
    );
  };

  // ======================================================
  // LOADING
  // ======================================================

  if (
    documentLoading
  ) {
    return (
      <div className="flex h-64 items-center justify-center">

        <div className="text-center">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600" />

          <p className="mt-4 text-sm text-gray-500">
            Belge bilgileri yükleniyor...
          </p>

        </div>

      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (
    documentError ||
    !documentItem
  ) {
    return (
      <div className="py-12 text-center">

        <div className="mb-4 flex justify-center">
          <FileText className="h-12 w-12 text-gray-400" />
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Belge Bulunamadı
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {documentError
            ?.response
            ?.data
            ?.message ||
            documentError
              ?.message ||
            'Belge detayları yüklenemedi'}
        </p>

        <Link
          to="/documents"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />

          Belgeler Listesine Dön
        </Link>

      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* HEADER */}

      <div>

        <Link
          to={`/documents/${id}`}
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

          Belge Detayı
        </Link>

        <div className="mt-3 flex items-start gap-3">

          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-blue-50
              text-blue-600
              dark:bg-blue-500/[0.08]
              dark:text-blue-400
            "
          >
            <FileText size={20} />
          </div>

          <div className="min-w-0">

            <h1
              className="
                text-2xl
                font-semibold
                tracking-[-0.035em]
                text-gray-900
                dark:text-white
              "
            >
              Belge Bilgilerini Düzenle
            </h1>

            <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-slate-400">
              Belge ailesinin adı, sınıflandırması, ilişkileri ve erişim bilgilerini güncelleyin.
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">

              <p className="max-w-xl truncate text-xs text-gray-400 dark:text-slate-500">
                {documentItem.original_name ||
                  documentItem.name}
              </p>

              {documentItem.file_type && (
                <Badge
                  variant={
                    documentItem.file_type ===
                    'udf'
                      ? 'info'
                      : 'default'
                  }
                >
                  {getFileTypeLabel(
                    documentItem.file_type
                  )}
                </Badge>
              )}

            </div>

          </div>

        </div>

      </div>

      {/* VERSION INFO */}

      <div
        className="
          rounded-xl
          border
          border-blue-200
          bg-blue-50/70
          p-4
          dark:border-blue-500/20
          dark:bg-blue-500/[0.06]
        "
      >

        <div className="flex items-start gap-3">

          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />

          <div>

            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              Dosya içeriği bu ekrandan değiştirilmez
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-800/80 dark:text-blue-300/80">
              Düzeltilmiş veya yeni bir dosya yüklemek için belge detayındaki
              <strong> Yeni Versiyon </strong>
              işlemini kullanın. Böylece eski sürümler korunmaya devam eder.
            </p>

          </div>

        </div>

      </div>

      {/* RELATION WARNING */}

      {hasRelationLoadError && (
        <div
          className="
            rounded-xl
            border
            border-amber-200
            bg-amber-50
            p-4
            dark:border-amber-500/20
            dark:bg-amber-500/[0.06]
          "
        >

          <div className="flex items-start gap-3">

            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />

            <div>

              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Bazı ilişkili kayıtlar yüklenemedi
              </p>

              <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-300/80">
                Dava veya müvekkil listesi eksik görünebilir.
              </p>

            </div>

          </div>

        </div>
      )}

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-5"
      >

        {/* ORIGINAL FILE */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-gray-100
                  text-gray-600
                  dark:bg-white/[0.04]
                  dark:text-slate-400
                "
              >
                <FileText size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Fiziksel Dosya
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Bu bilgiler salt okunurdur
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div
              className="
                flex
                flex-col
                gap-4
                rounded-xl
                border
                border-gray-100
                bg-gray-50/70
                p-4
                dark:border-white/[0.05]
                dark:bg-white/[0.02]
                sm:flex-row
                sm:items-center
              "
            >

              <div
                className={`
                  flex
                  h-14
                  w-14
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-white
                  shadow-sm
                  dark:bg-white/[0.04]
                  ${
                    documentItem.file_type ===
                    'udf'
                      ? 'ring-1 ring-cyan-200 dark:ring-cyan-500/20'
                      : ''
                  }
                `}
              >
                <PhysicalFileIcon
                  className="h-7 w-7"
                  strokeWidth={1.8}
                />
              </div>

              <div className="min-w-0 flex-1">

                <div className="flex flex-wrap items-center gap-2">

                  <p className="max-w-xl truncate font-semibold text-gray-900 dark:text-white">
                    {documentItem.original_name ||
                      '-'}
                  </p>

                  <Badge variant="info">
                    v
                    {documentItem.version ||
                      1}
                  </Badge>

                  <Badge
                    variant={
                      documentItem.file_type ===
                      'udf'
                        ? 'info'
                        : 'default'
                    }
                  >
                    {getFileTypeLabel(
                      documentItem.file_type
                    )}
                  </Badge>

                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-slate-500">

                  <span>
                    {formatFileSize(
                      documentItem.file_size
                    )}
                  </span>

                  <span className="hidden sm:inline">
                    •
                  </span>

                  <span>
                    {documentItem.mime_type ||
                      'Dosya türü bilinmiyor'}
                  </span>

                  {documentItem.file_type ===
                    'udf' && (
                    <>
                      <span className="hidden sm:inline">
                        •
                      </span>

                      <span className="font-medium text-cyan-700 dark:text-cyan-400">
                        UYAP UDF Belgesi
                      </span>
                    </>
                  )}

                </div>

              </div>

              <div
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  self-start
                  rounded-lg
                  bg-gray-100
                  px-2.5
                  py-1.5
                  text-xs
                  font-medium
                  text-gray-500
                  dark:bg-white/[0.04]
                  dark:text-slate-500
                  sm:self-center
                "
              >
                <LockKeyhole className="h-3.5 w-3.5" />

                Salt Okunur
              </div>

            </div>

          </Card.Body>

        </Card>

        {/* DOCUMENT INFO */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-blue-50
                  text-blue-600
                  dark:bg-blue-500/[0.08]
                  dark:text-blue-400
                "
              >
                <FileText size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Belge Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Belgenin sistemde görünen adı ve kategorisi
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <Input
              label="Belge Adı *"
              name="name"
              value={
                formData.name
              }
              onChange={
                handleChange
              }
              error={
                errors.name
              }
              placeholder="Belge adını girin"
              disabled={
                updateMutation.isPending
              }
            />

            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Kategori
              </label>

              <select
                name="category"
                value={
                  formData.category
                }
                onChange={
                  handleChange
                }
                disabled={
                  updateMutation.isPending
                }
                className="
                  h-10
                  w-full
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  text-sm
                  text-gray-700
                  outline-none
                  transition
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-slate-300
                "
              >

                {CATEGORY_OPTIONS.map(
                  (
                    category
                  ) => (
                    <option
                      key={
                        category.value
                      }
                      value={
                        category.value
                      }
                    >
                      {category.label}
                    </option>
                  )
                )}

              </select>

              <div className="mt-2">

                <Badge
                  variant={getCategoryVariant(
                    selectedCategory.value
                  )}
                >
                  <SelectedCategoryIcon className="mr-1 h-3.5 w-3.5" />
                  {selectedCategory.label}
                </Badge>

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* RELATIONS */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-violet-50
                  text-violet-600
                  dark:bg-violet-500/[0.08]
                  dark:text-violet-400
                "
              >
                <BriefcaseBusiness size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  İlişkili Kayıtlar
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Belgenin bağlı olduğu dava ve müvekkil
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              {/* CASE */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  İlişkili Dava
                </label>

                <div className="relative">

                  <FolderOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <select
                    name="case_id"
                    value={
                      formData.case_id
                    }
                    onChange={
                      handleChange
                    }
                    disabled={
                      relationCasesLoading ||
                      updateMutation.isPending
                    }
                    className="
                      h-10
                      w-full
                      rounded-lg
                      border
                      border-gray-200
                      bg-white
                      pl-9
                      pr-3
                      text-sm
                      text-gray-700
                      outline-none
                      focus:border-blue-500
                      focus:ring-2
                      focus:ring-blue-500/10
                      disabled:cursor-wait
                      disabled:opacity-60
                      dark:border-white/[0.08]
                      dark:bg-white/[0.035]
                      dark:text-slate-300
                    "
                  >

                    <option value="">
                      {relationCasesLoading
                        ? 'Davalar yükleniyor...'
                        : formData.client_id &&
                            relationCases.length ===
                              0
                          ? 'Bu müvekkile ait dava bulunamadı'
                          : 'İlişki yok'}
                    </option>

                    {relationCases.map(
                      (
                        caseItem
                      ) => (
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
                          {getCaseDisplayName(
                            caseItem
                          )}
                        </option>
                      )
                    )}

                  </select>

                </div>

                {errors.case_id && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {errors.case_id}
                  </p>
                )}

                {selectedCase && (
                  <div className="mt-2">

                    <p className="truncate text-xs font-medium text-gray-500 dark:text-slate-400">
                      Seçili: {getCaseDisplayName(
                        selectedCase
                      )}
                    </p>

                    {getCaseSecondaryInfo(
                      selectedCase
                    ) && (
                      <p className="mt-0.5 truncate text-[10px] text-gray-400 dark:text-slate-500">
                        {getCaseSecondaryInfo(
                          selectedCase
                        )}
                      </p>
                    )}

                  </div>
                )}

              </div>

              {/* CLIENT */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  İlişkili Müvekkil
                </label>

                <div className="relative">

                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <select
                    name="client_id"
                    value={
                      formData.client_id
                    }
                    onChange={
                      handleChange
                    }
                    disabled={
                      relationClientsLoading ||
                      updateMutation.isPending
                    }
                    className="
                      h-10
                      w-full
                      rounded-lg
                      border
                      border-gray-200
                      bg-white
                      pl-9
                      pr-3
                      text-sm
                      text-gray-700
                      outline-none
                      focus:border-blue-500
                      focus:ring-2
                      focus:ring-blue-500/10
                      disabled:cursor-wait
                      disabled:opacity-60
                      dark:border-white/[0.08]
                      dark:bg-white/[0.035]
                      dark:text-slate-300
                    "
                  >

                    <option value="">
                      {relationClientsLoading
                        ? 'Müvekkiller yükleniyor...'
                        : formData.case_id &&
                            relationClients.length ===
                              0
                          ? 'Bu davaya bağlı müvekkil bulunamadı'
                          : 'İlişki yok'}
                    </option>

                    {relationClients.map(
                      (
                        client
                      ) => (
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
                          {client.name}

                          {client.company_name &&
                            ` (${client.company_name})`}
                        </option>
                      )
                    )}

                  </select>

                </div>

                {errors.client_id && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {errors.client_id}
                  </p>
                )}

                {selectedClient && (
                  <p className="mt-2 truncate text-xs text-gray-400 dark:text-slate-500">
                    Seçili: {selectedClient.name}
                  </p>
                )}

              </div>

            </div>

            <div
              className="
                mt-5
                flex
                items-start
                gap-2
                rounded-lg
                bg-amber-50
                p-3
                text-sm
                text-amber-900
                dark:bg-amber-500/[0.06]
                dark:text-amber-200
              "
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

              <p>
                Müvekkil seçildiğinde yalnızca o müvekkile bağlı davalar; dava seçildiğinde yalnızca o davaya bağlı müvekkiller gösterilir. İlişkiyi değiştirmek belgenin dosya içindeki bağlamını değiştirir.
              </p>

            </div>

          </Card.Body>

        </Card>

        {/* TAGS & DESCRIPTION */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-amber-50
                  text-amber-600
                  dark:bg-amber-500/[0.08]
                  dark:text-amber-400
                "
              >
                <Tags size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Açıklama ve Etiketler
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Arama ve sınıflandırma için yardımcı bilgiler
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <div>

              <Input
                label="Etiketler"
                name="tags"
                value={
                  formData.tags
                }
                onChange={
                  handleChange
                }
                placeholder="acil, ceza, bilirkişi, önemli"
                disabled={
                  updateMutation.isPending
                }
              />

              <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                Etiketleri virgülle ayırabilirsiniz.
              </p>

              {tagsPreview.length >
                0 && (
                <div className="mt-3 flex flex-wrap gap-2">

                  {tagsPreview.map(
                    (
                      tag
                    ) => (
                      <Badge
                        key={
                          tag
                        }
                        variant="default"
                        className="bg-blue-50 text-blue-700 dark:bg-blue-500/[0.08] dark:text-blue-300"
                      >
                        #{tag}
                      </Badge>
                    )
                  )}

                </div>
              )}

            </div>

            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
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
                disabled={
                  updateMutation.isPending
                }
                rows={5}
                placeholder="Belgenin içeriği, amacı veya dosyadaki önemi hakkında not..."
                className="
                  w-full
                  resize-y
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  py-2.5
                  text-sm
                  leading-6
                  text-gray-900
                  outline-none
                  placeholder:text-gray-400
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                  dark:placeholder:text-slate-500
                "
              />

            </div>

          </Card.Body>

        </Card>

        {/* ACCESS */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div
                className={`
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-lg
                  ${
                    formData.is_public
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/[0.08] dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-white/[0.04] dark:text-slate-400'
                  }
                `}
              >
                {formData.is_public ? (
                  <ShieldCheck size={17} />
                ) : (
                  <LockKeyhole size={17} />
                )}
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Erişim
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Büro içindeki erişim kapsamını belirleyin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <label
              htmlFor="document-general-access"
              className="
                flex
                cursor-pointer
                items-start
                gap-4
                rounded-xl
                border
                border-gray-100
                p-4
                transition
                hover:bg-gray-50
                dark:border-white/[0.05]
                dark:hover:bg-white/[0.02]
              "
            >

              <div className="pt-0.5">

                <input
                  id="document-general-access"
                  type="checkbox"
                  name="is_public"
                  checked={
                    formData.is_public
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    updateMutation.isPending
                  }
                  className="
                    h-4
                    w-4
                    rounded
                    border-gray-300
                    text-blue-600
                    focus:ring-blue-500
                    disabled:cursor-not-allowed
                  "
                />

              </div>

              <div className="flex-1">

                <div className="flex flex-wrap items-center gap-2">

                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Büro içi genel erişim
                  </p>

                  <Badge
                    variant={
                      formData.is_public
                        ? 'success'
                        : 'default'
                    }
                  >
                    {formData.is_public
                      ? 'Açık'
                      : 'Kısıtlı'}
                  </Badge>

                </div>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-slate-400">
                  Bu seçenek belgeyi internete açmaz. Yalnızca sistem içindeki yetkili kullanıcıların erişim kapsamını belirler.
                </p>

              </div>

            </label>

          </Card.Body>

        </Card>

        {/* SUMMARY */}

        <div
          className="
            grid
            gap-3
            rounded-xl
            border
            border-gray-200
            bg-gray-50/50
            p-4
            dark:border-white/[0.07]
            dark:bg-white/[0.015]
            sm:grid-cols-4
          "
        >

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Kategori
            </p>

            <p className="mt-1 truncate text-sm font-medium text-gray-700 dark:text-slate-300">
              {selectedCategory.label}
            </p>

          </div>

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Dava
            </p>

            <p className="mt-1 truncate text-sm font-medium text-gray-700 dark:text-slate-300">
              {selectedCase
                ? getCaseDisplayName(
                    selectedCase
                  )
                : 'İlişki yok'}
            </p>

          </div>

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Müvekkil
            </p>

            <p className="mt-1 truncate text-sm font-medium text-gray-700 dark:text-slate-300">
              {selectedClient?.name ||
                'İlişki yok'}
            </p>

          </div>

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Erişim
            </p>

            <p
              className={`mt-1 text-sm font-medium ${
                formData.is_public
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-700 dark:text-slate-300'
              }`}
            >
              {formData.is_public
                ? 'Büro içi genel'
                : 'Kısıtlı'}
            </p>

          </div>

        </div>

        {/* ACTIONS */}

        <div
          className="
            flex
            flex-col-reverse
            gap-3
            rounded-xl
            border
            border-gray-200
            bg-white
            p-4
            shadow-sm
            dark:border-white/[0.07]
            dark:bg-[#0b1b33]
            sm:flex-row
            sm:items-center
            sm:justify-end
          "
        >

          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (
                isDirty
              ) {
                const confirmed =
                  window.confirm(
                    'Kaydedilmemiş belge değişiklikleri var. Sayfadan ayrılmak istediğinize emin misiniz?'
                  );

                if (
                  !confirmed
                ) {
                  return;
                }
              }

              navigate(
                `/documents/${id}`
              );
            }}
            disabled={
              updateMutation.isPending
            }
          >
            Vazgeç
          </Button>

          <Button
            type="submit"
            loading={
              updateMutation.isPending
            }
            disabled={
              updateMutation.isPending ||
              !isDirty
            }
          >
            <Save className="h-4 w-4" />

            Değişiklikleri Kaydet
          </Button>

        </div>

      </form>

    </div>
  );
};

export default DocumentEdit;