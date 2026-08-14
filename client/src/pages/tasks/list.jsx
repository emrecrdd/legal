import {
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  useTasks,
} from '../../features/tasks/task.query.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  CheckCircle2,
  Clock3,
  Filter,
  Plus,
  Search,
} from 'lucide-react';

// ======================================================
// SABİTLER
// ======================================================

const STATUS_OPTIONS = [
  {
    value: '',
    label: 'Tümü',
  },
  {
    value: 'pending',
    label: 'Bekliyor',
  },
  {
    value: 'in_progress',
    label: 'Devam Ediyor',
  },
  {
    value: 'completed',
    label: 'Tamamlananlar',
  },
  {
    value: 'cancelled',
    label: 'İptal',
  },
];

const PRIORITY_OPTIONS = [
  {
    value: '',
    label: 'Tümü',
  },
  {
    value: 'low',
    label: 'Düşük',
  },
  {
    value: 'normal',
    label: 'Normal',
  },
  {
    value: 'high',
    label: 'Yüksek',
  },
  {
    value: 'critical',
    label: 'Kritik',
  },
];

const PRIORITY_LABELS = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
  critical: 'Kritik',
};

// ======================================================
// STATUS HELPERS
// ======================================================

const getTaskDisplayStatus = (task) => {
  if (
    task?.status === 'completed' &&
    !task?.approved_at
  ) {
    return {
      label: 'Onay Bekliyor',
      variant: 'warning',
    };
  }

  if (
    task?.status === 'completed' &&
    task?.approved_at
  ) {
    return {
      label: 'Tamamlandı',
      variant: 'success',
    };
  }

  switch (task?.status) {
    case 'pending':
      return {
        label: 'Bekliyor',
        variant: 'warning',
      };

    case 'in_progress':
      return {
        label: 'Devam Ediyor',
        variant: 'info',
      };

    case 'cancelled':
      return {
        label: 'İptal',
        variant: 'danger',
      };

    default:
      return {
        label:
          task?.status ||
          'Bilinmiyor',
        variant: 'default',
      };
  }
};

const getPriorityVariant = (
  priority
) => {
  switch (priority) {
    case 'critical':
      return 'danger';

    case 'high':
      return 'warning';

    case 'normal':
      return 'default';

    case 'low':
      return 'default';

    default:
      return 'default';
  }
};

// ======================================================
// DATE HELPERS
// ======================================================

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

// ======================================================
// USER HELPERS
// ======================================================

const getUserName = (
  person,
  fallback = 'Atanmadı'
) => {
  if (!person) {
    return fallback;
  }

  const fullName = [
    person.first_name,
    person.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    fullName ||
    fallback
  );
};

// ======================================================
// COMPONENT
// ======================================================

