import {
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  useQuery,
} from '@tanstack/react-query';

import {
  templateApi,
} from '../../features/templates/template.api.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Card from '../../components/ui/Card.jsx';

import Loader from '../../components/shared/Loader.jsx';
import Error from '../../components/shared/Error.jsx';
import Empty from '../../components/shared/Empty.jsx';

import {
  ArrowLeft,
  ArrowRight,
  Download,
  Eye,
  FileSignature,
  Files,
  Plus,
  Search,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const CATEGORY_OPTIONS = [
  {
    value: '',
    label: 'Tüm Kategoriler',
  },
  {
    value: 'dilekce',
    label: 'Dilekçe',
  },
  {
    value: 'ihtar',
    label: 'İhtar',
  },
  {
    value: 'sozlesme',
    label: 'Sözleşme',
  },
];

const LAW_AREA_OPTIONS = [
  {
    value: '',
    label: 'Tüm Hukuk Alanları',
  },
  {
    value: 'ozel_hukuk',
    label: 'Özel Hukuk',
  },
  {
    value: 'ceza_hukuku',
    label: 'Ceza Hukuku',
  },
  {
    value: 'idare_hukuku',
    label: 'İdare Hukuku',
  },
  {
    value: 'ofis_ici',
    label: 'Ofis İçi',
  },
];

// ======================================================
// HELPERS
// ======================================================

const getCategoryLabel = (
  category
) => {
  const labels = {
    dilekce: 'Dilekçe',
    ihtar: 'İhtar',
    sozlesme: 'Sözleşme',
  };

  return (
    labels[category] ||
    category ||
    '-'
  );
};

const getCategoryVariant = (
  category
) => {
  const variants = {
    dilekce: 'primary',
    ihtar: 'warning',
    sozlesme: 'success',
  };

  return (
    variants[category] ||
    'default'
  );
};

const getLawAreaLabel = (
  lawArea
) => {
  const labels = {
    ozel_hukuk: 'Özel Hukuk',
    ceza_hukuku: 'Ceza Hukuku',
    idare_hukuku: 'İdare Hukuku',
    ofis_ici: 'Ofis İçi',
  };

  return (
    labels[lawArea] ||
    lawArea ||
    '-'
  );
};

const getLawAreaVariant = (
  lawArea
) => {
  const variants = {
    ozel_hukuk: 'info',
    ceza_hukuku: 'danger',
    idare_hukuku: 'primary',
    ofis_ici: 'default',
  };

  return (
    variants[lawArea] ||
    'default'
  );
};

// ======================================================
// COMPONENT
// ======================================================

const TemplatesList = () => {
  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState('');

  const [
    categoryFilter,
    setCategoryFilter,
  ] =
    useState('');

  const [
    lawAreaFilter,
    setLawAreaFilter,
  ] =
    useState('');

  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    downloadingId,
    setDownloadingId,
  ] =
    useState(null);

  // ====================================================
  // QUERY
  // ====================================================

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } =
    useQuery({
      queryKey: [
        'templates',
        {
          page,
          search:
            searchQuery,
          category:
            categoryFilter,
          law_area:
            lawAreaFilter,
        },
      ],

      queryFn: () =>
        templateApi.getAll({
          page,
          search:
            searchQuery,
          category:
            categoryFilter,
          law_area:
            lawAreaFilter,
        }),

      staleTime:
        1000,

      keepPreviousData:
        true,
    });

  const templates =
    Array.isArray(
      data?.data?.data
    )
      ? data.data.data
      : [];

  const pagination =
    data?.data
      ?.pagination;

  const hasFilters =
    Boolean(
      searchQuery ||
      categoryFilter ||
      lawAreaFilter
    );

  // ====================================================
  // SEARCH / FILTERS
  // ====================================================

  const handleSearch =
    () => {
      setSearchQuery(
        search.trim()
      );

      setPage(1);
    };

  const handleKeyDown =
    (
      event
    ) => {
      if (
        event.key ===
        'Enter'
      ) {
        handleSearch();
      }
    };

  const handleCategoryChange =
    (
      event
    ) => {
      setCategoryFilter(
        event.target.value
      );

      setPage(1);
    };

  const handleLawAreaChange =
    (
      event
    ) => {
      setLawAreaFilter(
        event.target.value
      );

      setPage(1);
    };

  const handleClearFilters =
    () => {
      setSearch('');
      setSearchQuery('');
      setCategoryFilter('');
      setLawAreaFilter('');
      setPage(1);
    };

  // ====================================================
  // DOWNLOAD
  // ====================================================

  const handleDownload =
    async (
      id,
      fileName
    ) => {
      if (!id) {
        toast.error(
          'Şablon ID bulunamadı'
        );

        return;
      }

      try {
        setDownloadingId(
          id
        );

        const response =
          await templateApi.download(
            id
          );

        const blob =
          new Blob([
            response.data,
          ]);

        const url =
          window.URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            'a'
          );

        link.href =
          url;

        link.download =
          fileName ||
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
      } catch (
        downloadError
      ) {
        console.error(
          'Template download error:',
          downloadError
        );

        toast.error(
          downloadError
            ?.response
            ?.data
            ?.message ||
            'Şablon indirilemedi'
        );
      } finally {
        setDownloadingId(
          null
        );
      }
    };

  // ====================================================
  // LOADING
  // ====================================================

  if (
    isLoading
  ) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader text="Şablonlar yükleniyor..." />
      </div>
    );
  }

  // ====================================================
  // ERROR
  // ====================================================

  if (
    error
  ) {
    return (
      <Error
        title="Şablonlar yüklenemedi"
        message="Şablon kayıtları alınırken bir hata oluştu."
        error={error}
        onRetry={() =>
          refetch?.()
        }
      />
    );
  }

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div className="flex items-start gap-3">

          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-indigo-50
              text-indigo-600
              dark:bg-indigo-500/[0.08]
              dark:text-indigo-400
            "
          >
            <Files size={21} />
          </div>

          <div>

            <h1
              className="
                text-2xl
                font-semibold
                tracking-[-0.035em]
                text-gray-900
                dark:text-white
              "
            >
              Şablonlar
            </h1>

            <p
              className="
                mt-1
                max-w-2xl
                text-sm
                leading-6
                text-gray-500
                dark:text-slate-400
              "
            >
              Dilekçe, ihtar ve sözleşme şablonlarını hukuk alanlarına göre yönetin.
            </p>

            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
              Toplam{' '}
              <span className="font-semibold text-gray-600 dark:text-slate-300">
                {pagination?.total ||
                  0}
              </span>{' '}
              şablon
            </p>

          </div>

        </div>

        <Link to="/templates/create">

          <Button>
            <Plus className="h-4 w-4" />
            Yeni Şablon
          </Button>

        </Link>

      </div>

      {/* FILTERS */}

      <Card>

        <Card.Body>

          <div className="flex flex-col gap-3 xl:flex-row">

            <div className="flex flex-1 flex-col gap-2 sm:flex-row">

              <Input
                placeholder="Şablon adı veya açıklamada ara..."
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                icon={
                  <Search size={16} />
                }
              />

              <Button
                onClick={
                  handleSearch
                }
              >
                <Search className="h-4 w-4" />
                Ara
              </Button>

            </div>

            <div className="flex flex-col gap-2 sm:flex-row">

              <div className="min-w-[190px]">

                <select
                  value={
                    categoryFilter
                  }
                  onChange={
                    handleCategoryChange
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
                    shadow-sm
                    outline-none
                    transition
                    hover:border-gray-300
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >
                  {CATEGORY_OPTIONS.map(
                    (
                      option
                    ) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>

              </div>

              <div className="min-w-[200px]">

                <select
                  value={
                    lawAreaFilter
                  }
                  onChange={
                    handleLawAreaChange
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
                    shadow-sm
                    outline-none
                    transition
                    hover:border-gray-300
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >
                  {LAW_AREA_OPTIONS.map(
                    (
                      option
                    ) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>

              </div>

              {hasFilters && (
                <Button
                  variant="ghost"
                  onClick={
                    handleClearFilters
                  }
                >
                  <X className="h-4 w-4" />
                  Temizle
                </Button>
              )}

            </div>

          </div>

          {isFetching &&
            !isLoading && (
              <p className="mt-3 text-xs text-gray-400 dark:text-slate-500">
                Liste güncelleniyor...
              </p>
            )}

        </Card.Body>

      </Card>

      {/* EMPTY / TABLE */}

      {templates.length ===
      0 ? (
        <Empty
          icon={
            FileSignature
          }
          title={
            hasFilters
              ? 'Eşleşen şablon bulunamadı'
              : 'Henüz şablon bulunmuyor'
          }
          description={
            hasFilters
              ? 'Arama veya filtre kriterlerini değiştirerek tekrar deneyin.'
              : 'Yeni bir hukuk belgesi şablonu oluşturarak kütüphanenizi hazırlayabilirsiniz.'
          }
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={
                  handleClearFilters
                }
              >
                Filtreleri Temizle
              </Button>
            ) : (
              <Link to="/templates/create">

                <Button>
                  <Plus className="h-4 w-4" />
                  İlk Şablonu Oluştur
                </Button>

              </Link>
            )
          }
        />
      ) : (
        <>

          <Table>

            <Table.Head>

              <Table.Row hover={false}>

                <Table.HeadCell>
                  Şablon
                </Table.HeadCell>

                <Table.HeadCell>
                  Kategori
                </Table.HeadCell>

                <Table.HeadCell>
                  Hukuk Alanı
                </Table.HeadCell>

                <Table.HeadCell>
                  Versiyon
                </Table.HeadCell>

                <Table.HeadCell>
                  İndirme
                </Table.HeadCell>

                <Table.HeadCell className="text-right">
                  İşlem
                </Table.HeadCell>

              </Table.Row>

            </Table.Head>

            <Table.Body>

              {templates.map(
                (
                  template
                ) => (
                  <Table.Row
                    key={
                      template.id
                    }
                  >

                    {/* TEMPLATE */}

                    <Table.Cell>

                      <div className="flex min-w-[18rem] items-start gap-3">

                        <div
                          className="
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            bg-indigo-50
                            text-indigo-600
                            dark:bg-indigo-500/[0.08]
                            dark:text-indigo-400
                          "
                        >
                          <FileSignature size={18} />
                        </div>

                        <div className="min-w-0">

                          <Link
                            to={`/templates/${template.id}`}
                            className="
                              block
                              max-w-sm
                              truncate
                              font-semibold
                              text-gray-900
                              transition
                              hover:text-blue-600
                              dark:text-white
                              dark:hover:text-blue-400
                            "
                            title={
                              template.title
                            }
                          >
                            {template.title}
                          </Link>

                          {template.description && (
                            <p
                              className="
                                mt-1
                                max-w-sm
                                truncate
                                text-xs
                                text-gray-500
                                dark:text-slate-500
                              "
                              title={
                                template.description
                              }
                            >
                              {template.description}
                            </p>
                          )}

                        </div>

                      </div>

                    </Table.Cell>

                    {/* CATEGORY */}

                    <Table.Cell>

                      <Badge
                        variant={
                          getCategoryVariant(
                            template.category
                          )
                        }
                        dot
                      >
                        {getCategoryLabel(
                          template.category
                        )}
                      </Badge>

                    </Table.Cell>

                    {/* LAW AREA */}

                    <Table.Cell>

                      <Badge
                        variant={
                          getLawAreaVariant(
                            template.law_area
                          )
                        }
                      >
                        {getLawAreaLabel(
                          template.law_area
                        )}
                      </Badge>

                    </Table.Cell>

                    {/* VERSION */}

                    <Table.Cell>

                      <span
                        className="
                          inline-flex
                          rounded-md
                          bg-gray-100
                          px-2
                          py-1
                          font-mono
                          text-xs
                          font-semibold
                          text-gray-600
                          dark:bg-white/[0.05]
                          dark:text-slate-400
                        "
                      >
                        v{template.version ||
                          1}
                      </span>

                    </Table.Cell>

                    {/* DOWNLOAD COUNT */}

                    <Table.Cell>

                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">

                        <Download className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500" />

                        <span className="font-medium">
                          {Number(
                            template.download_count
                          ) || 0}
                        </span>

                      </div>

                    </Table.Cell>

                    {/* ACTIONS */}

                    <Table.Cell className="text-right">

                      <div className="flex items-center justify-end gap-1">

                        <Link
                          to={`/templates/${template.id}`}
                          className="
                            inline-flex
                            h-8
                            w-8
                            items-center
                            justify-center
                            rounded-lg
                            text-gray-400
                            transition
                            hover:bg-blue-50
                            hover:text-blue-600
                            dark:text-slate-500
                            dark:hover:bg-blue-500/[0.08]
                            dark:hover:text-blue-400
                          "
                          title="Şablonu görüntüle"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            handleDownload(
                              template.id,
                              template.file_name
                            )
                          }
                          disabled={
                            downloadingId ===
                            template.id
                          }
                          className="
                            inline-flex
                            h-8
                            w-8
                            items-center
                            justify-center
                            rounded-lg
                            text-gray-400
                            transition
                            hover:bg-emerald-50
                            hover:text-emerald-600
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                            dark:text-slate-500
                            dark:hover:bg-emerald-500/[0.08]
                            dark:hover:text-emerald-400
                          "
                          title="Şablonu indir"
                        >
                          <Download
                            className={`h-4 w-4 ${
                              downloadingId ===
                              template.id
                                ? 'animate-pulse'
                                : ''
                            }`}
                          />
                        </button>

                      </div>

                    </Table.Cell>

                  </Table.Row>
                )
              )}

            </Table.Body>

          </Table>

          {/* PAGINATION */}

          {pagination &&
            pagination.totalPages >
              1 && (
              <div
                className="
                  flex
                  flex-col
                  gap-3
                  rounded-xl
                  border
                  border-gray-200
                  bg-white
                  px-4
                  py-3
                  dark:border-white/[0.07]
                  dark:bg-[#0b1b33]
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >

                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Toplam{' '}
                  <span className="font-semibold text-gray-700 dark:text-slate-300">
                    {pagination.total}
                  </span>{' '}
                  şablon
                </p>

                <div className="flex items-center gap-2">

                  <Button
                    variant="secondary"
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
                            current -
                              1
                          )
                      )
                    }
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Önceki
                  </Button>

                  <span className="min-w-[70px] text-center text-xs font-semibold text-gray-600 dark:text-slate-400">
                    {page} /{' '}
                    {pagination.totalPages}
                  </span>

                  <Button
                    variant="secondary"
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
                            current +
                              1
                          )
                      )
                    }
                  >
                    Sonraki
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>

                </div>

              </div>
            )}

        </>
      )}

    </div>
  );
};

export default TemplatesList;