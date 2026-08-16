import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  useClients,
} from '../../features/clients/client.query.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import {
  useDebounce,
} from '../../hooks/useDebounce.js';

import Button from '../../components/ui/Button.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  Search,
  UserRound,
  Users,
  X,
} from 'lucide-react';

// ======================================================
// CONSTANTS
// ======================================================

const STATUS_OPTIONS = [
  {
    value: '',
    label: 'Tüm Durumlar',
  },
  {
    value: 'active',
    label: 'Aktif',
  },
  {
    value: 'passive',
    label: 'Pasif',
  },
  {
    value: 'archived',
    label: 'Arşiv',
  },
];

const CLIENT_TYPE_OPTIONS = [
  {
    value: '',
    label: 'Tüm Türler',
  },
  {
    value: 'individual',
    label: 'Bireysel',
  },
  {
    value: 'corporate',
    label: 'Kurumsal',
  },
];

// ======================================================
// HELPERS
// ======================================================

const getStatusLabel = (
  status
) => {
  switch (status) {
    case 'active':
      return 'Aktif';

    case 'passive':
      return 'Pasif';

    case 'archived':
      return 'Arşiv';

    default:
      return status || '-';
  }
};

const getStatusVariant = (
  status
) => {
  switch (status) {
    case 'active':
      return 'success';

    case 'passive':
      return 'warning';

    case 'archived':
      return 'default';

    default:
      return 'default';
  }
};

const getClientTypeLabel = (
  type
) => {
  return type ===
    'corporate'
    ? 'Kurumsal'
    : 'Bireysel';
};

const getClientTypeIcon = (
  type
) => {
  return type ===
    'corporate'
    ? Building2
    : UserRound;
};

const getPersonName = (
  client
) => {
  return (
    client?.name ||
    'İsimsiz Müvekkil'
  );
};

// ======================================================
// COMPONENT
// ======================================================

