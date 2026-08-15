import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  useDocuments,
  useDocumentCategories,
  useDeleteDocument,
  useBulkDeleteDocuments,
} from '../../features/documents/document.query.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import Button from '../../components/ui/Button.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  Archive,
  Eye,
  FilePlus2,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';

import {
  useDebounce,
} from '../../hooks/useDebounce.js';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const CATEGORY_LABELS = {
  general: 'Genel',
  petition: 'Dilekçe',
  expert_report: 'Bilirkişi Raporu',
  court_decision: 'Mahkeme Kararı',
  notification: 'Tebligat',
  evidence: 'Delil',
  correspondence: 'Yazışma',
  other: 'Diğer',
};

// ======================================================
// HELPERS
// ======================================================

const getCategoryLabel = (category) => {
  return (
    CATEGORY_LABELS[category] ||
    category ||
    'Genel'
  );
};

const getCategoryColor = (category) => {
  const colors = {
    general:
      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',

    petition:
      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',

    expert_report:
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',

    court_decision:
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',

    notification:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',

    evidence:
      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',

    correspondence:
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',

    other:
      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };

  return (
    colors[category] ||
    colors.general
  );
};

const getFileIcon = (fileType) => {
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

const formatFileSize = (bytes) => {
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

const formatDateTime = (date) => {
  if (!date) {
    return '-';
  }

  try {
    const parsed =
      new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return '-';
    }

    return new Intl.DateTimeFormat(
      'tr-TR',
      {
        timeZone:
          'Europe/Istanbul',

        day: '2-digit',
        month: '2-digit',
        year: 'numeric',

        hour: '2-digit',
        minute: '2-digit',

        hour12: false,
      }
    ).format(parsed);
  } catch {
    return '-';
  }
};

const getPersonName = (
  person,
  fallback = '-'
) => {
  if (!person) {
    return fallback;
  }

  const name = [
    person.first_name,
    person.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    name ||
    fallback
  );
};

const unwrapResponseData = (
  response
) => {
  return (
    response?.data?.data ??
    response?.data ??
    null
  );
};

// ======================================================
// COMPONENT
// ======================================================

const DocumentsList = () => {
  const navigate =
    useNavigate();

  const { user } =
    useAuth();

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState('');

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    selectedDocs,
    setSelectedDocs,
  ] = useState([]);

  const debouncedSearch =
    useDebounce(
      search,
      500
    );

  // ======================================================
  // PERMISSIONS
  // ======================================================

  const canUpload = [
    'admin',
    'lawyer',
    'secretary',
  ].includes(
    user?.role
  );

  const canEdit =
    canUpload;

  const canDelete = [
    'admin',
    'lawyer',
  ].includes(
    user?.role
  );

  // ======================================================
  // QUERIES
  // ======================================================

  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useDocuments({
    page,
    search:
      debouncedSearch,
    category:
      categoryFilter,
  });

  const {
    data:
      categoriesData,
  } =
    useDocumentCategories();

  // ======================================================
  // MUTATIONS
  // ======================================================

  const deleteMutation =
    useDeleteDocument();

  const bulkDeleteMutation =
    useBulkDeleteDocuments();

  // ======================================================
  // DATA
  // ======================================================

  const documents =
    data?.data?.data ||
    [];

  const pagination =
    data?.data
      ?.pagination;

  const categories =
    useMemo(() => {
      const raw =
        unwrapResponseData(
          categoriesData
        );

      if (
        !Array.isArray(
          raw
        )
      ) {
        return [];
      }

      return [
        ...new Set(
          raw.filter(Boolean)
        ),
      ].sort(
        (a, b) =>
          getCategoryLabel(
            a
          ).localeCompare(
            getCategoryLabel(
              b
            ),
            'tr'
          )
      );
    }, [
      categoriesData,
    ]);

  // ======================================================
  // SELECTION CLEANUP
  // ======================================================

  useEffect(() => {
    setSelectedDocs([]);
  }, [
    page,
    debouncedSearch,
    categoryFilter,
  ]);

  // ======================================================
  // HANDLERS
  // ======================================================

  const handleCategoryChange = (
    event
  ) => {
    setCategoryFilter(
      event.target.value
    );

    setPage(1);
  };

  const handleSearchChange = (
    event
  ) => {
    setSearch(
      event.target.value
    );

    setPage(1);
  };

  const handleClearFilters =
    () => {
      setSearch('');
      setCategoryFilter('');
      setPage(1);
    };

  const handleDelete = (
    doc
  ) => {
    if (!canDelete) {
      toast.error(
        'Bu işlem için yetkiniz bulunmuyor.'
      );

      return;
    }

    if (!doc?.id) {
      toast.error(
        'Geçersiz belge kaydı'
      );

      return;
    }

    const confirmed =
      window.confirm(
        `"${doc.name}" belgesini kayıt listesinden kaldırmak istediğinize emin misiniz?\n\nBelge fiziksel depolamadan hemen silinmez; kayıt soft-delete olarak işaretlenir.`
      );

    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(
      doc.id,
      {
        onSuccess: () => {
          setSelectedDocs(
            (current) =>
              current.filter(
                (id) =>
                  id !==
                  doc.id
              )
          );
        },
      }
    );
  };

  const handleBulkDelete =
    () => {
      if (
        !canDelete ||
        selectedDocs.length ===
          0
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `${selectedDocs.length} belgeyi kayıt listesinden kaldırmak istediğinize emin misiniz?\n\nBelgeler fiziksel depolamadan hemen silinmez.`
        );

      if (!confirmed) {
        return;
      }

      bulkDeleteMutation.mutate(
        selectedDocs,
        {
          onSuccess: () => {
            setSelectedDocs(
              []
            );
          },
        }
      );
    };

  const toggleSelect = (
    id
  ) => {
    setSelectedDocs(
      (current) =>
        current.includes(
          id
        )
          ? current.filter(
              (
                documentId
              ) =>
                documentId !==
                id
            )
          : [
              ...current,
              id,
            ]
    );
  };

  const allCurrentPageSelected =
    documents.length > 0 &&
    documents.every(
      (doc) =>
        selectedDocs.includes(
          doc.id
        )
    );

  const toggleSelectAll =
    () => {
      const currentPageIds =
        documents.map(
          (doc) =>
            doc.id
        );

      if (
        allCurrentPageSelected
      ) {
        setSelectedDocs(
          (current) =>
            current.filter(
              (id) =>
                !currentPageIds.includes(
                  id
                )
            )
        );

        return;
      }

      setSelectedDocs(
        (current) => [
          ...new Set([
            ...current,
            ...currentPageIds,
          ]),
        ]
      );
    };

  // ======================================================
  // PAGINATION SAFETY
  // ======================================================

  useEffect(() => {
    if (
      pagination &&
      page >
        pagination.totalPages &&
      pagination.totalPages >
        0
    ) {
      setPage(
        pagination.totalPages
      );
    }
  }, [
    pagination,
    page,
  ]);

  // ======================================================
  // LOADING
  // ======================================================

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">

        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600" />

      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (error) {
    return (
      <div className="py-12 text-center">

        <div className="mb-4 text-4xl">
          ⚠️
        </div>

        <h2 className="text-xl font-bold text-red-600">
          Belgeler yüklenirken hata oluştu
        </h2>

        <p className="mt-2 text-gray-500">
          {error?.response
            ?.data?.message ||
            error?.message ||
            'Bilinmeyen hata'}
        </p>

        <Button
          className="mt-4"
          onClick={() =>
            window.location.reload()
          }
        >
          Yeniden Dene
        </Button>

      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            📄 Belgeler
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Dava ve müvekkillere bağlı belgeleri, belge ailelerini ve versiyon geçmişlerini yönetin.
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Toplam{' '}
            {pagination?.total ||
              0}{' '}
            belge kaydı
          </p>

        </div>

        <div className="flex flex-wrap gap-2">

          {canDelete &&
            selectedDocs.length >
              0 && (
              <Button
                variant="danger"
                size="sm"
                onClick={
                  handleBulkDelete
                }
                loading={
                  bulkDeleteMutation.isPending
                }
                disabled={
                  bulkDeleteMutation.isPending
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />

                Seçilileri Kaldır (
                {
                  selectedDocs.length
                })
              </Button>
            )}

          {canUpload && (
            <Link to="/documents/upload">

              <Button>
                <FilePlus2 className="mr-2 h-4 w-4" />

                Belge Yükle
              </Button>

            </Link>
          )}

        </div>

      </div>

      {/* FILTERS */}

      <div className="overflow-hidden rounded-xl bg-white shadow dark:bg-gray-800">

        <div className="border-b border-gray-200 p-4 dark:border-gray-700">

          <div className="flex flex-col gap-4 sm:flex-row">

            <div className="relative flex-1">

              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                placeholder="Belge adı, dosya adı veya açıklamada ara..."
                value={
                  search
                }
                onChange={
                  handleSearchChange
                }
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />

            </div>

            <div className="sm:w-56">

              <select
                value={
                  categoryFilter
                }
                onChange={
                  handleCategoryChange
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">
                  Tüm Kategoriler
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={
                        category
                      }
                      value={
                        category
                      }
                    >
                      {getCategoryLabel(
                        category
                      )}
                    </option>
                  )
                )}

              </select>

            </div>

            {(search ||
              categoryFilter) && (
              <Button
                variant="outline"
                onClick={
                  handleClearFilters
                }
              >
                <X className="mr-2 h-4 w-4" />

                Temizle
              </Button>
            )}

          </div>

          {isFetching &&
            !isLoading && (
              <p className="mt-2 text-xs text-gray-400">
                Liste güncelleniyor...
              </p>
            )}

        </div>

        {/* TABLE */}

        <div className="overflow-x-auto">

          <Table>

            <Table.Head>

              <Table.Row>

                {canDelete && (
                  <Table.HeadCell className="w-8">

                    <input
                      type="checkbox"
                      checked={
                        allCurrentPageSelected
                      }
                      onChange={
                        toggleSelectAll
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      aria-label="Sayfadaki tüm belgeleri seç"
                    />

                  </Table.HeadCell>
                )}

                <Table.HeadCell>
                  Belge
                </Table.HeadCell>

                <Table.HeadCell>
                  Kategori
                </Table.HeadCell>

                <Table.HeadCell>
                  İlişkili Dava
                </Table.HeadCell>

                <Table.HeadCell>
                  Boyut
                </Table.HeadCell>

                <Table.HeadCell>
                  Yükleyen
                </Table.HeadCell>

                <Table.HeadCell>
                  Tarih
                </Table.HeadCell>

                <Table.HeadCell>
                  İşlemler
                </Table.HeadCell>

              </Table.Row>

            </Table.Head>

            <Table.Body>

              {documents.length ===
              0 ? (
                <Table.Row>

                  <Table.Cell
                    colSpan={
                      canDelete
                        ? 8
                        : 7
                    }
                    className="py-12 text-center text-gray-500"
                  >

                    <div className="mb-2 text-4xl">
                      📭
                    </div>

                    <p className="font-medium">
                      {debouncedSearch ||
                      categoryFilter
                        ? 'Filtrelere uygun belge bulunamadı'
                        : 'Henüz belge bulunmuyor'}
                    </p>

                    {canUpload &&
                      !debouncedSearch &&
                      !categoryFilter && (
                        <div className="mt-3">

                          <Link
                            to="/documents/upload"
                            className="text-blue-600 hover:underline"
                          >
                            İlk belgeyi yükle
                          </Link>

                        </div>
                      )}

                  </Table.Cell>

                </Table.Row>
              ) : (
                documents.map(
                  (doc) => (
                    <Table.Row
                      key={
                        doc.id
                      }
                    >

                      {/* SELECT */}

                      {canDelete && (
                        <Table.Cell>

                          <input
                            type="checkbox"
                            checked={selectedDocs.includes(
                              doc.id
                            )}
                            onChange={() =>
                              toggleSelect(
                                doc.id
                              )
                            }
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            aria-label={`${doc.name} seç`}
                          />

                        </Table.Cell>
                      )}

                      {/* DOCUMENT */}

                      <Table.Cell>

                        <div className="flex min-w-[18rem] items-start gap-3">

                          <span className="mt-0.5 text-2xl">
                            {getFileIcon(
                              doc.file_type
                            )}
                          </span>

                          <div className="min-w-0">

                            <Link
                              to={`/documents/${doc.id}`}
                              className="block max-w-sm truncate font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400"
                              title={
                                doc.name
                              }
                            >
                              {
                                doc.name
                              }
                            </Link>

                            <p
                              className="mt-1 max-w-sm truncate text-xs text-gray-500"
                              title={
                                doc.original_name
                              }
                            >
                              {
                                doc.original_name
                              }
                            </p>

                            <div className="mt-2 flex flex-wrap gap-1">

                              {doc.is_public ? (
                                <Badge
                                  variant="success"
                                  className="text-xs"
                                >
                                  Büro içi genel erişim
                                </Badge>
                              ) : (
                                <Badge
                                  variant="default"
                                  className="text-xs"
                                >
                                  Kısıtlı
                                </Badge>
                              )}

                              {doc.is_archived && (
                                <Badge
                                  variant="warning"
                                  className="text-xs"
                                >
                                  <Archive className="mr-1 h-3 w-3" />

                                  Arşiv
                                </Badge>
                              )}

                            </div>

                          </div>

                        </div>

                      </Table.Cell>

                      {/* CATEGORY */}

                      <Table.Cell>

                        <Badge
                          variant="default"
                          className={getCategoryColor(
                            doc.category
                          )}
                        >
                          {getCategoryLabel(
                            doc.category
                          )}
                        </Badge>

                      </Table.Cell>

                      {/* CASE */}

                      <Table.Cell>

                        {doc.case ? (
                          <Link
                            to={`/cases/${doc.case.id}`}
                            className="block max-w-[14rem] truncate text-sm text-blue-600 hover:underline dark:text-blue-400"
                            title={
                              doc.case.title
                            }
                          >
                            {
                              doc.case.title
                            }
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">
                            -
                          </span>
                        )}

                      </Table.Cell>

                      {/* SIZE */}

                      <Table.Cell>

                        <span className="whitespace-nowrap text-sm">
                          {formatFileSize(
                            doc.file_size
                          )}
                        </span>

                      </Table.Cell>

                      {/* UPLOADER */}

                      <Table.Cell>

                        <span className="whitespace-nowrap text-sm">
                          {getPersonName(
                            doc.uploader
                          )}
                        </span>

                      </Table.Cell>

                      {/* DATE */}

                      <Table.Cell>

                        <span className="whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(
                            doc.created_at
                          )}
                        </span>

                      </Table.Cell>

                      {/* ACTIONS */}

                      <Table.Cell>

                        <div className="flex items-center gap-1">

                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/documents/${doc.id}`
                              )
                            }
                            className="rounded-md p-2 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                            title="Belge detayını ve güncel versiyonu aç"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/documents/${doc.id}/edit`
                                )
                              }
                              className="rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700"
                              title="Belge bilgilerini düzenle"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  doc
                                )
                              }
                              disabled={
                                deleteMutation.isPending
                              }
                              className="rounded-md p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-900/20"
                              title="Belgeyi kaldır"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}

                        </div>

                      </Table.Cell>

                    </Table.Row>
                  )
                )
              )}

            </Table.Body>

          </Table>

        </div>

        {/* PAGINATION */}

        {pagination &&
          pagination.totalPages >
            1 && (
            <div className="flex flex-col gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Toplam{' '}
                {
                  pagination.total
                }{' '}
                belge

                {selectedDocs.length >
                  0 &&
                  ` · ${selectedDocs.length} seçili`}
              </p>

              <div className="flex items-center gap-2">

                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    page <= 1 ||
                    isFetching
                  }
                  onClick={() =>
                    setPage(
                      (
                        current
                      ) =>
                        Math.max(
                          1,
                          current - 1
                        )
                    )
                  }
                >
                  Önceki
                </Button>

                <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
                  {page} /{' '}
                  {
                    pagination.totalPages
                  }
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    page >=
                      pagination.totalPages ||
                    isFetching
                  }
                  onClick={() =>
                    setPage(
                      (
                        current
                      ) =>
                        Math.min(
                          pagination.totalPages,
                          current + 1
                        )
                    )
                  }
                >
                  Sonraki
                </Button>

              </div>

            </div>
          )}

      </div>

    </div>
  );
};

export default DocumentsList;