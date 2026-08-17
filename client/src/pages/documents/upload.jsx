import {
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  useUploadDocument,
  useUploadDocuments,
} from '../../features/documents/document.query.js';

import caseApi from '../../features/cases/case.api.js';
import clientApi from '../../features/clients/client.api.js';

import {
  powerOfAttorneyApi,
} from '../../features/power-of-attorney/powerOfAttorney.api.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  FilePlus2,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
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
];

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

const getExtension = (
  filename
) => {
  const value =
    filename || '';

  const index =
    value.lastIndexOf('.');

  if (index < 0) {
    return '';
  }

  return value
    .slice(index)
    .toLowerCase();
};

const getFileIcon = (
  file
) => {
  const type =
    file?.type || '';

  if (
    type.includes('pdf')
  ) {
    return '📄';
  }

  if (
    type.includes('word') ||
    type.includes('document')
  ) {
    return '📝';
  }

  if (
    type.includes('excel') ||
    type.includes('sheet')
  ) {
    return '📊';
  }

  if (
    type.includes('image')
  ) {
    return '🖼️';
  }

  if (
    type.includes('video')
  ) {
    return '🎬';
  }

  return '📎';
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

const removeExtension = (
  filename
) => {
  return (
    filename?.replace(
      /\.[^/.]+$/,
      ''
    ) || ''
  );
};

// ======================================================
// COMPONENT
// ======================================================

const DocumentUpload = () => {
  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

  const [
    searchParams,
  ] = useSearchParams();

  const fileInputRef =
    useRef(null);

  const [
    formData,
    setFormData,
  ] = useState({
    name: '',
    description: '',
    category: 'general',
    tags: '',

    case_id:
      searchParams.get(
        'case'
      ) || '',

    client_id:
      searchParams.get(
        'client'
      ) || '',

    power_of_attorney_id:
      searchParams.get(
        'power_of_attorney_id'
      ) || '',

    is_public: false,
  });

  const [
    files,
    setFiles,
  ] = useState([]);

  const [
    errors,
    setErrors,
  ] = useState({});

  const [
    isDragging,
    setIsDragging,
  ] = useState(false);

  // ======================================================
  // RELATED DATA
  // ======================================================

  const {
    data: casesData,
    isLoading:
      casesLoading,
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

  const {
    data: poaData,
    isLoading:
      poaLoading,
  } = useQuery({
    queryKey: [
      'powerOfAttorneys',
      {
        limit: 100,
      },
    ],

    queryFn: () =>
      powerOfAttorneyApi.getAll({
        limit: 100,
      }),

    staleTime:
      5 * 60 * 1000,
  });

  // ======================================================
  // MUTATIONS
  // ======================================================

  const uploadDocumentMutation =
    useUploadDocument();

  const uploadDocumentsMutation =
    useUploadDocuments();

  const isUploading =
    uploadDocumentMutation.isPending ||
    uploadDocumentsMutation.isPending;

  // ======================================================
  // DATA
  // ======================================================

  const cases =
    casesData?.data
      ?.data ??
    [];

  const clients =
    clientsData?.data
      ?.data ??
    [];

  const powerOfAttorneys =
    Array.isArray(
      poaData?.data?.data
    )
      ? poaData.data.data
      : [];

  // ======================================================
  // DERIVED
  // ======================================================

  const totalFileSize =
    useMemo(() => {
      return files.reduce(
        (
          total,
          file
        ) =>
          total +
          (
            Number(
              file.size
            ) || 0
          ),
        0
      );
    }, [
      files,
    ]);

  const tagsPreview =
    useMemo(() => {
      return normalizeTags(
        formData.tags
      );
    }, [
      formData.tags,
    ]);

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

  // ======================================================
  // FILE VALIDATION
  // ======================================================

  const validateFiles = (
    selectedFiles
  ) => {
    const validFiles = [];

    for (
      const file of
      selectedFiles
    ) {
      if (
        file.size >
        MAX_FILE_SIZE
      ) {
        toast.error(
          `${file.name}: dosya boyutu 10 MB sınırını aşıyor`
        );

        continue;
      }

      const extension =
        getExtension(
          file.name
        );

      if (
        !ALLOWED_EXTENSIONS.includes(
          extension
        )
      ) {
        toast.error(
          `${file.name}: desteklenmeyen dosya türü`
        );

        continue;
      }

      validFiles.push(
        file
      );
    }

    return validFiles;
  };

  // ======================================================
  // ADD FILES
  // ======================================================

  const addFiles = (
    selectedFiles
  ) => {
    if (isUploading) {
      return;
    }

    const validFiles =
      validateFiles(
        selectedFiles
      );

    if (
      validFiles.length ===
      0
    ) {
      return;
    }

    setFiles(
      (current) => {
        const signatures =
          new Set(
            current.map(
              (file) =>
                `${file.name}-${file.size}-${file.lastModified}`
            )
          );

        const uniqueNewFiles =
          validFiles.filter(
            (file) => {
              const signature =
                `${file.name}-${file.size}-${file.lastModified}`;

              return !signatures.has(
                signature
              );
            }
          );

        return [
          ...current,
          ...uniqueNewFiles,
        ];
      }
    );

    /*
     * Tek dosyada belge adını otomatik doldur.
     */
    if (
      files.length === 0 &&
      validFiles.length ===
        1 &&
      !formData.name.trim()
    ) {
      setFormData(
        (current) => ({
          ...current,

          name:
            removeExtension(
              validFiles[0].name
            ),
        })
      );
    }
  };

  const handleFileChange = (
    event
  ) => {
    addFiles(
      Array.from(
        event.target.files ||
          []
      )
    );

    /*
     * Aynı dosyanın daha sonra
     * yeniden seçilebilmesini sağlar.
     */
    event.target.value =
      '';
  };

  const removeFile = (
    index
  ) => {
    if (isUploading) {
      return;
    }

    setFiles(
      (current) =>
        current.filter(
          (
            _file,
            currentIndex
          ) =>
            currentIndex !==
            index
        )
    );
  };

  const clearFiles =
    () => {
      if (isUploading) {
        return;
      }

      setFiles([]);

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          '';
      }
    };

  // ======================================================
  // DRAG DROP
  // ======================================================

  const handleDragEnter = (
    event
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isUploading) {
      setIsDragging(
        true
      );
    }
  };

  const handleDragLeave = (
    event
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(
      false
    );
  };

  const handleDragOver = (
    event
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isUploading) {
      setIsDragging(
        true
      );
    }
  };

  const handleDrop = (
    event
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(
      false
    );

    if (isUploading) {
      return;
    }

    addFiles(
      Array.from(
        event.dataTransfer
          .files || []
      )
    );
  };

  // ======================================================
  // FORM DATA BUILDERS
  // ======================================================

  const appendSharedMetadata = (
    payload
  ) => {
    payload.append(
      'description',
      formData.description.trim()
    );

    payload.append(
      'category',
      formData.category
    );

    /*
     * Backend upload service string gelirse
     * comma ile split ediyor.
     * JSON.stringify göndermiyoruz.
     */
    payload.append(
      'tags',
      normalizeTags(
        formData.tags
      ).join(',')
    );

    if (
      formData.case_id
    ) {
      payload.append(
        'case_id',
        formData.case_id
      );
    }

    if (
      formData.client_id
    ) {
      payload.append(
        'client_id',
        formData.client_id
      );
    }

    if (
      formData.power_of_attorney_id
    ) {
      payload.append(
        'power_of_attorney_id',
        formData.power_of_attorney_id
      );
    }

    payload.append(
      'is_public',
      String(
        Boolean(
          formData.is_public
        )
      )
    );
  };

  const createSingleUploadData =
    (file) => {
      const payload =
        new FormData();

      payload.append(
        'file',
        file
      );

      payload.append(
        'name',
        formData.name.trim() ||
          removeExtension(
            file.name
          )
      );

      appendSharedMetadata(
        payload
      );

      return payload;
    };

  const createBulkUploadData =
    () => {
      const payload =
        new FormData();

      files.forEach(
        (file) => {
          payload.append(
            'files',
            file
          );
        }
      );

      /*
       * Çoklu yüklemede ortak isim göndermiyoruz.
       * Backend her dosyanın kendi originalname'ini
       * name olarak kullanacak.
       */
      appendSharedMetadata(
        payload
      );

      return payload;
    };

  // ======================================================
  // RELATED CACHE REFRESH
  // ======================================================

  const refreshRelatedQueries =
    async () => {
      const promises = [];

      if (
        formData.case_id
      ) {
        promises.push(
          queryClient.invalidateQueries({
            queryKey: [
              'case',
              formData.case_id,
            ],
          })
        );
      }

      if (
        formData.client_id
      ) {
        promises.push(
          queryClient.invalidateQueries({
            queryKey: [
              'client',
              formData.client_id,
            ],
          })
        );
      }

      if (
        formData.power_of_attorney_id
      ) {
        promises.push(
          queryClient.invalidateQueries({
            queryKey: [
              'powerOfAttorney',
              formData.power_of_attorney_id,
            ],
          })
        );
      }

      if (
        promises.length >
        0
      ) {
        await Promise.all(
          promises
        );
      }
    };

  // ======================================================
  // REDIRECT
  // ======================================================

  const redirectAfterUpload =
    () => {
      if (
        formData.case_id
      ) {
        navigate(
          `/cases/${formData.case_id}`
        );

        return;
      }

      if (
        formData.client_id
      ) {
        navigate(
          `/clients/${formData.client_id}`
        );

        return;
      }

      navigate(
        '/documents'
      );
    };

  // ======================================================
  // SUBMIT
  // ======================================================

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    if (isUploading) {
      return;
    }

    if (
      files.length ===
      0
    ) {
      toast.error(
        'Lütfen en az bir dosya seçin'
      );

      return;
    }

    const nextErrors =
      {};

    /*
     * Tek dosyada isim zorunlu değil;
     * boşsa dosya adından oluşturuyoruz.
     */
    if (
      formData.name.length >
      255
    ) {
      nextErrors.name =
        'Belge adı en fazla 255 karakter olabilir';
    }

    setErrors(
      nextErrors
    );

    if (
      Object.keys(
        nextErrors
      ).length > 0
    ) {
      return;
    }

    // ==================================================
    // SINGLE
    // ==================================================

    if (
      files.length ===
      1
    ) {
      uploadDocumentMutation.mutate(
        createSingleUploadData(
          files[0]
        ),
        {
          onSuccess:
            async () => {
              await refreshRelatedQueries();

              redirectAfterUpload();
            },
        }
      );

      return;
    }

    // ==================================================
    // MULTIPLE
    // ==================================================

    uploadDocumentsMutation.mutate(
      createBulkUploadData(),
      {
        onSuccess:
          async () => {
            await refreshRelatedQueries();

            redirectAfterUpload();
          },
      }
    );
  };

  // ======================================================
  // CANCEL
  // ======================================================

  const handleCancel =
    () => {
      if (isUploading) {
        return;
      }

      if (
        formData.case_id
      ) {
        navigate(
          `/cases/${formData.case_id}`
        );

        return;
      }

      if (
        formData.client_id
      ) {
        navigate(
          `/clients/${formData.client_id}`
        );

        return;
      }

      navigate(
        '/documents'
      );
    };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      {/* HEADER */}

      <div className="flex items-start justify-between gap-4">

        <div>

          <Link
            to="/documents"
            className="text-blue-600 hover:underline"
          >
            ← Belgeler
          </Link>

          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <FilePlus2 className="h-6 w-6" />

            Belge Yükle
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Tek belge veya birden fazla dosyayı aynı işlemde sisteme ekleyebilirsiniz.
          </p>

        </div>

      </div>

      {/* INFO */}

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">

        <div className="flex items-start gap-3">

          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />

          <div>

            <p className="font-medium text-blue-900 dark:text-blue-200">
              Belge ilişkileri yükleme sırasında oluşturulur
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-300">
              Belgeyi dava, müvekkil veya vekâletname ile ilişkilendirebilirsiniz.
              Daha sonra dosya içeriğini değiştirmek yerine versiyon sistemi kullanılacaktır.
            </p>

          </div>

        </div>

      </div>

      <Card>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6 p-6"
        >

          {/* FILE DROP AREA */}

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Dosyalar *
            </label>

            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                if (
                  !isUploading
                ) {
                  fileInputRef.current?.click();
                }
              }}
              onKeyDown={(event) => {
                if (
                  !isUploading &&
                  (
                    event.key ===
                      'Enter' ||
                    event.key ===
                      ' '
                  )
                ) {
                  event.preventDefault();

                  fileInputRef.current?.click();
                }
              }}
              onDragEnter={
                handleDragEnter
              }
              onDragLeave={
                handleDragLeave
              }
              onDragOver={
                handleDragOver
              }
              onDrop={
                handleDrop
              }
              className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                isUploading
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer'
              } ${
                isDragging
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 hover:border-blue-500 dark:border-gray-600'
              }`}
            >

              {files.length ===
              0 ? (
                <div>

                  <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />

                  <p className="mt-3 font-medium text-gray-700 dark:text-gray-300">
                    Dosyaları buraya sürükleyin veya seçmek için tıklayın
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    PDF, Word, Excel, görsel ve desteklenen video dosyaları
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Dosya başına maksimum 10 MB
                  </p>

                </div>
              ) : (
                <div>

                  <div className="text-4xl">
                    📎
                  </div>

                  <p className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
                    {files.length}{' '}
                    dosya seçildi
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Toplam{' '}
                    {formatFileSize(
                      totalFileSize
                    )}
                  </p>

                  {!isUploading && (
                    <p className="mt-2 text-sm text-blue-600">
                      Başka dosya eklemek için tıklayın
                    </p>
                  )}

                </div>
              )}

              <input
                ref={
                  fileInputRef
                }
                type="file"
                className="hidden"
                onChange={
                  handleFileChange
                }
                disabled={
                  isUploading
                }
                multiple
                accept={ALLOWED_EXTENSIONS.join(
                  ','
                )}
              />

            </div>

            {/* FILES */}

            {files.length >
              0 && (
              <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">

                {files.map(
                  (
                    file,
                    index
                  ) => (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
                    >

                      <div className="flex min-w-0 flex-1 items-center gap-3">

                        <span className="shrink-0 text-2xl">
                          {getFileIcon(
                            file
                          )}
                        </span>

                        <div className="min-w-0 flex-1">

                          <p className="truncate font-medium text-gray-900 dark:text-white">
                            {
                              file.name
                            }
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-2">

                            <span className="text-xs text-gray-500">
                              {formatFileSize(
                                file.size
                              )}
                            </span>

                            <Badge
                              variant="default"
                              className="text-xs"
                            >
                              {getExtension(
                                file.name
                              )
                                .replace(
                                  '.',
                                  ''
                                )
                                .toUpperCase() ||
                                'DOSYA'}
                            </Badge>

                          </div>

                        </div>

                      </div>

                      <button
                        type="button"
                        disabled={
                          isUploading
                        }
                        onClick={() =>
                          removeFile(
                            index
                          )
                        }
                        className="rounded-md p-2 text-red-500 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-900/20"
                        aria-label={`${file.name} dosyasını kaldır`}
                      >
                        <X className="h-4 w-4" />
                      </button>

                    </div>
                  )
                )}

              </div>
            )}

          </div>

          {/* DOCUMENT NAME */}

          <div>

            <Input
              label={
                files.length >
                1
                  ? 'Ortak Belge Adı'
                  : 'Belge Adı'
              }
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
              disabled={
                isUploading
              }
              placeholder={
                files.length >
                1
                  ? 'Çoklu yüklemede boş bırakabilirsiniz'
                  : 'Boş bırakılırsa dosya adı kullanılır'
              }
            />

            {files.length >
              1 && (
              <p className="mt-1 text-xs text-gray-500">
                Çoklu yüklemede her belge kendi dosya adıyla kaydedilir.
              </p>
            )}

          </div>

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
                isUploading
              }
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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

          </div>

          {/* CASE + CLIENT */}

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
                  isUploading
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-wait disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >

                <option value="">
                  İlişki yok
                </option>

                {cases.map(
                  (
                    caseItem
                  ) => (
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
                  isUploading
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

          {/* POWER OF ATTORNEY */}

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              📜 İlişkili Vekâletname
            </label>

            <select
              name="power_of_attorney_id"
              value={
                formData.power_of_attorney_id
              }
              onChange={
                handleChange
              }
              disabled={
                poaLoading ||
                isUploading
              }
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-wait disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >

              <option value="">
                İlişki yok
              </option>

              {powerOfAttorneys.map(
                (poa) => (
                  <option
                    key={
                      poa.id
                    }
                    value={
                      poa.id
                    }
                  >
                    {
                      poa.title
                    }

                    {poa.client?.name &&
                      ` · ${poa.client.name}`}
                  </option>
                )
              )}

            </select>

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
              disabled={
                isUploading
              }
              placeholder="acil, ceza, bilirkişi, önemli"
            />

            <p className="mt-1 text-xs text-gray-500">
              Birden fazla etiketi virgülle ayırın.
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
                isUploading
              }
              rows="4"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Belgenin içeriği veya dosyadaki önemi hakkında not..."
            />

          </div>

          {/* ACCESS */}

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">

            <div className="flex items-start gap-3">

              <ShieldCheck className={`mt-0.5 h-5 w-5 shrink-0 ${
                formData.is_public
                  ? 'text-green-600'
                  : 'text-gray-400'
              }`} />

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
                      isUploading
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
                  Bu ayar yalnızca sistem içindeki yetkili kullanıcıların belgeye erişim kapsamını belirtir; internet üzerinde herkese açık paylaşım anlamına gelmez.
                </p>

              </div>

            </div>

          </div>

          {/* ACTIONS */}

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">

            <Button
              type="submit"
              loading={
                isUploading
              }
              disabled={
                files.length ===
                  0 ||
                isUploading
              }
            >
              <UploadCloud className="mr-2 h-4 w-4" />

              {files.length ===
              0
                ? 'Dosya Seçin'
                : files.length ===
                    1
                  ? 'Belgeyi Yükle'
                  : `${files.length} Belgeyi Yükle`}
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={
                isUploading
              }
              onClick={
                handleCancel
              }
            >
              Vazgeç
            </Button>

            {files.length >
              0 && (
              <Button
                type="button"
                variant="danger"
                disabled={
                  isUploading
                }
                onClick={
                  clearFiles
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />

                Tümünü Temizle
              </Button>
            )}

          </div>

          {/* SUMMARY */}

          {files.length >
            0 && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">

              <span className="font-medium">
                Yükleme özeti:
              </span>{' '}

              {files.length}{' '}
              dosya ·{' '}
              {formatFileSize(
                totalFileSize
              )}

              {formData.case_id &&
                ' · Dava ile ilişkili'}

              {formData.client_id &&
                ' · Müvekkil ile ilişkili'}

              {formData.power_of_attorney_id &&
                ' · Vekâletname ile ilişkili'}

            </div>
          )}

        </form>

      </Card>

    </div>
  );
};

export default DocumentUpload;