import {
  useParams,
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  useQuery,
  useMutation,
} from '@tanstack/react-query';

import {
  templateApi,
} from '../../features/templates/template.api.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import {
  PERMISSION_KEYS,
  hasPermission,
} from '../../constants/roles.js';

import Badge from '../../components/ui/Badge.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';

import {
  ArrowLeft,
  CalendarDays,
  Download,
  Edit2,
  FileText,
  FolderOpen,
  Scale,
  Trash2,
  UserRound,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// LABELS
// ======================================================

const CATEGORY_LABELS = {
  dilekce: 'Dilekçe',
  ihtar: 'İhtar',
  sozlesme: 'Sözleşme',
};

const LAW_AREA_LABELS = {
  ozel_hukuk: 'Özel Hukuk',
  ceza_hukuku: 'Ceza Hukuku',
  idare_hukuku: 'İdare Hukuku',
  ofis_ici: 'Ofis İçi',
};

// ======================================================
// HELPERS
// ======================================================

const getCategoryLabel = (category) => {
  return (
    CATEGORY_LABELS[
      category
    ] ||
    category ||
    '-'
  );
};

const getLawAreaLabel = (lawArea) => {
  return (
    LAW_AREA_LABELS[
      lawArea
    ] ||
    lawArea ||
    '-'
  );
};

const formatDate = (date) => {
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

// ======================================================
// COMPONENT
// ======================================================

const TemplateDetail = () => {
  const { id } =
    useParams();

  const navigate =
    useNavigate();

  const {
    user,
  } = useAuth();

  const canEdit =
    hasPermission(
      user,
      PERMISSION_KEYS.EDIT_TEMPLATES
    );

  const canDelete =
    hasPermission(
      user,
      PERMISSION_KEYS.DELETE_TEMPLATES
    );

  // ======================================================
  // QUERY
  // ======================================================

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'template',
      id,
    ],

    queryFn: () =>
      templateApi.getOne(id),

    enabled:
      Boolean(id),
  });

  const template =
    data?.data?.data;

  // ======================================================
  // DELETE
  // ======================================================

  const deleteMutation =
    useMutation({
      mutationFn: () =>
        templateApi.delete(id),

      onSuccess: () => {
        toast.success(
          'Şablon silindi'
        );

        navigate(
          '/templates'
        );
      },

      onError: (error) => {
        toast.error(
          error?.response?.data?.message ||
            'Silme başarısız'
        );
      },
    });

  // ======================================================
  // DOWNLOAD
  // ======================================================

  const handleDownload =
    async () => {
      try {
        const response =
          await templateApi.download(
            id
          );

        const responseData =
          response?.data?.data;

        /*
         * Backend presigned URL döndürüyorsa
         * direkt açıyoruz.
         */
        if (
          responseData?.downloadUrl
        ) {
          window.open(
            responseData.downloadUrl,
            '_blank',
            'noopener,noreferrer'
          );

          toast.success(
            'İndirme başlatıldı'
          );

          refetch();

          return;
        }

        /*
         * API doğrudan blob döndürüyorsa
         * fallback olarak indiriyoruz.
         */
        if (
          response?.data instanceof Blob
        ) {
          const url =
            window.URL.createObjectURL(
              response.data
            );

          const link =
            document.createElement(
              'a'
            );

          link.href =
            url;

          link.download =
            template?.file_name ||
            'sablon';

          document.body.appendChild(
            link
          );

          link.click();
          link.remove();

          window.URL.revokeObjectURL(
            url
          );

          toast.success(
            'Şablon indirildi'
          );

          refetch();

          return;
        }

        toast.error(
          'İndirme bağlantısı alınamadı'
        );
      } catch (error) {
        console.error(
          'Template download error:',
          error
        );

        toast.error(
          error?.response?.data?.message ||
            'İndirilemedi'
        );
      }
    };

  // ======================================================
  // DELETE HANDLER
  // ======================================================

  const handleDelete = () => {
    if (!canDelete) {
      toast.error(
        'Bu şablonu silme yetkiniz bulunmuyor'
      );

      return;
    }

    const confirmed =
      window.confirm(
        `"${template?.title || 'Bu şablon'}" şablonunu silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`
      );

    if (!confirmed) {
      return;
    }

    deleteMutation.mutate();
  };

  // ======================================================
  // LOADING
  // ======================================================

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">

        <div className="text-center">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600" />

          <p className="mt-4 text-sm text-gray-500">
            Şablon yükleniyor...
          </p>

        </div>

      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (
    error ||
    !template
  ) {
    return (
      <div className="py-12 text-center">

        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-800">
          <FileText className="h-6 w-6" />
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Şablon Bulunamadı
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {error
            ?.response
            ?.data
            ?.message ||
            error?.message ||
            'Şablon bilgileri yüklenemedi'}
        </p>

        <Link
          to="/templates"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />

          Şablonlara Dön
        </Link>

      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div>

        <Link
          to="/templates"
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

          Şablonlar
        </Link>

        <div className="mt-3 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">

          {/* LEFT */}

          <div className="flex min-w-0 items-start gap-3">

            <div
              className="
                flex
                h-12
                w-12
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
              <FileText size={22} />
            </div>

            <div className="min-w-0">

              <h1
                className="
                  truncate
                  text-2xl
                  font-semibold
                  tracking-[-0.035em]
                  text-gray-900
                  dark:text-white
                "
              >
                {template.title}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2">

                <Badge variant="info">
                  {getCategoryLabel(
                    template.category
                  )}
                </Badge>

                <Badge variant="default">
                  {getLawAreaLabel(
                    template.law_area
                  )}
                </Badge>

                <Badge variant="default">
                  v
                  {template.version ||
                    1}
                </Badge>

                <Badge
                  variant={
                    template.is_active
                      ? 'success'
                      : 'danger'
                  }
                >
                  {template.is_active
                    ? 'Aktif'
                    : 'Pasif'}
                </Badge>

              </div>

              {template.description && (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500 dark:text-slate-400">
                  {template.description}
                </p>
              )}

            </div>

          </div>

          {/* ACTIONS */}

          <div className="flex flex-wrap items-center gap-2">

            <Button
              type="button"
              onClick={
                handleDownload
              }
            >
              <Download className="mr-2 h-4 w-4" />

              İndir
            </Button>

            {canEdit && (
              <Link
                to={`/templates/${template.id}/edit`}
              >
                <Button
                  variant="outline"
                >
                  <Edit2 className="mr-2 h-4 w-4" />

                  Düzenle
                </Button>
              </Link>
            )}

          </div>

        </div>

      </div>

      {/* ==================================================
          QUICK STATS
      ================================================== */}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

        {/* VERSION */}

        <div
          className="
            rounded-xl
            border
            border-gray-200
            bg-white
            p-4
            shadow-sm
            dark:border-white/[0.06]
            dark:bg-gray-800
          "
        >

          <div className="flex items-center justify-between">

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

            <span className="text-xs text-gray-400">
              Versiyon
            </span>

          </div>

          <p className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
            v
            {template.version ||
              1}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Güncel sürüm
          </p>

        </div>

        {/* DOWNLOAD */}

        <div
          className="
            rounded-xl
            border
            border-gray-200
            bg-white
            p-4
            shadow-sm
            dark:border-white/[0.06]
            dark:bg-gray-800
          "
        >

          <div className="flex items-center justify-between">

            <div
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                bg-emerald-50
                text-emerald-600
                dark:bg-emerald-500/[0.08]
                dark:text-emerald-400
              "
            >
              <Download size={17} />
            </div>

            <span className="text-xs text-gray-400">
              İndirme
            </span>

          </div>

          <p className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
            {template.download_count ||
              0}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Toplam kullanım
          </p>

        </div>

        {/* CATEGORY */}

        <div
          className="
            rounded-xl
            border
            border-gray-200
            bg-white
            p-4
            shadow-sm
            dark:border-white/[0.06]
            dark:bg-gray-800
          "
        >

          <div className="flex items-center justify-between">

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
              <FolderOpen size={17} />
            </div>

            <span className="text-xs text-gray-400">
              Kategori
            </span>

          </div>

          <p className="mt-3 truncate text-sm font-semibold text-gray-900 dark:text-white">
            {getCategoryLabel(
              template.category
            )}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Şablon türü
          </p>

        </div>

        {/* LAW AREA */}

        <div
          className="
            rounded-xl
            border
            border-gray-200
            bg-white
            p-4
            shadow-sm
            dark:border-white/[0.06]
            dark:bg-gray-800
          "
        >

          <div className="flex items-center justify-between">

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
              <Scale size={17} />
            </div>

            <span className="text-xs text-gray-400">
              Hukuk Alanı
            </span>

          </div>

          <p className="mt-3 truncate text-sm font-semibold text-gray-900 dark:text-white">
            {getLawAreaLabel(
              template.law_area
            )}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Sınıflandırma
          </p>

        </div>

      </div>

      {/* ==================================================
          DETAILS
      ================================================== */}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">

        {/* TEMPLATE INFO */}

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
                  Şablon Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Temel sınıflandırma ve açıklama bilgileri
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">

              <div className="grid grid-cols-[130px_1fr] gap-4 py-3 first:pt-0">

                <span className="text-sm text-gray-500">
                  Başlık
                </span>

                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {template.title}
                </span>

              </div>

              <div className="grid grid-cols-[130px_1fr] gap-4 py-3">

                <span className="text-sm text-gray-500">
                  Kategori
                </span>

                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {getCategoryLabel(
                    template.category
                  )}
                </span>

              </div>

              <div className="grid grid-cols-[130px_1fr] gap-4 py-3">

                <span className="text-sm text-gray-500">
                  Hukuk Alanı
                </span>

                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {getLawAreaLabel(
                    template.law_area
                  )}
                </span>

              </div>

              <div className="grid grid-cols-[130px_1fr] gap-4 py-3">

                <span className="text-sm text-gray-500">
                  Durum
                </span>

                <div>

                  <Badge
                    variant={
                      template.is_active
                        ? 'success'
                        : 'danger'
                    }
                  >
                    {template.is_active
                      ? 'Aktif'
                      : 'Pasif'}
                  </Badge>

                </div>

              </div>

              <div className="grid grid-cols-[130px_1fr] gap-4 py-3 last:pb-0">

                <span className="text-sm text-gray-500">
                  Açıklama
                </span>

                <span className="whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-slate-300">
                  {template.description ||
                    '-'}
                </span>

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* META */}

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
                  bg-emerald-50
                  text-emerald-600
                  dark:bg-emerald-500/[0.08]
                  dark:text-emerald-400
                "
              >
                <CalendarDays size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Kayıt Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Oluşturan kullanıcı ve tarih bilgileri
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">

              <div className="grid grid-cols-[120px_1fr] gap-4 py-3 first:pt-0">

                <span className="text-sm text-gray-500">
                  Oluşturan
                </span>

                <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">

                  <UserRound className="h-4 w-4 text-gray-400" />

                  {[
                    template.creator
                      ?.first_name,
                    template.creator
                      ?.last_name,
                  ]
                    .filter(Boolean)
                    .join(' ') ||
                    '-'}

                </span>

              </div>

              <div className="grid grid-cols-[120px_1fr] gap-4 py-3">

                <span className="text-sm text-gray-500">
                  Oluşturulma
                </span>

                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(
                    template.created_at
                  )}
                </span>

              </div>

              <div className="grid grid-cols-[120px_1fr] gap-4 py-3">

                <span className="text-sm text-gray-500">
                  Güncelleme
                </span>

                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(
                    template.updated_at
                  )}
                </span>

              </div>

              <div className="grid grid-cols-[120px_1fr] gap-4 py-3 last:pb-0">

                <span className="text-sm text-gray-500">
                  İndirme
                </span>

                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {template.download_count ||
                    0} kez
                </span>

              </div>

            </div>

          </Card.Body>

        </Card>

      </div>

      {/* ==================================================
          FILE
      ================================================== */}

      <Card>

        <Card.Header>

          <div className="flex items-center justify-between gap-3">

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
                <FileText size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Şablon Dosyası
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Sistemde kayıtlı fiziksel şablon
                </p>

              </div>

            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={
                handleDownload
              }
            >
              <Download className="mr-2 h-4 w-4" />

              İndir
            </Button>

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
              className="
                flex
                h-14
                w-14
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-white
                text-3xl
                shadow-sm
                dark:bg-white/[0.04]
              "
            >
              <FileText className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1">

              <p className="truncate font-semibold text-gray-900 dark:text-white">
                {template.file_name ||
                  'Dosya adı bulunamadı'}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-slate-500">

                <span>
                  {template.file_type ||
                    'Dosya'}
                </span>

                <span className="hidden sm:inline">
                  •
                </span>

                <span>
                  {formatFileSize(
                    template.file_size
                  )}
                </span>

                <span className="hidden sm:inline">
                  •
                </span>

                <span>
                  v
                  {template.version ||
                    1}
                </span>

              </div>

            </div>

          </div>

        </Card.Body>

      </Card>

      {/* ==================================================
          DANGER ZONE
      ================================================== */}

      {canDelete && (
        <Card className="border border-red-200 shadow-none dark:border-red-500/20">

          <Card.Body>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <Trash2 className="h-5 w-5 text-red-500" />

                  <h2 className="font-semibold text-red-600 dark:text-red-400">
                    Tehlikeli Bölge
                  </h2>

                </div>

                <p className="mt-2 max-w-xl text-sm text-gray-500 dark:text-slate-400">
                  Bu şablon kaydını silmek geri alınamaz. Silmeden önce dosyanın artık kullanılmadığından emin olun.
                </p>

              </div>

              <Button
                type="button"
                variant="danger"
                onClick={
                  handleDelete
                }
                loading={
                  deleteMutation.isPending
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />

                Şablonu Sil
              </Button>

            </div>

          </Card.Body>

        </Card>
      )}

    </div>
  );
};

export default TemplateDetail;