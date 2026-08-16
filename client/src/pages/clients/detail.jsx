import {
  useMemo,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  useQuery,
} from '@tanstack/react-query';

import {
  useClient,
  useClientCaseHistory,
  useClientPayments,
} from '../../features/clients/client.query.js';

import {
  useClientTaskOverview,
} from '../../features/tasks/task.query.js';

import {
  useClientMeetingTimeline,
} from '../../features/meetings/meeting.query.js';

import documentApi from '../../features/documents/document.api.js';

import {
  powerOfAttorneyApi,
} from '../../features/power-of-attorney/powerOfAttorney.api.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import Badge from '../../components/ui/Badge.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';

import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit2,
  FileText,
  ListTodo,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Scale,
  ShieldCheck,
  User,
  UserCog,
  WalletCards,
} from 'lucide-react';

// ======================================================
// HELPERS
// ======================================================

const formatDate = (
  value
) => {
  if (!value) {
    return '-';
  }

  try {
    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '-';
    }

    return new Intl.DateTimeFormat(
      'tr-TR',
      {
        timeZone:
          'Europe/Istanbul',

        day:
          '2-digit',

        month:
          '2-digit',

        year:
          'numeric',
      }
    ).format(date);
  } catch {
    return '-';
  }
};

const formatDateTime = (
  value
) => {
  if (!value) {
    return '-';
  }

  try {
    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '-';
    }

    return new Intl.DateTimeFormat(
      'tr-TR',
      {
        timeZone:
          'Europe/Istanbul',

        day:
          '2-digit',

        month:
          '2-digit',

        year:
          'numeric',

        hour:
          '2-digit',

        minute:
          '2-digit',

        hour12:
          false,
      }
    ).format(date);
  } catch {
    return '-';
  }
};

