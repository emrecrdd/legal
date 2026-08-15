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
  LockKeyhole,
  Save,
  ShieldCheck,
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
    icon: '📁',
  },
  {
    value: 'petition',
    label: 'Dilekçe',
    icon: '📝',
  },
  {
    value: 'expert_report',
    label: 'Bilirkişi Raporu',
    icon: '📊',
  },
  {
    value: 'court_decision',
    label: 'Mahkeme Kararı',
    icon: '⚖️',
  },
  {
    value: 'notification',
    label: 'Tebligat',
    icon: '📨',
  },
  {
    value: 'evidence',
    label: 'Delil',
    icon: '🔍',
  },
  {
    value: 'correspondence',
    label: 'Yazışma',
    icon: '✉️',
  },
  {
    value: 'other',
    label: 'Diğer',
    icon: '📌',
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
  switch (fileType) {
    case 'pdf':
      return '📄';

    case 'word':
      return '📝';

    case 'excel':
      return '📊';

    case 'image':
      return '🖼️';

    default:
      return '📎';
  }
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

// ======================================================
// COMPONENT
// ======================================================

const DocumentEdit = () => {
  const { id } =
    useParams();

  const navigate =
    useNavigate();

  const [
    formData,
    setFormData,
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
    documentData?.data
      ?.data ??
    documentData?.data ??
    null;

  const cases =
    casesData?.data
      ?.data ??
    [];

  const clients =
    clientsData?.data
      ?.data ??
    [];

  // ======================================================
  // FORM INITIALIZATION
  //
  // Query refetch olduğunda kullanıcının yazdığı alanların
  // tekrar ezilmesini engelliyoruz.
  // ======================================================

  useEffect(() => {
    if (
      !documentItem ||
      initializedDocumentId ===
        documentItem.id
    ) {
      return;
    }

    setFormData({
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
          : '',

      case_id:
        documentItem.case_id ||
        documentItem.case?.id ||
        '',

      client_id:
        documentItem.client_id ||
        documentItem.client?.id ||
        '',

      is_public:
        Boolean(
          documentItem.is_public
        ),
    });

    setInitializedDocumentId(
      documentItem.id
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

  const tagsPreview =
    useMemo(() => {
      return normalizeTags(
        formData.tags
      );
    }, [
      formData.tags,
    ]);

  const hasRelationLoadError =
    Boolean(
      casesError ||
        clientsError
    );

  // ======================================================
  // HANDLERS
  // ======================================================

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setFormData(
      (current) => ({
        ...current,

        [name]:
          type ===
          'checkbox'
            ? checked
            : value,
      })
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

      setErrors(
        nextErrors
      );

      return (
        Object.keys(
          nextErrors
        ).length === 0
      );
    };

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
      !validateForm()
    ) {
      toast.error(
        'Formdaki eksik veya hatalı alanları kontrol edin'
      );

      return;
    }

    const updateData = {
      /*
       * Yalnızca belge ailesinin metadata alanlarını gönderiyoruz.
       * Fiziksel dosya/version alanlarına bu ekran dokunmuyor.
       */

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
        formData.case_id ||
        null,

      client_id:
        formData.client_id ||
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

        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600" />

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

        <div className="mb-4 text-6xl">
          📄
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Belge Bulunamadı
        </h2>

        <p className="mt-2 text-gray-500">
          {documentError
            ?.response?.data
            ?.message ||
            documentError
              ?.message ||
            'Belge detayları yüklenemedi'}
        </p>

        <Link
          to="/documents"
          className="mt-4 inline-block text-blue-600 hover:underline"
        >
          ← Belgeler Listesine Dön
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
          to={`/documents/${id}`}
          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />

          Belge Detayı
        </Link>

        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
          Belge Bilgilerini Düzenle
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Belge ailesinin kayıt, sınıflandırma ve ilişki bilgilerini güncelleyin.
        </p>

      </div>

      {/* IMPORTANT INFO */}

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">

        <div className="flex items-start gap-3">

          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />

          <div>

            <p className="font-medium text-blue-900 dark:text-blue-200">
              Dosya içeriği bu ekrandan değiştirilmez
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-300">
              Düzeltilmiş veya yeni bir dosya yüklemek için belge detayındaki
              <strong> Yeni Versiyon </strong>
              işlemini kullanın. Böylece önceki sürümler korunur ve belge geçmişi bozulmaz.
            </p>

          </div>

        </div>

      </div>

      {/* RELATION LOAD WARNING */}

      {hasRelationLoadError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">

          <div className="flex items-start gap-3">

            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

            <div>

              <p className="font-medium text-amber-900 dark:text-amber-200">
                Bazı ilişkili kayıtlar yüklenemedi
              </p>

              <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                Dava veya müvekkil listesi eksik görünebilir. Mevcut belge bilgilerini değiştirmeden kaydedebilirsiniz.
              </p>

            </div>

          </div>

        </div>
      )}

      {/* FORM */}

      <Card>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6 p-6"
        >

          {/* FILE READ ONLY */}

          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">

            <div className="flex items-start gap-4">

              <span className="text-4xl">
                {getFileIcon(
                  documentItem.file_type
                )}
              </span>

              <div className="min-w-0 flex-1">

                <div className="flex flex-wrap items-center gap-2">

                  <p className="break-all font-medium text-gray-900 dark:text-white">
                    {
                      documentItem.original_name
                    }
                  </p>

                  <Badge variant="info">
                    v
                    {documentItem.version ||
                      1}
                  </Badge>

                </div>

                <p className="mt-1 text-sm text-gray-500">
                  {formatFileSize(
                    documentItem.file_size
                  )}
                  {' · '}
                  {documentItem.mime_type ||
                    'Bilinmiyor'}
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  Fiziksel dosya, MIME türü ve versiyon bilgileri salt okunurdur.
                </p>

              </div>

            </div>

          </div>

          {/* NAME */}

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

          {/* CATEGORY */}

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {CATEGORY_OPTIONS.map(
                (category) => (
                  <option
                    key={
                      category.value
                    }
                    value={
                      category.value
                    }
                  >
                    {
                      category.icon
                    }{' '}
                    {
                      category.label
                    }
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
                {
                  selectedCategory.label
                }
              </Badge>

            </div>

          </div>

          {/* RELATED RECORDS */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <div>

              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                📁 İlişkili Dava
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
                  casesLoading ||
                  updateMutation.isPending
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-wait disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >

                <option value="">
                  İlişki yok
                </option>

                {cases.map(
                  (caseItem) => (
                    <option
                      key={
                        caseItem.id
                      }
                      value={
                        caseItem.id
                      }
                    >
                      {
                        caseItem.title
                      }
                    </option>
                  )
                )}

              </select>

            </div>

            <div>

              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                👤 İlişkili Müvekkil
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
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-wait disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >

                <option value="">
                  İlişki yok
                </option>

                {clients.map(
                  (client) => (
                    <option
                      key={
                        client.id
                      }
                      value={
                        client.id
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

            </div>

          </div>

          {/* TAGS */}

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

            <p className="mt-1 text-xs text-gray-500">
              Birden fazla etiketi virgülle ayırın. Tekrarlanan etiketler otomatik temizlenir.
            </p>

            {tagsPreview.length >
              0 && (
              <div className="mt-3 flex flex-wrap gap-2">

                {tagsPreview.map(
                  (tag) => (
                    <Badge
                      key={
                        tag
                      }
                      variant="default"
                      className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      #{tag}
                    </Badge>
                  )
                )}

              </div>
            )}

          </div>

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
              disabled={
                updateMutation.isPending
              }
              rows="5"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Belgenin içeriği, amacı veya dosyadaki önemi hakkında not..."
            />

          </div>

          {/* ACCESS */}

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">

            <div className="flex items-start gap-3">

              {formData.is_public ? (
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              ) : (
                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />
              )}

              <div className="flex-1">

                <div className="flex items-center gap-2">

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
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                  />

                  <label
                    htmlFor="document-general-access"
                    className="font-medium text-gray-900 dark:text-white"
                  >
                    Büro içi genel erişim
                  </label>

                </div>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Açıldığında belge, sistemde belge görüntüleme yetkisi bulunan kullanıcılar için genel erişilebilir olarak işaretlenir.
                  Bu ayar belgenin internet üzerinde herkese açık olduğu anlamına gelmez.
                </p>

              </div>

            </div>

          </div>

          {/* WARNING */}

          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">

            <div className="flex items-start gap-2">

              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

              <p>
                Dava veya müvekkil ilişkisini değiştirmeniz belgenin dosyadaki bağlamını etkiler. Kaydetmeden önce seçilen kayıtları kontrol edin.
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
                updateMutation.isPending
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
                  `/documents/${id}`
                )
              }
              disabled={
                updateMutation.isPending
              }
            >
              Vazgeç
            </Button>

          </div>

        </form>

      </Card>

    </div>
  );
};

export default DocumentEdit;