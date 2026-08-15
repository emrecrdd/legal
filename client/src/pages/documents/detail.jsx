import {
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  useDocument,
  useDocumentVersions,
  useUploadDocumentVersion,
} from '../../features/documents/document.query.js';

import documentApi from '../../features/documents/document.api.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  Download,
  Eye,
  FileClock,
  History,
  Pencil,
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

// ======================================================
// HELPERS
// ======================================================

const getCategoryLabel = (
  category
) => {
  const labels = {
    general: 'Genel',
    petition: 'Dilekçe',
    expert_report:
      'Bilirkişi Raporu',
    court_decision:
      'Mahkeme Kararı',
    notification:
      'Tebligat',
    evidence: 'Delil',
    correspondence:
      'Yazışma',
    other: 'Diğer',
  };

  return (
    labels[category] ||
    category ||
    'Genel'
  );
};

const getCategoryColor = (
  category
) => {
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

const formatDateTime = (
  date
) => {
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
  person
) => {
  if (!person) {
    return '-';
  }

  return (
    [
      person.first_name,
      person.last_name,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() || '-'
  );
};

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

// ======================================================
// COMPONENT
// ======================================================

const DocumentDetail = () => {
  const { id } =
    useParams();

  const navigate =
    useNavigate();

  const { user } =
    useAuth();

  const fileInputRef =
    useRef(null);

  const [
    showVersionModal,
    setShowVersionModal,
  ] = useState(false);

  const [
    versionFile,
    setVersionFile,
  ] = useState(null);

  const [
    versionDescription,
    setVersionDescription,
  ] = useState('');

  // ======================================================
  // PERMISSIONS
  // ======================================================

  const canEdit = [
    'admin',
    'lawyer',
    'secretary',
  ].includes(
    user?.role
  );

  const canUploadVersion =
    canEdit;

  // ======================================================
  // DOCUMENT QUERY
  // ======================================================

  const {
    data,
    isLoading,
    error,
  } = useDocument(id);

  const documentItem =
    data?.data?.data ??
    data?.data ??
    null;

  // ======================================================
  // VERSIONS QUERY
  // ======================================================

  const {
    data: versionsData,
    isLoading:
      versionsLoading,
  } =
    useDocumentVersions(
      id
    );

  const versions =
    versionsData?.data
      ?.data ??
    versionsData?.data ??
    [];

  // ======================================================
  // VERSION UPLOAD MUTATION
  // ======================================================

  const uploadVersionMutation =
    useUploadDocumentVersion();

  // ======================================================
  // CURRENT / LATEST VERSION
  // ======================================================

  const currentDocument =
    useMemo(() => {
      if (!documentItem) {
        return null;
      }

      if (
        !Array.isArray(
          versions
        ) ||
        versions.length ===
          0
      ) {
        return documentItem;
      }

      return versions.reduce(
        (
          currentLatest,
          item
        ) => {
          const currentVersion =
            Number(
              currentLatest
                ?.version
            ) || 1;

          const itemVersion =
            Number(
              item?.version
            ) || 1;

          return itemVersion >
            currentVersion
            ? item
            : currentLatest;
        },
        documentItem
      );
    }, [
      documentItem,
      versions,
    ]);

  const latestVersion =
    Number(
      currentDocument?.version
    ) || 1;

  const hasNewerVersion =
    Boolean(
      documentItem &&
        currentDocument &&
        currentDocument.id !==
          documentItem.id
    );

  // ======================================================
  // DOWNLOAD
  // ======================================================

  const handleDownload = async (
    targetDocument =
      currentDocument
  ) => {
    if (!targetDocument?.id) {
      toast.error(
        'İndirilecek belge bulunamadı'
      );

      return;
    }

    let objectUrl = null;
    let anchor = null;

    try {
      const response =
        await documentApi.download(
          targetDocument.id
        );

      const blob =
        new Blob(
          [response.data],
          {
            type:
              targetDocument.mime_type ||
              response.headers?.[
                'content-type'
              ] ||
              'application/octet-stream',
          }
        );

      objectUrl =
        window.URL.createObjectURL(
          blob
        );

      anchor =
        window.document.createElement(
          'a'
        );

      anchor.href =
        objectUrl;

      anchor.download =
        targetDocument.original_name ||
        targetDocument.name ||
        'document';

      anchor.style.display =
        'none';

      window.document.body.appendChild(
        anchor
      );

      anchor.click();

      toast.success(
        `v${targetDocument.version || 1} indirildi`
      );
    } catch (downloadError) {
      console.error(
        'Document download error:',
        downloadError
      );

      toast.error(
        downloadError?.response
          ?.data?.message ||
          'Dosya indirilemedi'
      );
    } finally {
      if (
        anchor?.parentNode
      ) {
        anchor.parentNode.removeChild(
          anchor
        );
      }

      if (objectUrl) {
        window.URL.revokeObjectURL(
          objectUrl
        );
      }
    }
  };

  // ======================================================
  // PREVIEW
  // ======================================================

  const handlePreview = async (
    targetDocument =
      currentDocument
  ) => {
    if (!targetDocument?.id) {
      toast.error(
        'Önizlenecek belge bulunamadı'
      );

      return;
    }

    try {
      /*
       * Popup engelleyicilerin daha az sorun çıkarması için
       * pencereyi kullanıcı tıklaması sırasında açıyoruz.
       */
      const previewWindow =
        window.open(
          '',
          '_blank'
        );

      const response =
        await documentApi.preview(
          targetDocument.id
        );

      const blob =
        new Blob(
          [response.data],
          {
            type:
              targetDocument.mime_type ||
              response.headers?.[
                'content-type'
              ] ||
              'application/octet-stream',
          }
        );

      const url =
        window.URL.createObjectURL(
          blob
        );

      if (previewWindow) {
        previewWindow.opener =
          null;

        previewWindow.location.href =
          url;
      } else {
        window.open(
          url,
          '_blank',
          'noopener,noreferrer'
        );
      }

      window.setTimeout(
        () => {
          window.URL.revokeObjectURL(
            url
          );
        },
        60_000
      );
    } catch (previewError) {
      console.error(
        'Document preview error:',
        previewError
      );

      toast.error(
        previewError?.response
          ?.data?.message ||
          'Belge önizlenemedi'
      );
    }
  };

  // ======================================================
  // VERSION FILE
  // ======================================================

  const handleVersionFileChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      setVersionFile(
        null
      );

      return;
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      toast.error(
        'Dosya boyutu en fazla 10 MB olabilir'
      );

      event.target.value =
        '';

      setVersionFile(
        null
      );

      return;
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
        'Desteklenmeyen dosya türü'
      );

      event.target.value =
        '';

      setVersionFile(
        null
      );

      return;
    }

    setVersionFile(
      file
    );
  };

  // ======================================================
  // UPLOAD VERSION
  // ======================================================

  const handleUploadVersion =
    () => {
      if (!versionFile) {
        toast.error(
          'Yeni versiyon dosyasını seçin'
        );

        return;
      }

      const formData =
        new FormData();

      formData.append(
        'file',
        versionFile
      );

      if (
        versionDescription.trim()
      ) {
        formData.append(
          'description',
          versionDescription.trim()
        );
      }

      uploadVersionMutation.mutate(
        {
          documentId: id,
          formData,
        },
        {
          onSuccess: () => {
            setShowVersionModal(
              false
            );

            setVersionFile(
              null
            );

            setVersionDescription(
              ''
            );

            if (
              fileInputRef.current
            ) {
              fileInputRef.current.value =
                '';
            }
          },
        }
      );
    };

  // ======================================================
  // CLOSE VERSION MODAL
  // ======================================================

  const handleCloseVersionModal =
    () => {
      if (
        uploadVersionMutation.isPending
      ) {
        return;
      }

      setShowVersionModal(
        false
      );

      setVersionFile(
        null
      );

      setVersionDescription(
        ''
      );

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          '';
      }
    };

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

  if (
    error ||
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
          {error?.response
            ?.data?.message ||
            error?.message ||
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
    <div className="mx-auto max-w-5xl space-y-6">

      {/* HEADER */}

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div>

          <Link
            to="/documents"
            className="text-blue-600 hover:underline"
          >
            ← Belgeler
          </Link>

          <div className="mt-2 flex flex-wrap items-center gap-2">

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {documentItem.name}
            </h1>

            <Badge variant="info">
              Güncel v
              {latestVersion}
            </Badge>

            {documentItem.is_archived && (
              <Badge variant="warning">
                Arşivlendi
              </Badge>
            )}

          </div>

          <p className="mt-1 text-sm text-gray-500">
            Belge ailesi ·{' '}
            {Array.isArray(
              versions
            ) &&
            versions.length >
              0
              ? versions.length
              : 1}{' '}
            versiyon
          </p>

        </div>

        <div className="flex flex-wrap gap-2">

          <Button
            variant="outline"
            onClick={() =>
              handlePreview()
            }
          >
            <Eye className="mr-2 h-4 w-4" />

            Günceli Önizle
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              handleDownload()
            }
          >
            <Download className="mr-2 h-4 w-4" />

            Günceli İndir
          </Button>

          {canUploadVersion && (
            <Button
              variant="outline"
              onClick={() =>
                setShowVersionModal(
                  true
                )
              }
            >
              <UploadCloud className="mr-2 h-4 w-4" />

              Yeni Versiyon
            </Button>
          )}

          {canEdit && (
            <Button
              variant="secondary"
              onClick={() =>
                navigate(
                  `/documents/${id}/edit`
                )
              }
            >
              <Pencil className="mr-2 h-4 w-4" />

              Düzenle
            </Button>
          )}

        </div>

      </div>

      {/* NEWER VERSION INFO */}

      {hasNewerVersion && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">

          <p className="font-medium text-blue-900 dark:text-blue-200">
            Güncel belge sürümü v
            {latestVersion}
          </p>

          <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
            Bu belge ailesinin daha yeni bir sürümü bulunuyor.
            Önizleme ve indirme işlemleri varsayılan olarak en güncel versiyon üzerinden yapılır.
          </p>

        </div>
      )}

      {/* FILE SUMMARY */}

      <Card>

        <div className="space-y-6 p-6">

          <div className="flex items-start gap-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">

            <span className="text-5xl">
              {getFileIcon(
                currentDocument?.file_type
              )}
            </span>

            <div className="min-w-0 flex-1">

              <div className="flex flex-wrap items-center gap-2">

                <p className="text-sm text-gray-500">
                  Güncel Dosya
                </p>

                <Badge variant="success">
                  v
                  {currentDocument?.version ||
                    1}
                </Badge>

              </div>

              <p className="mt-1 break-all font-medium text-gray-900 dark:text-white">
                {
                  currentDocument?.original_name
                }
              </p>

              <div className="mt-3 flex flex-wrap gap-2">

                <Badge variant="default">
                  {formatFileSize(
                    currentDocument?.file_size
                  )}
                </Badge>

                <Badge variant="default">
                  {currentDocument?.mime_type ||
                    'Bilinmiyor'}
                </Badge>

                {currentDocument?.file_type && (
                  <Badge variant="default">
                    {currentDocument.file_type.toUpperCase()}
                  </Badge>
                )}

              </div>

              {currentDocument?.created_at && (
                <p className="mt-3 text-xs text-gray-500">
                  Bu sürüm{' '}
                  {formatDateTime(
                    currentDocument.created_at
                  )}{' '}
                  tarihinde yüklendi.
                </p>
              )}

            </div>

          </div>

          {/* LOGICAL DOCUMENT INFO */}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            <div>

              <p className="text-sm text-gray-500">
                Kategori
              </p>

              <Badge
                className={`mt-1 ${getCategoryColor(
                  documentItem.category
                )}`}
              >
                {getCategoryLabel(
                  documentItem.category
                )}
              </Badge>

            </div>

            <div>

              <p className="text-sm text-gray-500">
                İlk Yükleyen
              </p>

              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {getPersonName(
                  documentItem.uploader
                )}
              </p>

            </div>

            <div>

              <p className="text-sm text-gray-500">
                İlk Yüklenme Tarihi
              </p>

              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {formatDateTime(
                  documentItem.created_at
                )}
              </p>

            </div>

            <div>

              <p className="text-sm text-gray-500">
                Güncel Versiyon Tarihi
              </p>

              <p className="mt-1 font-medium text-gray-900 dark:text-white">
                {formatDateTime(
                  currentDocument?.created_at
                )}
              </p>

            </div>

            <div>

              <p className="text-sm text-gray-500">
                İlişkili Dava
              </p>

              {documentItem.case ? (
                <Link
                  to={`/cases/${documentItem.case.id}`}
                  className="mt-1 block font-medium text-blue-600 hover:underline"
                >
                  {
                    documentItem.case
                      .title
                  }
                </Link>
              ) : (
                <span className="mt-1 block text-gray-400">
                  -
                </span>
              )}

            </div>

            <div>

              <p className="text-sm text-gray-500">
                İlişkili Müvekkil
              </p>

              {documentItem.client ? (
                <Link
                  to={`/clients/${documentItem.client.id}`}
                  className="mt-1 block font-medium text-blue-600 hover:underline"
                >
                  {
                    documentItem.client
                      .name
                  }
                </Link>
              ) : (
                <span className="mt-1 block text-gray-400">
                  -
                </span>
              )}

            </div>

            {documentItem.powerOfAttorney && (
              <div>

                <p className="text-sm text-gray-500">
                  İlişkili Vekâletname
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {
                    documentItem
                      .powerOfAttorney
                      .title
                  }
                </p>

              </div>
            )}

            <div>

              <p className="text-sm text-gray-500">
                Erişim
              </p>

              <Badge
                className={
                  documentItem.is_public
                    ? 'mt-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                    : 'mt-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }
              >
                {documentItem.is_public
                  ? '🌐 Büro içi genel erişim'
                  : '🔒 Kısıtlı'}
              </Badge>

            </div>

          </div>

          {/* TAGS */}

          {Array.isArray(
            documentItem.tags
          ) &&
            documentItem.tags
              .length > 0 && (
              <div>

                <p className="mb-2 text-sm text-gray-500">
                  Etiketler
                </p>

                <div className="flex flex-wrap gap-2">

                  {documentItem.tags.map(
                    (tag) => (
                      <Badge
                        key={tag}
                        variant="default"
                        className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        #{tag}
                      </Badge>
                    )
                  )}

                </div>

              </div>
            )}

          {/* DESCRIPTION */}

          {documentItem.description && (
            <div>

              <p className="mb-2 text-sm text-gray-500">
                Belge Açıklaması
              </p>

              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">

                <p className="whitespace-pre-wrap leading-7 text-gray-700 dark:text-gray-300">
                  {
                    documentItem.description
                  }
                </p>

              </div>

            </div>
          )}

          {hasNewerVersion &&
            currentDocument?.description &&
            currentDocument.description !==
              documentItem.description && (
              <div>

                <p className="mb-2 text-sm text-gray-500">
                  Güncel Versiyon Notu
                </p>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">

                  <p className="whitespace-pre-wrap leading-7 text-blue-900 dark:text-blue-200">
                    {
                      currentDocument.description
                    }
                  </p>

                </div>

              </div>
            )}

        </div>

      </Card>

      {/* VERSION HISTORY */}

      <Card>

        <Card.Header>

          <div className="flex items-center justify-between gap-3">

            <div className="flex items-center gap-2">

              <History className="h-5 w-5 text-blue-600" />

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Versiyon Geçmişi
                </h2>

                <p className="text-xs text-gray-500">
                  Belgenin tüm kayıtlı sürümleri
                </p>

              </div>

            </div>

            <Badge variant="info">
              Güncel: v
              {latestVersion}
            </Badge>

          </div>

        </Card.Header>

        <Card.Body>

          {versionsLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Versiyonlar yükleniyor...
            </div>
          ) : !Array.isArray(
              versions
            ) ||
            versions.length ===
              0 ? (
            <div className="py-8 text-center">

              <FileClock className="mx-auto h-8 w-8 text-gray-400" />

              <p className="mt-2 text-sm text-gray-500">
                Henüz versiyon geçmişi bulunmuyor.
              </p>

            </div>
          ) : (
            <div className="space-y-3">

              {versions.map(
                (version) => {
                  const isLatest =
                    Number(
                      version.version
                    ) ===
                    latestVersion;

                  const isRoot =
                    version.id ===
                    documentItem.id;

                  return (
                    <div
                      key={
                        version.id
                      }
                      className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between"
                    >

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <p className="font-medium text-gray-900 dark:text-white">
                            v
                            {
                              version.version
                            }
                          </p>

                          {isLatest && (
                            <Badge variant="success">
                              Güncel
                            </Badge>
                          )}

                          {isRoot && (
                            <Badge variant="default">
                              İlk Sürüm
                            </Badge>
                          )}

                        </div>

                        <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-300">
                          {
                            version.original_name
                          }
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {formatDateTime(
                            version.created_at
                          )}
                          {' · '}
                          {formatFileSize(
                            version.file_size
                          )}
                          {' · '}
                          {getPersonName(
                            version.uploader
                          )}
                        </p>

                        {version.description && (
                          <p className="mt-2 text-xs text-gray-500">
                            {
                              version.description
                            }
                          </p>
                        )}

                      </div>

                      <div className="flex shrink-0 gap-2">

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handlePreview(
                              version
                            )
                          }
                        >
                          <Eye className="mr-1 h-4 w-4" />

                          Aç
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleDownload(
                              version
                            )
                          }
                        >
                          <Download className="mr-1 h-4 w-4" />

                          İndir
                        </Button>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </Card.Body>

      </Card>

      {/* VERSION MODAL */}

      {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">

            <div className="flex items-start justify-between gap-4">

              <div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Yeni Belge Versiyonu
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Mevcut sürümler korunur. Yeni dosya v
                  {latestVersion + 1}{' '}
                  olarak kaydedilecektir.
                </p>

              </div>

              <button
                type="button"
                onClick={
                  handleCloseVersionModal
                }
                disabled={
                  uploadVersionMutation.isPending
                }
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
                aria-label="Pencereyi kapat"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <div className="mt-6 space-y-4">

              <div>

                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Yeni Dosya *
                </label>

                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  onChange={
                    handleVersionFileChange
                  }
                  accept={ALLOWED_EXTENSIONS.join(
                    ','
                  )}
                  disabled={
                    uploadVersionMutation.isPending
                  }
                  className="block w-full rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />

                <p className="mt-1 text-xs text-gray-500">
                  Maksimum 10 MB
                </p>

              </div>

              {versionFile && (
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">

                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {
                      versionFile.name
                    }
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {formatFileSize(
                      versionFile.size
                    )}
                  </p>

                </div>
              )}

              <div>

                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Versiyon Notu
                </label>

                <textarea
                  rows="3"
                  value={
                    versionDescription
                  }
                  disabled={
                    uploadVersionMutation.isPending
                  }
                  onChange={(event) =>
                    setVersionDescription(
                      event.target
                        .value
                    )
                  }
                  placeholder="Bu versiyonda ne değişti?"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />

              </div>

            </div>

            <div className="mt-6 flex gap-3">

              <Button
                onClick={
                  handleUploadVersion
                }
                loading={
                  uploadVersionMutation.isPending
                }
                disabled={
                  !versionFile ||
                  uploadVersionMutation.isPending
                }
                className="flex-1"
              >
                <UploadCloud className="mr-2 h-4 w-4" />

                v
                {latestVersion + 1}{' '}
                Yükle
              </Button>

              <Button
                variant="secondary"
                disabled={
                  uploadVersionMutation.isPending
                }
                onClick={
                  handleCloseVersionModal
                }
              >
                Vazgeç
              </Button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default DocumentDetail;