const formatMoney = (
  value
) => {
  const amount =
    Number(value) || 0;

  return new Intl.NumberFormat(
    'tr-TR',
    {
      style:
        'currency',

      currency:
        'TRY',

      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  ).format(amount);
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

  const index =
    Math.min(
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
      .trim() ||
    '-'
  );
};

const normalizePhone = (
  value
) => {
  return String(
    value || ''
  ).replace(
    /\D/g,
    ''
  );
};

// ======================================================
// CLIENT STATUS
// ======================================================

const getClientStatusLabel = (
  status
) => {
  const labels = {
    active:
      'Aktif',

    passive:
      'Pasif',

    archived:
      'Arşiv',
  };

  return (
    labels[status] ||
    status ||
    '-'
  );
};

const getClientStatusVariant = (
  status
) => {
  switch (status) {
    case 'active':
      return 'success';

    case 'passive':
      return 'warning';

    default:
      return 'default';
  }
};

// ======================================================
// CASE STATUS
// ======================================================

const getCaseStatusLabel = (
  status
) => {
  const labels = {
    active:
      'Devam Ediyor',

    preparation:
      'Hazırlık',

    hearing:
      'Duruşmada',

    appeal:
      'İstinaf',

    cassation:
      'Temyiz',

    concluded:
      'Sonuçlandı',

    archived:
      'Arşivlendi',
  };

  return (
    labels[status] ||
    status ||
    '-'
  );
};

const getCaseStatusVariant = (
  status
) => {
  switch (status) {
    case 'active':
      return 'success';

    case 'preparation':
      return 'warning';

    case 'hearing':
      return 'info';

    case 'appeal':
      return 'warning';

    case 'archived':
      return 'danger';

    default:
      return 'default';
  }
};

// ======================================================
// POA STATUS
// ======================================================

const getPOAStatusLabel = (
  status
) => {
  const labels = {
    active:
      'Aktif',

    expired:
      'Süresi Doldu',

    cancelled:
      'İptal',
  };

  return (
    labels[status] ||
    status ||
    '-'
  );
};

const getPOAStatusVariant = (
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

// ======================================================
// TASK STATUS
// ======================================================

const getTaskStatusLabel = (
  status
) => {
  const labels = {
    pending:
      'Bekliyor',

    in_progress:
      'Devam Ediyor',

    completed:
      'Tamamlandı',

    cancelled:
      'İptal',
  };

  return (
    labels[status] ||
    status ||
    '-'
  );
};

const getTaskStatusVariant = (
  status
) => {
  switch (status) {
    case 'pending':
      return 'warning';

    case 'in_progress':
      return 'info';

    case 'completed':
      return 'success';

    case 'cancelled':
      return 'danger';

    default:
      return 'default';
  }
};

// ======================================================
// MEETING STATUS
// ======================================================

const getMeetingStatusLabel = (
  status
) => {
  const labels = {
    scheduled:
      'Planlandı',

    ongoing:
      'Devam Ediyor',

    completed:
      'Tamamlandı',

    cancelled:
      'İptal',
  };

  return (
    labels[status] ||
    status ||
    '-'
  );
};

const getMeetingStatusVariant = (
  status
) => {
  switch (status) {
    case 'scheduled':
      return 'info';

    case 'ongoing':
      return 'warning';

    case 'completed':
      return 'success';

    case 'cancelled':
      return 'danger';

    default:
      return 'default';
  }
};

// ======================================================
// COMPONENT
// ======================================================

const ClientDetail = () => {
  const {
    id,
  } =
    useParams();

  const {
    user,
  } =
    useAuth();

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

  const canCreatePOA =
    canEdit;

  const canCreateTask =
    canEdit;

  const canCreateMeeting =
    canEdit;

  const canUploadDocument =
    canEdit;

  // ======================================================
  // CLIENT
  // ======================================================

  const {
    data,
    isLoading,
    error,
  } =
    useClient(
      id
    );

  // ======================================================
  // CASES
  //
  // Ana client endpoint'inden ayrıldı.
  // ======================================================

  const {
    data:
      casesData,

    isLoading:
      casesLoading,

    error:
      casesError,
  } =
    useClientCaseHistory(
      id
    );

  // ======================================================
  // PAYMENTS
  //
  // Ana client endpoint'inden ayrıldı.
  // ======================================================

  const {
    data:
      paymentsData,

    isLoading:
      paymentsLoading,

    error:
      paymentsError,
  } =
    useClientPayments(
      id
    );

  // ======================================================
  // TASK COCKPIT
  // ======================================================

  const {
    data:
      taskOverviewData,

    isLoading:
      tasksLoading,

    error:
      tasksError,
  } =
    useClientTaskOverview(
      id,
      {
        active_limit:
          5,

        recent_limit:
          5,
      }
    );

  // ======================================================
  // MEETING COCKPIT
  // ======================================================

  const {
    data:
      meetingTimelineData,

    isLoading:
      meetingsLoading,

    error:
      meetingsError,
  } =
    useClientMeetingTimeline(
      id,
      {
        upcoming_limit:
          5,

        recent_limit:
          5,
      }
    );

  // ======================================================
  // DOCUMENTS
  // ======================================================

  const {
    data:
      documentsData,

    isLoading:
      documentsLoading,

    error:
      documentsError,
  } =
    useQuery({
      queryKey: [
        'client-documents',
        id,
      ],

      queryFn: () =>
        documentApi.getAll({
          client_id:
            id,

          page:
            1,

          limit:
            5,
        }),

      enabled:
        Boolean(id),

      staleTime:
        2 * 60 * 1000,
    });

  // ======================================================
  // POWER OF ATTORNEYS
  // ======================================================

  const {
    data:
      poaData,

    isLoading:
      poaLoading,

    error:
      poaError,
  } =
    useQuery({
      queryKey: [
        'powerOfAttorneys',
        'client',
        id,
      ],

      queryFn: () =>
        powerOfAttorneyApi.getByClient(
          id
        ),

      enabled:
        Boolean(id),

      staleTime:
        5 * 60 * 1000,
    });

  // ======================================================
  // NORMALIZE DATA
  // ======================================================

  const client =
    data?.data?.data ??
    data?.data ??
    null;

  const cases =
    Array.isArray(
      casesData?.data?.data
    )
      ? casesData.data.data
      : Array.isArray(
          casesData?.data
        )
      ? casesData.data
      : [];

  const payments =
    Array.isArray(
      paymentsData?.data?.data
    )
      ? paymentsData.data.data
      : Array.isArray(
          paymentsData?.data
        )
      ? paymentsData.data
      : [];

  const powerOfAttorneys =
    Array.isArray(
      poaData?.data?.data
    )
      ? poaData.data.data
      : [];

  const documents =
    Array.isArray(
      documentsData?.data?.data
    )
      ? documentsData.data.data
      : [];

  const documentPagination =
    documentsData?.data
      ?.pagination;

  const taskOverview =
    taskOverviewData
      ?.data?.data ??
    taskOverviewData
      ?.data ??
    null;

  const activeTasks =
    Array.isArray(
      taskOverview?.active
    )
      ? taskOverview.active
      : [];

  const taskSummary =
    taskOverview?.summary || {
      total:
        0,

      pending:
        0,

      in_progress:
        0,

      completed:
        0,

      overdue:
        0,
    };

  const meetingTimeline =
    meetingTimelineData
      ?.data?.data ??
    meetingTimelineData
      ?.data ??
    null;

  const upcomingMeetings =
    Array.isArray(
      meetingTimeline
        ?.upcoming
    )
      ? meetingTimeline
          .upcoming
      : [];

  // ======================================================
  // FINANCE
  //
  // Payment kayıtlarını esas alıyoruz.
  // ======================================================

  const financialSummary =
    useMemo(() => {
      let agreed =
        0;

      let received =
        0;

      let refunded =
        0;

      let expense =
        0;

      payments.forEach(
        (
          payment
        ) => {
          const amount =
            Number(
              payment?.amount
            ) || 0;

          if (
            payment
              ?.payment_type ===
            'agreed'
          ) {
            agreed +=
              amount;

            return;
          }

          if (
            payment
              ?.payment_type ===
              'received' &&
            payment?.status ===
              'completed'
          ) {
            received +=
              amount;

            return;
          }

          if (
            payment
              ?.payment_type ===
              'refund' ||
            payment?.status ===
              'refund'
          ) {
            refunded +=
              amount;

            return;
          }

          if (
            payment
              ?.payment_type ===
            'expense'
          ) {
            expense +=
              amount;
          }
        }
      );

      const netReceived =
        Math.max(
          received -
            refunded,
          0
        );

      const remaining =
        Math.max(
          agreed -
            netReceived,
          0
        );

      return {
        agreed,

        received:
          netReceived,

        refunded,

        expense,

        remaining,
      };
    }, [
      payments,
    ]);

  // ======================================================
  // CONTACT
  // ======================================================

  const phone =
    client?.phone ||
    '';

  const email =
    client?.email ||
    '';

  const normalizedPhone =
    normalizePhone(
      phone
    );

  const whatsappMessage =
    encodeURIComponent(
      `Merhaba ${client?.name || ''},`
    );

  const whatsappUrl =
    normalizedPhone
      ? `https://wa.me/${normalizedPhone}?text=${whatsappMessage}`
      : null;

  const telUrl =
    phone
      ? `tel:${phone}`
      : null;

  const mailUrl =
    email
      ? `mailto:${email}`
      : null;

  // ======================================================
  // LOADING
  // ======================================================

  if (
    isLoading
  ) {
    return (
      <div className="flex h-96 items-center justify-center">

        <div className="text-center">

          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600" />

          <p className="mt-4 text-sm text-gray-500">
            Müvekkil bilgileri yükleniyor...
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
    !client
  ) {
    return (
      <div className="py-20 text-center">

        <div className="mb-4 text-6xl">
          🔍
        </div>

        <h2 className="text-xl font-semibold text-red-600">
          Müvekkil bulunamadı
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {error?.response
            ?.data?.message ||
            error?.message ||
            'Müvekkil bilgileri yüklenemedi'}
        </p>

        <Link
          to="/clients"
          className="mt-4 inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />

          Müvekkillere Dön
        </Link>

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

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

          <div className="min-w-0 flex-1">

            <Link
              to="/clients"
              className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowLeft className="h-4 w-4" />

              Müvekkillere Dön
            </Link>

            <div className="mt-4 flex flex-wrap items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">

                {client.client_type ===
                'corporate' ? (
                  <Building2 className="h-6 w-6 text-blue-600" />
                ) : (
                  <User className="h-6 w-6 text-blue-600" />
                )}

              </div>

              <div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {client.name}
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  {client.client_type ===
                  'corporate'
                    ? 'Kurumsal Müvekkil'
                    : 'Bireysel Müvekkil'}
                </p>

              </div>

              <Badge
                variant={getClientStatusVariant(
                  client.status
                )}
              >
                {getClientStatusLabel(
                  client.status
                )}
              </Badge>

            </div>

          </div>

          <div className="flex flex-wrap gap-2">

            {canUploadDocument && (
              <Link
                to={`/documents/upload?client=${client.id}`}
              >
                <Button
                  variant="outline"
                  size="sm"
                >
                  <FileText className="mr-2 h-4 w-4" />

                  Belge Yükle
                </Button>
              </Link>
            )}

            {canCreateTask && (
              <Link
                to={`/tasks/create?client_id=${client.id}`}
              >
                <Button
                  variant="outline"
                  size="sm"
                >
                  <ListTodo className="mr-2 h-4 w-4" />

                  Görev Ekle
                </Button>
              </Link>
            )}

            {canCreateMeeting && (
              <Link
                to={`/meetings/create?client_id=${client.id}`}
              >
                <Button
                  variant="outline"
                  size="sm"
                >
                  <CalendarDays className="mr-2 h-4 w-4" />

                  Toplantı Ekle
                </Button>
              </Link>
            )}

            {canEdit && (
              <Link
                to={`/clients/${client.id}/edit`}
              >
                <Button
                  variant="secondary"
                  size="sm"
                >
                  <Edit2 className="mr-2 h-4 w-4" />

                  Düzenle
                </Button>
              </Link>
            )}

          </div>

        </div>

        {/* CONTACT */}

        <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">

          {telUrl && (
            <a
              href={
                telUrl
              }
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <Phone className="h-4 w-4" />

              Ara
            </a>
          )}

          {whatsappUrl && (
            <a
              href={
                whatsappUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <MessageCircle className="h-4 w-4" />

              WhatsApp
            </a>
          )}

          {mailUrl && (
            <a
              href={
                mailUrl
              }
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <Mail className="h-4 w-4" />

              E-posta
            </a>
          )}

          {!telUrl &&
            !mailUrl && (
              <span className="text-sm text-gray-400">
                İletişim bilgisi bulunmuyor
              </span>
            )}

        </div>

      </div>

      {/* ==================================================
          COCKPIT SUMMARY
      ================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Briefcase className="h-4 w-4" />
            Davalar
          </div>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {casesLoading
              ? '...'
              : cases.length}
          </p>

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ListTodo className="h-4 w-4" />
            Aktif Görev
          </div>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {(Number(
              taskSummary.pending
            ) || 0) +
              (Number(
                taskSummary.in_progress
              ) || 0)}
          </p>

          {Number(
            taskSummary.overdue
          ) > 0 && (
            <p className="mt-1 text-xs font-medium text-red-600">
              {taskSummary.overdue} gecikmiş
            </p>
          )}

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CalendarDays className="h-4 w-4" />
            Yaklaşan Toplantı
          </div>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {upcomingMeetings.length}
          </p>

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FileText className="h-4 w-4" />
            Belgeler
          </div>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {documentPagination?.total ??
              documents.length}
          </p>

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <WalletCards className="h-4 w-4" />
            Tahsilat
          </div>

          <p className="mt-2 text-lg font-bold text-green-600">
            {paymentsLoading
              ? '...'
              : formatMoney(
                  financialSummary.received
                )}
          </p>

        </div>

      </div>

      {/* ==================================================
          ALERTS
      ================================================== */}

      {(Number(
        taskSummary.overdue
      ) > 0 ||
        upcomingMeetings.length >
          0) && (
        <div className="grid gap-4 md:grid-cols-2">

          {Number(
            taskSummary.overdue
          ) > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/10">

              <div className="flex items-start gap-3">

                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                <div>

                  <p className="font-semibold text-red-900 dark:text-red-300">
                    Gecikmiş görev bulunuyor
                  </p>

                  <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                    Bu müvekkile bağlı {taskSummary.overdue} görev son teslim tarihini geçti.
                  </p>

                </div>

              </div>

            </div>
          )}

          {upcomingMeetings.length >
            0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/10">

              <div className="flex items-start gap-3">

                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                <div>

                  <p className="font-semibold text-blue-900 dark:text-blue-300">
                    Yaklaşan toplantı
                  </p>

                  <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                    İlk toplantı:{' '}
                    {formatDateTime(
                      upcomingMeetings[0]?.start_date
                    )}
                  </p>

                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* ==================================================
          TASKS + MEETINGS
      ================================================== */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* TASKS */}

        <Card>

          <Card.Header>

            <div className="flex items-center justify-between gap-3">

              <div className="flex items-center gap-2">

                <ListTodo className="h-5 w-5 text-blue-600" />

                <div>

                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Aktif Görevler
                  </h2>

                  <p className="text-xs text-gray-500">
                    Öncelikli ve açık görevler
                  </p>

                </div>

              </div>

              <Badge variant="default">
                {taskSummary.total || 0} toplam
              </Badge>

            </div>

          </Card.Header>

          <Card.Body>

            {tasksLoading ? (
              <div className="py-8 text-center text-sm text-gray-500">
                Görevler yükleniyor...
              </div>
            ) : tasksError ? (
              <div className="py-8 text-center text-sm text-red-500">
                Görevler yüklenemedi.
              </div>
            ) : activeTasks.length ===
              0 ? (
              <div className="py-10 text-center">

                <CheckCircle2 className="mx-auto h-9 w-9 text-gray-300" />

                <p className="mt-2 text-sm text-gray-400">
                  Aktif görev bulunmuyor.
                </p>

              </div>
            ) : (
              <div className="space-y-3">

                {activeTasks.map(
                  (
                    task
                  ) => (
                    <Link
                      key={
                        task.id
                      }
                      to={`/tasks/${task.id}`}
                      className="block rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <p className="truncate font-semibold text-gray-900 dark:text-white">
                            {
                              task.title
                            }
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Son tarih:{' '}
                            {formatDateTime(
                              task.due_date
                            )}
                          </p>

                          {task.assignee && (
                            <p className="mt-1 text-xs text-gray-500">
                              Atanan:{' '}
                              {getPersonName(
                                task.assignee
                              )}
                            </p>
                          )}

                        </div>

                        <Badge
                          variant={getTaskStatusVariant(
                            task.status
                          )}
                        >
                          {getTaskStatusLabel(
                            task.status
                          )}
                        </Badge>

                      </div>

                    </Link>
                  )
                )}

              </div>
            )}

          </Card.Body>

        </Card>

        {/* MEETINGS */}

        <Card>

          <Card.Header>

            <div className="flex items-center justify-between gap-3">

              <div className="flex items-center gap-2">

                <CalendarDays className="h-5 w-5 text-blue-600" />

                <div>

                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Yaklaşan Toplantılar
                  </h2>

                  <p className="text-xs text-gray-500">
                    Müvekkil ile planlanan görüşmeler
                  </p>

                </div>

              </div>

              <Badge variant="default">
                {upcomingMeetings.length} yaklaşan
              </Badge>

            </div>

          </Card.Header>

          <Card.Body>

            {meetingsLoading ? (
              <div className="py-8 text-center text-sm text-gray-500">
                Toplantılar yükleniyor...
              </div>
            ) : meetingsError ? (
              <div className="py-8 text-center text-sm text-red-500">
                Toplantılar yüklenemedi.
              </div>
            ) : upcomingMeetings.length ===
              0 ? (
              <div className="py-10 text-center">

                <CalendarDays className="mx-auto h-9 w-9 text-gray-300" />

                <p className="mt-2 text-sm text-gray-400">
                  Yaklaşan toplantı bulunmuyor.
                </p>

              </div>
            ) : (
              <div className="space-y-3">

                {upcomingMeetings.map(
                  (
                    meeting
                  ) => (
                    <Link
                      key={
                        meeting.id
                      }
                      to={`/meetings/${meeting.id}`}
                      className="block rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <p className="truncate font-semibold text-gray-900 dark:text-white">
                            {
                              meeting.title
                            }
                          </p>

                          <p className="mt-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                            {formatDateTime(
                              meeting.start_date
                            )}
                          </p>

                          {meeting.location && (
                            <p className="mt-1 text-xs text-gray-500">
                              {
                                meeting.location
                              }
                            </p>
                          )}

                        </div>

                        <Badge
                          variant={getMeetingStatusVariant(
                            meeting.status
                          )}
                        >
                          {getMeetingStatusLabel(
                            meeting.status
                          )}
                        </Badge>

                      </div>

                    </Link>
                  )
                )}

              </div>
            )}

          </Card.Body>

        </Card>

      </div>

      {/* ==================================================
          DOCUMENTS
      ================================================== */}

      <Card>

        <Card.Header>

          <div className="flex flex-wrap items-center justify-between gap-3">

            <div className="flex items-center gap-2">

              <FileText className="h-5 w-5 text-blue-600" />

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Son Belgeler
                </h2>

                <p className="text-xs text-gray-500">
                  Müvekkile doğrudan bağlı son belge kayıtları
                </p>

              </div>

            </div>

            <div className="flex items-center gap-2">

              <Badge variant="default">
                {documentPagination?.total ??
                  documents.length}{' '}
                belge
              </Badge>

              {canUploadDocument && (
                <Link
                  to={`/documents/upload?client=${client.id}`}
                >
                  <Button
                    size="sm"
                    variant="outline"
                  >
                    Belge Yükle
                  </Button>
                </Link>
              )}

            </div>

          </div>

        </Card.Header>

        <Card.Body>

          {documentsLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Belgeler yükleniyor...
            </div>
          ) : documentsError ? (
            <div className="py-8 text-center text-sm text-red-500">
              Belgeler yüklenemedi.
            </div>
          ) : documents.length ===
            0 ? (
            <div className="py-10 text-center">

              <FileText className="mx-auto h-10 w-10 text-gray-300" />

              <p className="mt-2 text-sm text-gray-400">
                Müvekkile bağlı belge bulunmuyor.
              </p>

            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">

              {documents.map(
                (
                  documentItem
                ) => (
                  <Link
                    key={
                      documentItem.id
                    }
                    to={`/documents/${documentItem.id}`}
                    className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >

                    <div className="min-w-0">

                      <p className="truncate font-medium text-gray-900 hover:text-blue-600 dark:text-white">
                        {
                          documentItem.name
                        }
                      </p>

                      <p className="mt-1 truncate text-xs text-gray-500">
                        {
                          documentItem.original_name
                        }
                      </p>

                    </div>

                    <div className="shrink-0 text-right">

                      <p className="text-xs text-gray-500">
                        {formatFileSize(
                          documentItem.file_size
                        )}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        {formatDate(
                          documentItem.created_at
                        )}
                      </p>

                    </div>

                  </Link>
                )
              )}

            </div>
          )}

        </Card.Body>

      </Card>

      {/* ==================================================
          INFO + FINANCE
      ================================================== */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* CLIENT INFO */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-2">

              <User className="h-5 w-5 text-blue-600" />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Müvekkil Bilgileri
              </h2>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <div>

                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Ad Soyad / Unvan
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {client.name ||
                    '-'}
                </p>

              </div>

              <div>

                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  TCKNO / VKN
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {client.identification_number ||
                    '-'}
                </p>

              </div>

              <div>

                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Telefon
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {client.phone ||
                    '-'}
                </p>

              </div>

              <div>

                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  E-posta
                </p>

                <p className="mt-1 break-all font-medium text-gray-900 dark:text-white">
                  {client.email ||
                    '-'}
                </p>

              </div>

              <div>

                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Şehir
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {client.city ||
                    '-'}
                </p>

              </div>

              <div>

                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  İlçe
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {client.district ||
                    '-'}
                </p>

              </div>

            </div>

            <div>

              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Adres
              </p>

              <div className="mt-1 flex items-start gap-2">

                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />

                <p className="font-medium leading-6 text-gray-900 dark:text-white">
                  {client.address ||
                    '-'}
                </p>

              </div>

            </div>

            {client.notes && (
              <div>

                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Genel Not
                </p>

                <div className="mt-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">

                  <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300">
                    {
                      client.notes
                    }
                  </p>

                </div>

              </div>
            )}

            {Array.isArray(
              client.tags
            ) &&
              client.tags.length >
                0 && (
                <div>

                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    Etiketler
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">

                    {client.tags.map(
                      (
                        tag
                      ) => (
                        <Badge
                          key={
                            tag
                          }
                          variant="default"
                        >
                          #{tag}
                        </Badge>
                      )
                    )}

                  </div>

                </div>
              )}

            {client.creator && (
              <div className="border-t border-gray-100 pt-4 dark:border-gray-700">

                <p className="text-xs text-gray-400">
                  Kaydı oluşturan
                </p>

                <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {getPersonName(
                    client.creator
                  )}
                </p>

              </div>
            )}

          </Card.Body>

        </Card>

        {/* FINANCE */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-2">

              <WalletCards className="h-5 w-5 text-green-600" />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Finansal Özet
              </h2>

            </div>

          </Card.Header>

          <Card.Body>

            {paymentsLoading ? (
              <div className="py-10 text-center text-sm text-gray-500">
                Finansal bilgiler yükleniyor...
              </div>
            ) : paymentsError ? (
              <div className="py-10 text-center">

                <WalletCards className="mx-auto h-8 w-8 text-red-300" />

                <p className="mt-2 text-sm text-red-500">
                  Finansal bilgiler yüklenemedi.
                </p>

              </div>
            ) : (
              <>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                  <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">

                    <p className="text-xs text-gray-400">
                      Anlaşılan
                    </p>

                    <p className="mt-2 font-bold text-gray-900 dark:text-white">
                      {formatMoney(
                        financialSummary.agreed
                      )}
                    </p>

                  </div>

                  <div className="rounded-xl bg-green-50 p-3 dark:bg-green-900/20">

                    <p className="text-xs text-green-600">
                      Tahsil Edilen
                    </p>

                    <p className="mt-2 font-bold text-green-700 dark:text-green-300">
                      {formatMoney(
                        financialSummary.received
                      )}
                    </p>

                  </div>

                  <div className="rounded-xl bg-red-50 p-3 dark:bg-red-900/20">

                    <p className="text-xs text-red-500">
                      Kalan
                    </p>

                    <p className="mt-2 font-bold text-red-600">
                      {formatMoney(
                        financialSummary.remaining
                      )}
                    </p>

                  </div>

                  <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">

                    <p className="text-xs text-gray-400">
                      Masraf
                    </p>

                    <p className="mt-2 font-bold text-gray-900 dark:text-white">
                      {formatMoney(
                        financialSummary.expense
                      )}
                    </p>

                  </div>

                </div>

                {payments.length >
                0 ? (
                  <div className="mt-6">

                    <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Son Finansal Hareketler
                    </h3>

                    <div className="space-y-2">

                      {payments
                        .slice(
                          0,
                          5
                        )
                        .map(
                          (
                            payment
                          ) => (
                            <div
                              key={
                                payment.id
                              }
                              className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-700"
                            >

                              <div>

                                <p className="font-medium text-gray-900 dark:text-white">
                                  {formatMoney(
                                    payment.amount
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                  {payment.description ||
                                    payment.payment_type ||
                                    'Finansal hareket'}
                                </p>

                              </div>

                              <div className="text-right">

                                <Badge
                                  variant={
                                    payment.status ===
                                    'completed'
                                      ? 'success'
                                      : payment.status ===
                                        'cancelled'
                                      ? 'danger'
                                      : 'warning'
                                  }
                                >
                                  {payment.status ||
                                    '-'}
                                </Badge>

                                <p className="mt-1 text-xs text-gray-400">
                                  {formatDate(
                                    payment.payment_date
                                  )}
                                </p>

                              </div>

                            </div>
                          )
                        )}

                    </div>

                  </div>
                ) : (
                  <div className="py-10 text-center">

                    <WalletCards className="mx-auto h-8 w-8 text-gray-300" />

                    <p className="mt-2 text-sm text-gray-400">
                      Henüz finansal hareket bulunmuyor.
                    </p>

                  </div>
                )}

              </>
            )}

          </Card.Body>

        </Card>

      </div>

      {/* ==================================================
          POWER OF ATTORNEYS
      ================================================== */}

      <Card>

        <Card.Header>

          <div className="flex flex-wrap items-center justify-between gap-3">

            <div className="flex items-center gap-2">

              <Scale className="h-5 w-5 text-blue-600" />

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Vekâletnameler
                </h2>

                <p className="text-xs text-gray-500">
                  Müvekkile ait vekâletname kayıtları
                </p>

              </div>

            </div>

            <div className="flex items-center gap-2">

              <Badge variant="default">
                {powerOfAttorneys.length} kayıt
              </Badge>

              {canCreatePOA && (
                <Link
                  to={`/power-of-attorney/create?client_id=${client.id}`}
                >
                  <Button size="sm">
                    + Yeni Vekâletname
                  </Button>
                </Link>
              )}

            </div>

          </div>

        </Card.Header>

        <Card.Body>

          {poaLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Vekâletnameler yükleniyor...
            </div>
          ) : poaError ? (
            <div className="py-8 text-center text-sm text-red-500">
              Vekâletnameler yüklenemedi.
            </div>
          ) : powerOfAttorneys.length ===
            0 ? (
            <div className="py-8 text-center">

              <FileText className="mx-auto h-10 w-10 text-gray-300" />

              <p className="mt-2 text-gray-400">
                Henüz vekâletname bulunmuyor.
              </p>

            </div>
          ) : (
            <div className="space-y-3">

              {powerOfAttorneys.map(
                (
                  poa
                ) => (
                  <Link
                    key={
                      poa.id
                    }
                    to={`/power-of-attorney/${poa.id}`}
                    className="block rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <p className="font-semibold text-gray-900 dark:text-white">
                          {
                            poa.title
                          }
                        </p>

                        {poa.case && (
                          <p className="mt-1 text-sm text-gray-500">
                            {
                              poa.case.title
                            }
                          </p>
                        )}

                        <p className="mt-2 text-xs text-gray-400">

                          {poa.start_date
                            ? `Başlangıç: ${formatDate(
                                poa.start_date
                              )}`
                            : ''}

                          {poa.end_date
                            ? ` · Bitiş: ${formatDate(
                                poa.end_date
                              )}`
                            : ''}

                        </p>

                      </div>

                      <Badge
                        variant={getPOAStatusVariant(
                          poa.status
                        )}
                      >
                        {getPOAStatusLabel(
                          poa.status
                        )}
                      </Badge>

                    </div>

                  </Link>
                )
              )}

            </div>
          )}

        </Card.Body>

      </Card>

      {/* ==================================================
          CASES
      ================================================== */}

      <Card>

        <Card.Header>

          <div className="flex items-center justify-between gap-3">

            <div className="flex items-center gap-2">

              <Briefcase className="h-5 w-5 text-blue-600" />

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Davalar
                </h2>

                <p className="text-xs text-gray-500">
                  Müvekkile bağlı dava kayıtları
                </p>

              </div>

            </div>

            <Badge variant="default">
              {casesLoading
                ? '...'
                : `${cases.length} dava`}
            </Badge>

          </div>

        </Card.Header>

        <Card.Body>

          {casesLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Davalar yükleniyor...
            </div>
          ) : casesError ? (
            <div className="py-8 text-center">

              <Briefcase className="mx-auto h-9 w-9 text-red-300" />

              <p className="mt-2 text-sm text-red-500">
                Davalar yüklenemedi.
              </p>

            </div>
          ) : cases.length ===
            0 ? (
            <div className="py-8 text-center">

              <Briefcase className="mx-auto h-10 w-10 text-gray-300" />

              <p className="mt-2 text-gray-400">
                Henüz ilişkili dava bulunmuyor.
              </p>

            </div>
          ) : (
            <div className="space-y-3">

              {cases.map(
                (
                  caseItem
                ) => (
                  <Link
                    key={
                      caseItem.id
                    }
                    to={`/cases/${caseItem.id}`}
                    className="block rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                      <div className="min-w-0">

                        <p className="font-semibold text-gray-900 dark:text-white">
                          {
                            caseItem.title
                          }
                        </p>

                        {caseItem.case_number && (
                          <p className="mt-1 text-xs text-gray-400">
                            Dosya No:{' '}
                            {
                              caseItem.case_number
                            }
                          </p>
                        )}

                      </div>

                      <Badge
                        variant={getCaseStatusVariant(
                          caseItem.status
                        )}
                      >
                        {getCaseStatusLabel(
                          caseItem.status
                        )}
                      </Badge>

                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">

                      <div>

                        <p className="flex items-center gap-1 text-xs text-gray-400">
                          <Building2 className="h-3 w-3" />

                          Mahkeme
                        </p>

                        <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                          {caseItem.court_name ||
                            '-'}
                        </p>

                      </div>

                      <div>

                        <p className="flex items-center gap-1 text-xs text-gray-400">
                          <CalendarDays className="h-3 w-3" />

                          Açılış
                        </p>

                        <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                          {formatDate(
                            caseItem.opening_date
                          )}
                        </p>

                      </div>

                      <div>

                        <p className="flex items-center gap-1 text-xs text-gray-400">
                          <UserCog className="h-3 w-3" />

                          Atanan Avukat
                        </p>

                        <p className="mt-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                          {getPersonName(
                            caseItem.assignee
                          )}
                        </p>

                      </div>

                    </div>

                  </Link>
                )
              )}

            </div>
          )}

        </Card.Body>

      </Card>

      {/* ==================================================
          FOOTER
      ================================================== */}

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">

        <div className="flex items-start gap-3">

          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />

          <div>

            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Müvekkil çalışma alanı
            </p>

            <p className="mt-1 text-xs leading-5 text-gray-500">
              Bu ekran müvekkile bağlı dava, görev, toplantı, belge,
              vekâletname ve finansal kayıtları merkezi olarak gösterir.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
};

export default ClientDetail;