const TasksList = () => {
  const { user } =
    useAuth();

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    searchQuery,
    setSearchQuery,
  ] = useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('');

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState('');

  const [
    page,
    setPage,
  ] = useState(1);

  // ======================================================
  // PERMISSIONS
  // ======================================================

  const canCreateTask =
    [
      'admin',
      'lawyer',
      'secretary',
    ].includes(
      user?.role
    );

  const isAdmin =
    user?.role === 'admin';

  // ======================================================
  // QUERY
  // ======================================================

  const {
    data,
    isLoading,
    error,
  } = useTasks({
    page,
    search:
      searchQuery,
    status:
      statusFilter,
    priority:
      priorityFilter,
  });

  const tasks =
    data?.data?.data ||
    [];

  const pagination =
    data?.data
      ?.pagination;

  // ======================================================
  // DERIVED DATA
  // ======================================================

  const enrichedTasks =
    useMemo(() => {
      return tasks.map(
        (task) => {
          const displayStatus =
            getTaskDisplayStatus(
              task
            );

          const isOverdue =
            Boolean(
              task.due_date
            ) &&
            new Date(
              task.due_date
            ) <
              new Date() &&
            ![
              'completed',
              'cancelled',
            ].includes(
              task.status
            );

          return {
            ...task,
            displayStatus,
            isOverdue,
          };
        }
      );
    }, [tasks]);

  const awaitingApprovalCount =
    useMemo(() => {
      return enrichedTasks.filter(
        (task) =>
          task.status ===
            'completed' &&
          !task.approved_at
      ).length;
    }, [
      enrichedTasks,
    ]);

  // ======================================================
  // HANDLERS
  // ======================================================

  const handleSearch = () => {
    setSearchQuery(
      search.trim()
    );

    setPage(1);
  };

  const handleClearSearch =
    () => {
      setSearch('');
      setSearchQuery('');
      setPage(1);
    };

  const handleKeyDown = (
    event
  ) => {
    if (
      event.key ===
      'Enter'
    ) {
      handleSearch();
    }
  };

  const handleStatusChange = (
    event
  ) => {
    setStatusFilter(
      event.target.value
    );

    setPage(1);
  };

  const handlePriorityChange =
    (event) => {
      setPriorityFilter(
        event.target.value
      );

      setPage(1);
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

  if (error) {
    return (
      <div className="py-12 text-center">

        <div className="mb-4 text-4xl">
          ⚠️
        </div>

        <h2 className="text-xl font-bold text-red-600">
          Görevler yüklenirken hata oluştu
        </h2>

        <p className="mt-2 text-gray-500">
          {error.message}
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

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ✅ Görevler
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Atanan işleri, ilerleme durumlarını,
            son tarihleri ve yönetici onay süreçlerini takip edin.
          </p>

        </div>

        {canCreateTask && (
          <Link to="/tasks/create">

            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Görev
            </Button>

          </Link>
        )}

      </div>

      {/* ==================================================
          ADMIN APPROVAL NOTICE
      ================================================== */}

      {isAdmin &&
        awaitingApprovalCount >
          0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">

            <div className="flex items-start gap-3">

              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />

              <div>

                <p className="font-medium text-amber-900 dark:text-amber-200">
                  Yönetici onayı bekleyen görevler var
                </p>

                <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                  Bu sayfada şu anda{' '}
                  <strong>
                    {
                      awaitingApprovalCount
                    }
                  </strong>{' '}
                  görev çalışan tarafından tamamlanmış ve
                  yönetici incelemesi bekliyor.
                </p>

              </div>

            </div>

          </div>
        )}

      {/* ==================================================
          FILTERS
      ================================================== */}

      <div className="overflow-hidden rounded-xl bg-white shadow dark:bg-gray-800">

        <div className="border-b border-gray-200 p-4 dark:border-gray-700">

          <div className="flex flex-col gap-4 xl:flex-row">

            {/* SEARCH */}

            <div className="flex flex-1 gap-2">

              <div className="flex-1">

                <Input
                  placeholder="Görev ara..."
                  value={
                    search
                  }
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                  onKeyDown={
                    handleKeyDown
                  }
                  icon="🔍"
                />

              </div>

              <Button
                variant="primary"
                onClick={
                  handleSearch
                }
                className="shrink-0"
              >
                <Search className="mr-2 h-4 w-4" />
                Ara
              </Button>

              {(search ||
                searchQuery) && (
                <Button
                  variant="outline"
                  onClick={
                    handleClearSearch
                  }
                  className="shrink-0"
                >
                  Temizle
                </Button>
              )}

            </div>

            {/* FILTERS */}

            <div className="flex flex-col gap-3 sm:flex-row">

              <div className="flex items-center gap-2 sm:w-48">

                <Filter className="h-4 w-4 shrink-0 text-gray-400" />

                <select
                  value={
                    statusFilter
                  }
                  onChange={
                    handleStatusChange
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                        Durum:{' '}
                        {
                          status.label
                        }
                      </option>
                    )
                  )}
                </select>

              </div>

              <div className="sm:w-48">

                <select
                  value={
                    priorityFilter
                  }
                  onChange={
                    handlePriorityChange
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  {PRIORITY_OPTIONS.map(
                    (
                      priority
                    ) => (
                      <option
                        key={
                          priority.value
                        }
                        value={
                          priority.value
                        }
                      >
                        Öncelik:{' '}
                        {
                          priority.label
                        }
                      </option>
                    )
                  )}
                </select>

              </div>

            </div>

          </div>
        </div>

        {/* ==================================================
            TABLE
        ================================================== */}

        <div className="overflow-x-auto">

          <Table>

            <Table.Head>

              <Table.Row>

                <Table.HeadCell>
                  Görev
                </Table.HeadCell>

                <Table.HeadCell>
                  Atanan
                </Table.HeadCell>

                <Table.HeadCell>
                  Dava
                </Table.HeadCell>

                <Table.HeadCell>
                  Öncelik
                </Table.HeadCell>

                <Table.HeadCell>
                  Durum
                </Table.HeadCell>

                <Table.HeadCell>
                  İlerleme
                </Table.HeadCell>

                <Table.HeadCell>
                  Son Tarih
                </Table.HeadCell>

                <Table.HeadCell>
                  İşlem
                </Table.HeadCell>

              </Table.Row>

            </Table.Head>

            <Table.Body>

              {enrichedTasks.length ===
              0 ? (
                <Table.Row>

                  <Table.Cell
                    colSpan="8"
                    className="py-10 text-center text-gray-500"
                  >
                    {searchQuery
                      ? 'Aramanıza uygun görev bulunamadı'
                      : 'Henüz görev bulunmuyor'}
                  </Table.Cell>

                </Table.Row>
              ) : (
                enrichedTasks.map(
                  (task) => (
                    <Table.Row
                      key={
                        task.id
                      }
                    >

                      {/* TASK */}

                      <Table.Cell>

                        <div className="min-w-[16rem]">

                          <Link
                            to={`/tasks/${task.id}`}
                            className="font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                          >
                            {
                              task.title
                            }
                          </Link>

                          {task.description && (
                            <div className="mt-1 max-w-sm truncate text-sm text-gray-500">
                              {
                                task.description
                              }
                            </div>
                          )}

                          <div className="mt-2 flex flex-wrap gap-1">

                            {task.isOverdue && (
                              <Badge variant="danger">
                                ⚠️ Gecikti
                              </Badge>
                            )}

                            {task.approved_at && (
                              <Badge variant="success">
                                ✅ Onaylandı
                              </Badge>
                            )}

                          </div>

                        </div>

                      </Table.Cell>

                      {/* ASSIGNEE */}

                      <Table.Cell>

                        <span className="whitespace-nowrap">
                          {getUserName(
                            task.assignee
                          )}
                        </span>

                      </Table.Cell>

                      {/* CASE */}

                      <Table.Cell>

                        {task.case ? (
                          <Link
                            to={`/cases/${task.case.id}`}
                            className="block max-w-[14rem] truncate text-blue-600 hover:underline dark:text-blue-400"
                            title={
                              task.case
                                .title
                            }
                          >
                            {
                              task.case
                                .title
                            }
                          </Link>
                        ) : (
                          <span className="text-gray-400">
                            -
                          </span>
                        )}

                      </Table.Cell>

                      {/* PRIORITY */}

                      <Table.Cell>

                        <Badge
                          variant={getPriorityVariant(
                            task.priority
                          )}
                        >
                          {PRIORITY_LABELS[
                            task.priority
                          ] ||
                            task.priority}
                        </Badge>

                      </Table.Cell>

                      {/* STATUS */}

                      <Table.Cell>

                        <Badge
                          variant={
                            task
                              .displayStatus
                              .variant
                          }
                        >
                          {
                            task
                              .displayStatus
                              .label
                          }
                        </Badge>

                      </Table.Cell>

                      {/* PROGRESS */}

                      <Table.Cell>

                        <div className="min-w-[7rem]">

                          <div className="mb-1 flex items-center justify-between text-xs text-gray-500">

                            <span>
                              İlerleme
                            </span>

                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {task.progress ||
                                0}
                              %
                            </span>

                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">

                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    task.progress ||
                                      0
                                  )
                                )}%`,
                              }}
                            />

                          </div>

                        </div>

                      </Table.Cell>

                      {/* DUE DATE */}

                      <Table.Cell>

                        <div className="whitespace-nowrap">

                          <span
                            className={
                              task.isOverdue
                                ? 'font-medium text-red-600'
                                : ''
                            }
                          >
                            {task.due_date
                              ? formatDateTime(
                                  task.due_date
                                )
                              : '-'}
                          </span>

                        </div>

                      </Table.Cell>

                      {/* ACTION */}

                      <Table.Cell>

                        <Link
                          to={`/tasks/${task.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Görüntüle
                        </Link>

                      </Table.Cell>

                    </Table.Row>
                  )
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
                görev
              </p>

              <div className="flex items-center gap-2">

                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    page <= 1
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
                    pagination.totalPages
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
                </Button>

              </div>

            </div>
          )}

      </div>

    </div>
  );
};

export default TasksList;