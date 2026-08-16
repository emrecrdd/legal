import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  usePaymentPlans,
  usePayments,
  usePaymentSummary,
} from '../../features/payments/payment.query.js';

import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Table from '../../components/ui/Table.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Input from '../../components/ui/Input.jsx';

import {
  useDebounce,
} from '../../hooks/useDebounce.js';

import {
  AlertTriangle,
  Banknote,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileText,
  Plus,
  ReceiptText,
  RefreshCw,
  Scale,
  Search,
  TrendingDown,
  WalletCards,
  X,
} from 'lucide-react';

// ======================================================
// CONSTANTS
// ======================================================

const PAYMENT_STATUS_OPTIONS = [
  {
    value: '',
    label: 'Tüm Durumlar',
  },
  {
    value: 'pending',
    label: 'Bekliyor',
  },
  {
    value: 'completed',
    label: 'Tamamlandı',
  },
  {
    value: 'cancelled',
    label: 'İptal',
  },
];

const PAYMENT_TYPE_OPTIONS = [
  {
    value: '',
    label: 'Tüm Hareketler',
  },
  {
    value: 'received',
    label: 'Tahsilat',
  },
  {
    value: 'expense',
    label: 'Gider',
  },
  {
    value: 'refund',
    label: 'İade',
  },
  {
    value: 'adjustment',
    label: 'Düzeltme',
  },
];

// ======================================================
// HELPERS
// ======================================================

const toNumber = (
  value
) => {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
};

const formatCurrency = (
  value,
  currency = 'TRY'
) => {
  return new Intl.NumberFormat(
    'tr-TR',
    {
      style: 'currency',
      currency:
        currency ||
        'TRY',
      minimumFractionDigits:
        2,
      maximumFractionDigits:
        2,
    }
  ).format(
    toNumber(value)
  );
};

const formatDate = (
  value
) => {
  if (!value) {
    return '-';
  }

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
      day:
        '2-digit',
      month:
        '2-digit',
      year:
        'numeric',
      timeZone:
        'Europe/Istanbul',
    }
  ).format(date);
};

const getPaymentStatusLabel = (
  status
) => {
  return (
    PAYMENT_STATUS_OPTIONS.find(
      (
        item
      ) =>
        item.value ===
        status
    )?.label ||
    status ||
    '-'
  );
};

const getPaymentStatusVariant = (
  status
) => {
  switch (status) {
    case 'completed':
      return 'success';

    case 'pending':
      return 'warning';

    case 'cancelled':
      return 'danger';

    default:
      return 'default';
  }
};

const getPaymentTypeLabel = (
  type
) => {
  switch (type) {
    case 'received':
      return 'Tahsilat';

    case 'expense':
      return 'Gider';

    case 'refund':
      return 'İade';

    case 'adjustment':
      return 'Düzeltme';

    default:
      return (
        type ||
        '-'
      );
  }
};

const getPaymentTypeVariant = (
  type
) => {
  switch (type) {
    case 'received':
      return 'success';

    case 'expense':
      return 'danger';

    case 'refund':
      return 'warning';

    case 'adjustment':
      return 'info';

    default:
      return 'default';
  }
};

const getPaymentMethodLabel = (
  method
) => {
  const labels = {
    cash:
      'Nakit',

    bank_transfer:
      'Banka Transferi',

    credit_card:
      'Kredi Kartı',

    check:
      'Çek',

    other:
      'Diğer',
  };

  return (
    labels[method] ||
    method ||
    '-'
  );
};