const ClientsList = () => {
  const { user } =
    useAuth();

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('');

  const [
    clientTypeFilter,
    setClientTypeFilter,
  ] = useState('');

  const [
    cityFilter,
    setCityFilter,
  ] = useState('');

  const [
    page,
    setPage,
  ] = useState(1);

  const debouncedSearch =
    useDebounce(
      search,
      400
    );

  const debouncedCity =
    useDebounce(
      cityFilter,
      400
    );

  // ======================================================
  // PERMISSIONS
  // ======================================================

  const canCreate = [
    'admin',
    'lawyer',
    'secretary',
  ].includes(
    user?.role
  );

  // ======================================================
  // QUERY
  // ======================================================

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useClients({
    page,

    limit:
      10,

    search:
      debouncedSearch,

    status:
      statusFilter,

    client_type:
      clientTypeFilter,

    city:
      debouncedCity,
  });

  // ======================================================
  // DATA
  // ======================================================

  const clients =
    Array.isArray(
      data?.data?.data
    )
      ? data.data.data
      : [];

  const pagination =
    data?.data
      ?.pagination;

  // ======================================================
  // RESET PAGE
  // ======================================================

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    statusFilter,
    clientTypeFilter,
    debouncedCity,
  ]);

  // ======================================================
  // PAGINATION SAFETY
  // ======================================================

  useEffect(() => {
    if (
      !pagination
    ) {
      return;
    }

    const totalPages =
      Number(
        pagination.totalPages
      ) || 1;

    if (
      page >
      totalPages
    ) {
      setPage(
        totalPages
      );
    }
  }, [
    pagination,
    page,
  ]);

  // ======================================================
  // FILTER STATE
  // ======================================================

  const hasFilters =
    Boolean(
      search ||
      statusFilter ||
      clientTypeFilter ||
      cityFilter
    );

  const handleClearFilters =
    () => {
      setSearch('');
      setStatusFilter('');
      setClientTypeFilter('');
      setCityFilter('');
      setPage(1);
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
            Müvekkiller yükleniyor...
          </p>

        </div>

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
          Müvekkiller yüklenirken hata oluştu
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {error?.response
            ?.data?.message ||
            error?.message ||
            'Bilinmeyen hata'}
        </p>

        <Button
          className="mt-4"
          onClick={() =>
            refetch()
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

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <div className="flex items-center gap-2">

            <Users className="h-6 w-6 text-blue-600" />

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Müvekkiller
            </h1>

          </div>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Bireysel ve kurumsal müvekkilleri, ilişkili davaları ve iletişim bilgilerini yönetin.
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Toplam{' '}
            {pagination?.total ||
              0}{' '}
            müvekkil
          </p>

        </div>

        {canCreate && (
          <Link to="/clients/create">

            <Button>
              <Plus className="mr-2 h-4 w-4" />

              Yeni Müvekkil
            </Button>

          </Link>
        )}

      </div>

      {/* ==================================================
          FILTER CARD
      ================================================== */}

      <div className="overflow-hidden rounded-xl bg-white shadow dark:bg-gray-800">

        <div className="border-b border-gray-200 p-4 dark:border-gray-700">

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">

            {/* SEARCH */}

            <div className="relative xl:col-span-5">

              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={
                  search
                }
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Ad, TCKNO/VKN, e-posta veya telefon ara..."
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />

            </div>

            {/* STATUS */}

            <div className="xl:col-span-2">

              <select
                value={
                  statusFilter
                }
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >

                {STATUS_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {
                        option.label
                      }
                    </option>
                  )
                )}

              </select>

            </div>

            {/* CLIENT TYPE */}

            <div className="xl:col-span-2">

              <select
                value={
                  clientTypeFilter
                }
                onChange={(event) =>
                  setClientTypeFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >

                {CLIENT_TYPE_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {
                        option.label
                      }
                    </option>
                  )
                )}

              </select>

            </div>

            {/* CITY */}

            <div className="xl:col-span-2">

              <input
                type="text"
                value={
                  cityFilter
                }
                onChange={(event) =>
                  setCityFilter(
                    event.target.value
                  )
                }
                placeholder="Şehir"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />

            </div>

            {/* CLEAR */}

            <div className="xl:col-span-1">

              {hasFilters && (
                <Button
                  variant="outline"
                  onClick={
                    handleClearFilters
                  }
                  className="w-full"
                  title="Filtreleri temizle"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}

            </div>

          </div>

          {isFetching &&
            !isLoading && (
              <p className="mt-2 text-xs text-gray-400">
                Liste güncelleniyor...
              </p>
            )}

        </div>

        {/* ==================================================
            TABLE
        ================================================== */}

        <div className="overflow-x-auto">

          <Table>

            <Table.Head>

              <Table.Row>

                <Table.HeadCell>
                  Müvekkil
                </Table.HeadCell>

                <Table.HeadCell>
                  İletişim
                </Table.HeadCell>

                <Table.HeadCell>
                  Konum
                </Table.HeadCell>

                <Table.HeadCell>
                  Dava
                </Table.HeadCell>

                <Table.HeadCell>
                  Durum
                </Table.HeadCell>

                <Table.HeadCell>
                  İşlem
                </Table.HeadCell>

              </Table.Row>

            </Table.Head>

            <Table.Body>

              {clients.length ===
              0 ? (
                <Table.Row>

                  <Table.Cell
                    colSpan="6"
                    className="py-12 text-center text-gray-500"
                  >

                    <div className="mb-3 text-4xl">
                      👤
                    </div>

                    <p className="font-medium">
                      {hasFilters
                        ? 'Filtrelere uygun müvekkil bulunamadı'
                        : 'Henüz müvekkil kaydı bulunmuyor'}
                    </p>

                    {canCreate &&
                      !hasFilters && (
                        <Link
                          to="/clients/create"
                          className="mt-3 inline-block text-blue-600 hover:underline"
                        >
                          İlk müvekkili oluştur
                        </Link>
                      )}

                  </Table.Cell>

                </Table.Row>
              ) : (
                clients.map(
                  (client) => {
                    const ClientIcon =
                      getClientTypeIcon(
                        client.client_type
                      );

                    return (
                      <Table.Row
                        key={
                          client.id
                        }
                      >

                        {/* CLIENT */}

                        <Table.Cell>

                          <div className="flex min-w-[15rem] items-start gap-3">

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">

                              <ClientIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />

                            </div>

                            <div className="min-w-0">

                              <Link
                                to={`/clients/${client.id}`}
                                className="block max-w-xs truncate font-medium text-blue-600 hover:underline dark:text-blue-400"
                                title={
                                  getPersonName(
                                    client
                                  )
                                }
                              >
                                {getPersonName(
                                  client
                                )}
                              </Link>

                              <p className="mt-1 text-xs text-gray-500">
                                {getClientTypeLabel(
                                  client.client_type
                                )}
                              </p>

                              {client.identification_number && (
                                <p className="mt-1 text-xs text-gray-400">
                                  Kimlik/VKN: ••••
                                  {String(
                                    client.identification_number
                                  ).slice(
                                    -4
                                  )}
                                </p>
                              )}

                            </div>

                          </div>

                        </Table.Cell>

                        {/* CONTACT */}

                        <Table.Cell>

                          <div className="min-w-[11rem] space-y-1">

                            <p className="text-sm text-gray-900 dark:text-white">
                              {client.phone ||
                                '-'}
                            </p>

                            {client.email && (
                              <p
                                className="max-w-[14rem] truncate text-xs text-gray-500"
                                title={
                                  client.email
                                }
                              >
                                {
                                  client.email
                                }
                              </p>
                            )}

                          </div>

                        </Table.Cell>

                        {/* LOCATION */}

                        <Table.Cell>

                          {client.city ||
                          client.district ? (
                            <div className="text-sm">

                              <p className="text-gray-900 dark:text-white">
                                {client.city ||
                                  '-'}
                              </p>

                              {client.district && (
                                <p className="text-xs text-gray-500">
                                  {
                                    client.district
                                  }
                                </p>
                              )}

                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">
                              -
                            </span>
                          )}

                        </Table.Cell>

                        {/* CASE COUNT */}

                        <Table.Cell>

                          <Link
                            to={`/clients/${client.id}`}
                            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 dark:text-gray-300"
                          >
                            <FileText className="h-4 w-4" />

                            <span className="font-medium">
                              {Number(
                                client.case_count
                              ) || 0}
                            </span>
                          </Link>

                        </Table.Cell>

                        {/* STATUS */}

                        <Table.Cell>

                          <Badge
                            variant={getStatusVariant(
                              client.status
                            )}
                          >
                            {getStatusLabel(
                              client.status
                            )}
                          </Badge>

                        </Table.Cell>

                        {/* ACTION */}

                        <Table.Cell>

                          <Link
                            to={`/clients/${client.id}`}
                            className="whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Görüntüle
                          </Link>

                        </Table.Cell>

                      </Table.Row>
                    );
                  }
                )
              )}

            </Table.Body>

          </Table>

        </div>

        {/* ==================================================
            PAGINATION
        ================================================== */}

        {pagination &&
          pagination.totalPages >
            1 && (
            <div className="flex flex-col gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Toplam{' '}
                {
                  pagination.total
                }{' '}
                müvekkil
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
                      (current) =>
                        Math.max(
                          1,
                          current - 1
                        )
                    )
                  }
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />

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
                      (current) =>
                        Math.min(
                          pagination.totalPages,
                          current + 1
                        )
                    )
                  }
                >
                  Sonraki

                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>

              </div>

            </div>
          )}

      </div>

    </div>
  );
};

export default ClientsList;