const getPlanStatusLabel = (
  status
) => {
  const labels = {
    draft:
      'Taslak',

    active:
      'Aktif',

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

const getPlanStatusVariant = (
  status
) => {
  switch (status) {
    case 'active':
      return 'success';

    case 'draft':
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

const Finance = () => {
  const navigate =
    useNavigate();

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('');

  const [
    typeFilter,
    setTypeFilter,
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

  // ======================================================
  // GLOBAL SUMMARY
  // ======================================================

  const {
    data:
      summaryResponse,

    isLoading:
      summaryLoading,

    isFetching:
      summaryFetching,

    error:
      summaryError,

    refetch:
      refetchSummary,
  } =
    usePaymentSummary();

  // ======================================================
  // PAYMENTS
  // ======================================================

  const {
    data:
      paymentsData,

    isLoading:
      paymentsLoading,

    isFetching:
      paymentsFetching,

    error:
      paymentsError,

    refetch:
      refetchPayments,
  } =
    usePayments({
      page,

      limit:
        10,

      search:
        debouncedSearch,

      status:
        statusFilter,

      payment_type:
        typeFilter,
    });

  // ======================================================
  // PAYMENT PLANS
  // ======================================================

  const {
    data:
      plansData,

    isLoading:
      plansLoading,

    error:
      plansError,

    refetch:
      refetchPlans,
  } =
    usePaymentPlans({
      page:
        1,

      limit:
        100,
    });

  // ======================================================
  // DATA
  // ======================================================

  const summary =
    summaryResponse
      ?.data?.data ??
    summaryResponse
      ?.data ??
    {};

  const currency =
    summary.currency ||
    'TRY';

  const payments =
    Array.isArray(
      paymentsData
        ?.data?.data
    )
      ? paymentsData.data.data
      : [];

  const pagination =
    paymentsData
      ?.data
      ?.pagination;

  const plans =
    Array.isArray(
      plansData
        ?.data?.data
    )
      ? plansData.data.data
      : [];

  // ======================================================
  // PAGE RESET
  // ======================================================

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    statusFilter,
    typeFilter,
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
  // FILTERS
  // ======================================================

  const hasFilters =
    Boolean(
      search ||
      statusFilter ||
      typeFilter
    );

  const clearFilters =
    () => {
      setSearch('');
      setStatusFilter('');
      setTypeFilter('');
      setPage(1);
    };

  // ======================================================
  // REFRESH ALL
  // ======================================================

  const refreshAll =
    () => {
      refetchSummary();
      refetchPayments();
      refetchPlans();
    };

  // ======================================================
  // PAYMENT ERROR
  // ======================================================

  if (
    paymentsError
  ) {
    return (
      <div className="py-16 text-center">

        <AlertTriangle className="mx-auto h-11 w-11 text-red-500" />

        <h2 className="mt-3 text-xl font-semibold text-red-600">
          Finans hareketleri yüklenemedi
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {paymentsError
            ?.response
            ?.data
            ?.message ||
            paymentsError
              ?.message ||
            'Bilinmeyen hata'}
        </p>

        <Button
          className="mt-4"
          onClick={
            refreshAll
          }
        >
          <RefreshCw className="mr-2 h-4 w-4" />

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

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

        <div className="flex items-start gap-3">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">

            <WalletCards className="h-5 w-5 text-blue-600" />

          </div>

          <div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Finans Yönetimi
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Ücret anlaşmalarını, ödeme planlarını, tahsilatları, iadeleri ve giderleri tek merkezden yönetin.
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">

              <span>
                {summary.payments
                  ?.total ||
                  0}{' '}
                finans hareketi
              </span>

              <span>
                •
              </span>

              <span>
                {summary.plans
                  ?.total ||
                  0}{' '}
                ödeme planı
              </span>

              {summaryFetching && (
                <>
                  <span>
                    •
                  </span>

                  <span>
                    Finans özeti güncelleniyor...
                  </span>
                </>
              )}

            </div>

          </div>

        </div>

        <div className="flex flex-wrap gap-2">

          <Button
            variant="outline"
            disabled={
              summaryFetching ||
              paymentsFetching
            }
            onClick={
              refreshAll
            }
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                summaryFetching ||
                paymentsFetching
                  ? 'animate-spin'
                  : ''
              }`}
            />

            Yenile
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              navigate(
                '/payments/plans/create'
              )
            }
          >
            <FileText className="mr-2 h-4 w-4" />

            Ödeme Planı
          </Button>

          <Button
            onClick={() =>
              navigate(
                '/finance/create'
              )
            }
          >
            <Plus className="mr-2 h-4 w-4" />

            Finans Hareketi
          </Button>

        </div>

      </div>

      {/* ==================================================
          SUMMARY ERROR
      ================================================== */}

      {summaryError && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/10 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-start gap-3">

            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

            <div>

              <p className="font-medium text-amber-900 dark:text-amber-200">
                Finans özeti alınamadı
              </p>

              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                {summaryError
                  ?.response
                  ?.data
                  ?.message ||
                  summaryError
                    ?.message ||
                  'Özet verileri yüklenemedi'}
              </p>

            </div>

          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              refetchSummary()
            }
          >
            Tekrar Dene
          </Button>

        </div>
      )}

      {/* ==================================================
          PRIMARY SUMMARY
      ================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {/* AGREED */}

        <Card>

          <Card.Body>

            <div className="flex items-center justify-between gap-4">

              <div className="min-w-0">

                <p className="text-sm text-gray-500">
                  Anlaşılan Ücret
                </p>

                <p className="mt-2 truncate text-2xl font-bold text-gray-900 dark:text-white">
                  {summaryLoading
                    ? '...'
                    : formatCurrency(
                        summary.totalAgreed,
                        currency
                      )}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  İptal edilmemiş planların toplamı
                </p>

              </div>

              <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-900/20">

                <Scale className="h-5 w-5 text-blue-600" />

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* NET COLLECTION */}

        <Card>

          <Card.Body>

            <div className="flex items-center justify-between gap-4">

              <div className="min-w-0">

                <p className="text-sm text-gray-500">
                  Net Tahsilat
                </p>

                <p className="mt-2 truncate text-2xl font-bold text-green-600">
                  {summaryLoading
                    ? '...'
                    : formatCurrency(
                        summary.netCollected,
                        currency
                      )}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Tahsilat eksi geçerli iadeler
                </p>

              </div>

              <div className="rounded-xl bg-green-50 p-3 dark:bg-green-900/20">

                <CircleDollarSign className="h-5 w-5 text-green-600" />

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* BALANCE */}

        <Card>

          <Card.Body>

            <div className="flex items-center justify-between gap-4">

              <div className="min-w-0">

                <p className="text-sm text-gray-500">
                  Kalan Bakiye
                </p>

                <p
                  className={`mt-2 truncate text-2xl font-bold ${
                    toNumber(
                      summary.outstandingBalance
                    ) > 0
                      ? 'text-amber-600'
                      : 'text-green-600'
                  }`}
                >
                  {summaryLoading
                    ? '...'
                    : formatCurrency(
                        summary.outstandingBalance,
                        currency
                      )}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Henüz tahsil edilmemiş plan bakiyesi
                </p>

              </div>

              <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-900/20">

                <CreditCard className="h-5 w-5 text-amber-600" />

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* OVERDUE */}

        <Card>

          <Card.Body>

            <div className="flex items-center justify-between gap-4">

              <div className="min-w-0">

                <p className="text-sm text-gray-500">
                  Gecikmiş Tutar
                </p>

                <p
                  className={`mt-2 truncate text-2xl font-bold ${
                    toNumber(
                      summary.overdueAmount
                    ) > 0
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}
                >
                  {summaryLoading
                    ? '...'
                    : formatCurrency(
                        summary.overdueAmount,
                        currency
                      )}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  {summary.overdueInstallmentCount ||
                    0}{' '}
                  gecikmiş taksit
                </p>

              </div>

              <div className="rounded-xl bg-red-50 p-3 dark:bg-red-900/20">

                <Clock3 className="h-5 w-5 text-red-600" />

              </div>

            </div>

          </Card.Body>

        </Card>

      </div>

      {/* ==================================================
          SECONDARY SUMMARY
      ================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">

          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Brüt Tahsilat
          </p>

          <p className="mt-2 text-lg font-bold text-green-600">
            {formatCurrency(
              summary.grossReceived,
              currency
            )}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            {summary.payments
              ?.completedReceived ||
              0}{' '}
            tamamlanmış tahsilat
          </p>

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">

          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Bekleyen Tahsilat
          </p>

          <p className="mt-2 text-lg font-bold text-amber-600">
            {formatCurrency(
              summary.pendingReceived,
              currency
            )}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Henüz tamamlanmamış tahsilatlar
          </p>

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">

          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Net İade
          </p>

          <p className="mt-2 text-lg font-bold text-red-600">
            {formatCurrency(
              summary.effectiveRefunded,
              currency
            )}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Ters kayıtlar düşüldükten sonra
          </p>

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">

          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Net Gider
          </p>

          <p className="mt-2 text-lg font-bold text-orange-600">
            {formatCurrency(
              summary.effectiveExpense,
              currency
            )}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Gider ters kayıtları düşülmüş
          </p>

        </div>

      </div>

      {/* ==================================================
          FINANCIAL PERFORMANCE
      ================================================== */}

      <div className="grid gap-4 md:grid-cols-3">

        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">

          <div className="flex items-center gap-2 text-sm text-gray-500">

            <Banknote className="h-4 w-4" />

            Ortalama Tahsilat
          </div>

          <p className="mt-3 text-xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(
              summary.averagePayment,
              currency
            )}
          </p>

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">

          <div className="flex items-center gap-2 text-sm text-gray-500">

            <TrendingDown className="h-4 w-4" />

            Net Finansal Sonuç
          </div>

          <p
            className={`mt-3 text-xl font-bold ${
              toNumber(
                summary.netRevenue
              ) >= 0
                ? 'text-green-600'
                : 'text-red-600'
            }`}
          >
            {formatCurrency(
              summary.netRevenue,
              currency
            )}
          </p>

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">

          <div className="flex items-center gap-2 text-sm text-gray-500">

            <ReceiptText className="h-4 w-4" />

            Aktif Ödeme Planı
          </div>

          <p className="mt-3 text-xl font-bold text-purple-600">
            {summary.plans
              ?.active ||
              0}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            {summary.plans
              ?.draft ||
              0}{' '}
            taslak ·{' '}
            {summary.plans
              ?.completed ||
              0}{' '}
            tamamlandı
          </p>

        </div>

      </div>

      {/* ==================================================
          PAYMENT PLANS
      ================================================== */}

      <Card>

        <Card.Header>

          <div className="flex flex-wrap items-center justify-between gap-3">

            <div>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Ödeme Planları
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Müvekkillerle yapılan ücret anlaşmaları
              </p>

            </div>

            <Button
              size="sm"
              onClick={() =>
                navigate(
                  '/payments/plans/create'
                )
              }
            >
              <Plus className="mr-2 h-4 w-4" />

              Yeni Plan
            </Button>

          </div>

        </Card.Header>

        <Card.Body>

          {plansLoading ? (
            <div className="py-10 text-center text-sm text-gray-500">
              Ödeme planları yükleniyor...
            </div>
          ) : plansError ? (
            <div className="py-10 text-center">

              <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />

              <p className="mt-2 text-sm text-red-500">
                Ödeme planları yüklenemedi.
              </p>

              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() =>
                  refetchPlans()
                }
              >
                Yeniden Dene
              </Button>

            </div>
          ) : plans.length ===
            0 ? (
            <div className="py-10 text-center">

              <Scale className="mx-auto h-9 w-9 text-gray-300" />

              <p className="mt-2 text-sm text-gray-400">
                Henüz ödeme planı bulunmuyor.
              </p>

              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() =>
                  navigate(
                    '/payments/plans/create'
                  )
                }
              >
                İlk Ödeme Planını Oluştur
              </Button>

            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">

              {plans
                .slice(
                  0,
                  8
                )
                .map(
                  (
                    plan
                  ) => (
                    <Link
                      key={
                        plan.id
                      }
                      to={`/payments/plans/${plan.id}`}
                      className="rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <p className="truncate font-semibold text-gray-900 dark:text-white">
                            {plan.title}
                          </p>

                          <p className="mt-1 truncate text-sm text-gray-500">
                            {plan.client
                              ?.name ||
                              'Müvekkil'}
                          </p>

                        </div>

                        <Badge
                          variant={
                            getPlanStatusVariant(
                              plan.status
                            )
                          }
                        >
                          {getPlanStatusLabel(
                            plan.status
                          )}
                        </Badge>

                      </div>

                      <div className="mt-4 flex items-end justify-between gap-3">

                        <div>

                          <p className="text-xs text-gray-400">
                            Toplam Ücret
                          </p>

                          <p className="mt-1 font-bold text-gray-900 dark:text-white">
                            {formatCurrency(
                              plan.total_amount,
                              plan.currency ||
                                'TRY'
                            )}
                          </p>

                        </div>

                        {plan.case && (
                          <span className="max-w-[12rem] truncate text-xs text-gray-400">
                            {plan.case
                              .case_number ||
                              plan.case
                                .title}
                          </span>
                        )}

                      </div>

                    </Link>
                  )
                )}

            </div>
          )}

        </Card.Body>

      </Card>

      {/* ==================================================
          PAYMENT FILTERS + TABLE
      ================================================== */}

      <Card>

        <Card.Header>

          <div className="mb-4">

            <h2 className="font-semibold text-gray-900 dark:text-white">
              Finans Hareketleri
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Tahsilat, gider, iade ve düzeltme kayıtları
            </p>

          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">

            {/* SEARCH */}

            <div className="relative xl:col-span-6">

              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <Input
                placeholder="Müvekkil, dava, açıklama, makbuz veya işlem no ara..."
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
                className="pl-10"
              />

            </div>

            {/* TYPE */}

            <div className="xl:col-span-2">

              <select
                value={
                  typeFilter
                }
                onChange={(
                  event
                ) =>
                  setTypeFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >

                {PAYMENT_TYPE_OPTIONS.map(
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

            {/* STATUS */}

            <div className="xl:col-span-2">

              <select
                value={
                  statusFilter
                }
                onChange={(
                  event
                ) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >

                {PAYMENT_STATUS_OPTIONS.map(
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

            {/* CLEAR */}

            <div className="xl:col-span-2">

              {hasFilters && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={
                    clearFilters
                  }
                >
                  <X className="mr-2 h-4 w-4" />

                  Temizle
                </Button>
              )}

            </div>

          </div>

          {paymentsFetching &&
            !paymentsLoading && (
              <p className="mt-2 text-xs text-gray-400">
                Finans hareketleri güncelleniyor...
              </p>
            )}

        </Card.Header>

        <Card.Body className="p-0">

          <div className="overflow-x-auto">

            <Table>

              <Table.Head>

                <Table.Row>

                  <Table.HeadCell>
                    Müvekkil
                  </Table.HeadCell>

                  <Table.HeadCell>
                    Dava / Plan
                  </Table.HeadCell>

                  <Table.HeadCell>
                    Hareket
                  </Table.HeadCell>

                  <Table.HeadCell>
                    Tutar
                  </Table.HeadCell>

                  <Table.HeadCell>
                    Yöntem
                  </Table.HeadCell>

                  <Table.HeadCell>
                    Durum
                  </Table.HeadCell>

                  <Table.HeadCell>
                    Tarih
                  </Table.HeadCell>

                </Table.Row>

              </Table.Head>

              <Table.Body>

                {paymentsLoading ? (
                  <Table.Row>

                    <Table.Cell
                      colSpan="7"
                      className="py-12 text-center"
                    >
                      Finans hareketleri yükleniyor...
                    </Table.Cell>

                  </Table.Row>
                ) : payments.length ===
                  0 ? (
                  <Table.Row>

                    <Table.Cell
                      colSpan="7"
                      className="py-12 text-center text-gray-500"
                    >

                      <Banknote className="mx-auto h-9 w-9 text-gray-300" />

                      <p className="mt-2">
                        {hasFilters
                          ? 'Filtrelere uygun finans hareketi bulunamadı'
                          : 'Henüz finans hareketi bulunmuyor'}
                      </p>

                    </Table.Cell>

                  </Table.Row>
                ) : (
                  payments.map(
                    (
                      payment
                    ) => (
                      <Table.Row
                        key={
                          payment.id
                        }
                      >

                        {/* CLIENT */}

                        <Table.Cell>

                          {payment.client ? (
                            <Link
                              to={`/clients/${payment.client.id}`}
                              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {payment.client
                                .name}
                            </Link>
                          ) : (
                            <span className="text-gray-400">
                              -
                            </span>
                          )}

                        </Table.Cell>

                        {/* CASE / PLAN */}

                        <Table.Cell>

                          <div className="min-w-[12rem]">

                            {payment.case && (
                              <Link
                                to={`/cases/${payment.case.id}`}
                                className="block max-w-[14rem] truncate text-sm font-medium text-gray-900 hover:text-blue-600 dark:text-white"
                              >
                                {payment.case
                                  .title}
                              </Link>
                            )}

                            {payment.paymentPlan && (
                              <Link
                                to={`/payments/plans/${payment.paymentPlan.id}`}
                                className="mt-1 block max-w-[14rem] truncate text-xs text-blue-600 hover:underline dark:text-blue-400"
                              >
                                {payment
                                  .paymentPlan
                                  .title}
                              </Link>
                            )}

                            {!payment.case &&
                              !payment.paymentPlan && (
                                <span className="text-sm text-gray-400">
                                  -
                                </span>
                              )}

                          </div>

                        </Table.Cell>

                        {/* TYPE */}

                        <Table.Cell>

                          <Badge
                            variant={
                              getPaymentTypeVariant(
                                payment.payment_type
                              )
                            }
                          >
                            {getPaymentTypeLabel(
                              payment.payment_type
                            )}
                          </Badge>

                        </Table.Cell>

                        {/* AMOUNT */}

                        <Table.Cell>

                          <span
                            className={`font-semibold ${
                              payment.payment_type ===
                              'received'
                                ? 'text-green-600'
                                : payment.payment_type ===
                                  'refund'
                                  ? 'text-red-600'
                                  : payment.payment_type ===
                                    'expense'
                                    ? 'text-orange-600'
                                    : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {formatCurrency(
                              payment.amount,
                              payment.paymentPlan
                                ?.currency ||
                                currency
                            )}
                          </span>

                        </Table.Cell>

                        {/* METHOD */}

                        <Table.Cell>

                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {getPaymentMethodLabel(
                              payment.payment_method
                            )}
                          </span>

                        </Table.Cell>

                        {/* STATUS */}

                        <Table.Cell>

                          <Badge
                            variant={
                              getPaymentStatusVariant(
                                payment.status
                              )
                            }
                          >
                            {getPaymentStatusLabel(
                              payment.status
                            )}
                          </Badge>

                        </Table.Cell>

                        {/* DATE */}

                        <Table.Cell>

                          <span className="whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {formatDate(
                              payment.payment_date
                            )}
                          </span>

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
                  {pagination.total}{' '}
                  finans hareketi
                </p>

                <div className="flex items-center gap-2">

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      page <= 1 ||
                      paymentsFetching
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
                    <ChevronLeft className="mr-1 h-4 w-4" />

                    Önceki
                  </Button>

                  <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
                    {page} /{' '}
                    {pagination.totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      page >=
                        pagination.totalPages ||
                      paymentsFetching
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

                    <ChevronRight className="ml-1 h-4 w-4" />

                  </Button>

                </div>

              </div>
            )}

        </Card.Body>

      </Card>

    </div>
  );
};

export default Finance;