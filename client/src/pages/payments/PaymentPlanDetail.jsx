import {
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  useActivatePaymentPlan,
  useCancelPaymentPlan,
  usePaymentPlan,
} from '../../features/payments/payment.query.js';

import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileText,
  Play,
  Scale,
  UserRound,
  WalletCards,
  XCircle,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// HELPERS
// ======================================================

const formatMoney = (
  value,
  currency = 'TRY'
) => {
  return new Intl.NumberFormat(
    'tr-TR',
    {
      style: 'currency',
      currency: currency || 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(
    Number(value) || 0
  );
};

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
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Europe/Istanbul',
      }
    ).format(date);
  } catch {
    return '-';
  }
};

const getPlanStatusLabel = (
  status
) => {
  const labels = {
    draft: 'Taslak',
    active: 'Aktif',
    completed: 'Tamamlandı',
    cancelled: 'İptal',
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

const getInstallmentStatusLabel = (
  status
) => {
  const labels = {
    pending: 'Bekliyor',
    partial: 'Kısmi Ödendi',
    paid: 'Ödendi',
    overdue: 'Gecikmiş',
    cancelled: 'İptal',
  };

  return (
    labels[status] ||
    status ||
    '-'
  );
};

const getInstallmentStatusVariant = (
  status
) => {
  switch (status) {
    case 'paid':
      return 'success';

    case 'partial':
      return 'warning';

    case 'overdue':
      return 'danger';

    case 'cancelled':
      return 'default';

    case 'pending':
    default:
      return 'info';
  }
};

const getPersonName = (
  person
) => {
  if (!person) {
    return '-';
  }

  return [
    person.first_name,
    person.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim() || '-';
};

// ======================================================
// COMPONENT
// ======================================================

const getCaseDisplayName = (caseItem) => {
  if (!caseItem) return '-';

  const courtName = String(
    caseItem.court_name ||
    caseItem.court?.name ||
    ''
  ).trim();

  const caseNumber = String(
    caseItem.case_number || ''
  ).trim();

  if (courtName && caseNumber) {
    return `${courtName} · ${caseNumber}`;
  }

  return courtName || caseNumber || caseItem.title || '-';
};

const PaymentPlanDetail = () => {
  const {
    id,
  } =
    useParams();

  const navigate =
    useNavigate();

  const {
    data,
    isLoading,
    error,
    refetch,
  } =
    usePaymentPlan(
      id
    );

  const activateMutation =
    useActivatePaymentPlan();

  const cancelMutation =
    useCancelPaymentPlan();

  const [
    cancelReason,
    setCancelReason,
  ] = useState('');

  const [
    showCancelBox,
    setShowCancelBox,
  ] = useState(false);

  // ======================================================
  // DATA
  // ======================================================

  const plan =
    data?.data?.data ??
    data?.data ??
    null;

  const installments =
    Array.isArray(
      plan?.installments
    )
      ? plan.installments
      : [];

  const payments =
    Array.isArray(
      plan?.payments
    )
      ? plan.payments
      : [];

  const summary =
    plan?.summary ||
    {};

  // ======================================================
  // DERIVED
  // ======================================================

  const currency =
    plan?.currency ||
    'TRY';

  const canActivate =
    plan?.status ===
    'draft';

  const canCancel =
    plan &&
    ![
      'completed',
      'cancelled',
    ].includes(
      plan.status
    );

  const isPending =
    activateMutation.isPending ||
    cancelMutation.isPending;

  const progress =
    useMemo(() => {
      const total =
        Number(
          summary.total_amount ??
          plan?.total_amount
        ) || 0;

      const collected =
        Number(
          summary.net_collected_amount ??
          summary.collected_amount
        ) || 0;

      if (
        total <= 0
      ) {
        return 0;
      }

      return Math.min(
        100,
        Math.max(
          0,
          (
            collected /
            total
          ) * 100
        )
      );
    }, [
      summary,
      plan,
    ]);

  // ======================================================
  // ACTIONS
  // ======================================================

  const handleActivate =
    () => {
      if (
        !canActivate ||
        isPending
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          'Bu ödeme planını aktive etmek istediğinize emin misiniz?'
        );

      if (
        !confirmed
      ) {
        return;
      }

      activateMutation.mutate(
        id
      );
    };

  const handleCancel =
    () => {
      if (
        !canCancel ||
        isPending
      ) {
        return;
      }

      if (
        !cancelReason.trim()
      ) {
        toast.error(
          'İptal nedenini girin'
        );

        return;
      }

      cancelMutation.mutate(
        {
          id,

          reason:
            cancelReason.trim(),
        },
        {
          onSuccess: () => {
            setShowCancelBox(
              false
            );

            setCancelReason('');
          },
        }
      );
    };

  // ======================================================
  // LOADING
  // ======================================================

  if (
    isLoading
  ) {
    return (
      <div className="flex h-72 items-center justify-center">

        <div className="text-center">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600" />

          <p className="mt-4 text-sm text-gray-500">
            Ödeme planı yükleniyor...
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
    !plan
  ) {
    return (
      <div className="py-16 text-center">

        <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />

        <h2 className="mt-3 text-xl font-semibold text-red-600">
          Ödeme planı bulunamadı
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {error?.response
            ?.data?.message ||
            error?.message ||
            'Ödeme planı yüklenemedi'}
        </p>

        <div className="mt-4 flex justify-center gap-3">

          <Button
            variant="outline"
            onClick={() =>
              refetch()
            }
          >
            Yeniden Dene
          </Button>

          <Button
            variant="secondary"
            onClick={() =>
              navigate(
                '/payments'
              )
            }
          >
            Finans
          </Button>

        </div>

      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

          <div className="min-w-0">

            <Link
              to="/payments"
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowLeft className="h-4 w-4" />

              Finans
            </Link>

            <div className="mt-4 flex flex-wrap items-start gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">

                <WalletCards className="h-5 w-5 text-blue-600" />

              </div>

              <div>

                <div className="flex flex-wrap items-center gap-2">

                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {plan.title}
                  </h1>

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

                <p className="mt-1 text-sm text-gray-500">
                  {plan.reference_number
                    ? `Referans: ${plan.reference_number}`
                    : 'Ödeme planı'}
                </p>

              </div>

            </div>

          </div>

          <div className="flex flex-wrap gap-2">

            {canActivate && (
              <Button
                onClick={
                  handleActivate
                }
                loading={
                  activateMutation.isPending
                }
                disabled={
                  isPending
                }
              >
                <Play className="mr-2 h-4 w-4" />

                Planı Aktive Et
              </Button>
            )}

            {canCancel && (
              <Button
                variant="danger"
                disabled={
                  isPending
                }
                onClick={() =>
                  setShowCancelBox(
                    (
                      current
                    ) =>
                      !current
                  )
                }
              >
                <XCircle className="mr-2 h-4 w-4" />

                Planı İptal Et
              </Button>
            )}

          </div>

        </div>

        {showCancelBox && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/10">

            <label className="block text-sm font-medium text-red-800 dark:text-red-200">
              İptal nedeni
            </label>

            <textarea
              value={
                cancelReason
              }
              onChange={(
                event
              ) =>
                setCancelReason(
                  event.target.value
                )
              }
              rows="3"
              disabled={
                isPending
              }
              className="mt-2 w-full rounded-md border border-red-200 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-red-800 dark:bg-gray-800 dark:text-white"
              placeholder="Plan neden iptal ediliyor?"
            />

            <div className="mt-3 flex gap-2">

              <Button
                variant="danger"
                loading={
                  cancelMutation.isPending
                }
                disabled={
                  isPending
                }
                onClick={
                  handleCancel
                }
              >
                İptali Onayla
              </Button>

              <Button
                variant="secondary"
                disabled={
                  isPending
                }
                onClick={() => {
                  setShowCancelBox(
                    false
                  );

                  setCancelReason(
                    ''
                  );
                }}
              >
                Vazgeç
              </Button>

            </div>

          </div>
        )}

      </div>

      {/* SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">

          <div className="flex items-center gap-2 text-sm text-gray-500">

            <Scale className="h-4 w-4" />

            Anlaşılan
          </div>

          <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
            {formatMoney(
              summary.total_amount ??
                plan.total_amount,
              currency
            )}
          </p>

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">

          <div className="flex items-center gap-2 text-sm text-gray-500">

            <CircleDollarSign className="h-4 w-4" />

            Tahsil Edilen
          </div>

          <p className="mt-2 text-xl font-bold text-green-600">
            {formatMoney(
              summary.net_collected_amount ??
                summary.collected_amount,
              currency
            )}
          </p>

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">

          <div className="flex items-center gap-2 text-sm text-gray-500">

            <CreditCard className="h-4 w-4" />

            Kalan
          </div>

          <p className="mt-2 text-xl font-bold text-amber-600">
            {formatMoney(
              summary.remaining_amount,
              currency
            )}
          </p>

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">

          <div className="flex items-center gap-2 text-sm text-gray-500">

            <Clock3 className="h-4 w-4" />

            Gecikmiş
          </div>

          <p
            className={`mt-2 text-xl font-bold ${
              Number(
                summary.overdue_amount
              ) > 0
                ? 'text-red-600'
                : 'text-green-600'
            }`}
          >
            {formatMoney(
              summary.overdue_amount,
              currency
            )}
          </p>

        </div>

      </div>

      {/* PROGRESS */}

      <Card>

        <Card.Body>

          <div className="flex items-center justify-between gap-3">

            <div>

              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Tahsilat İlerlemesi
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Plan toplamına göre net tahsilat oranı
              </p>

            </div>

            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {progress.toFixed(
                1
              )}
              %
            </p>

          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">

            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{
                width:
                  `${progress}%`,
              }}
            />

          </div>

        </Card.Body>

      </Card>

      {/* PLAN INFO */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        <Card>

          <Card.Header>

            <div className="flex items-center gap-2">

              <FileText className="h-5 w-5 text-blue-600" />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Plan Bilgileri
              </h2>

            </div>

          </Card.Header>

          <Card.Body className="space-y-4">

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <div>

                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Müvekkil
                </p>

                {plan.client ? (
                  <Link
                    to={`/clients/${plan.client.id}`}
                    className="mt-1 inline-flex items-center gap-1 font-medium text-blue-600 hover:underline"
                  >
                    <UserRound className="h-4 w-4" />

                    {plan.client.name}
                  </Link>
                ) : (
                  <p className="mt-1 font-medium text-gray-900 dark:text-white">
                    -
                  </p>
                )}

              </div>

              <div>

                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Dava
                </p>

                {plan.case ? (
                  <Link
                    to={`/cases/${plan.case.id}`}
                    className="mt-1 block font-medium text-blue-600 hover:underline"
                  >
                    {getCaseDisplayName(
                      plan.case
                    )}
                  </Link>
                ) : (
                  <p className="mt-1 font-medium text-gray-900 dark:text-white">
                    Dava bağlantısı yok
                  </p>
                )}

              </div>

              <div>

                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Plan Tipi
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {plan.plan_type ===
                  'one_time'
                    ? 'Tek Ödeme'
                    : 'Taksitli'}
                </p>

              </div>

              <div>

                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Para Birimi
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {currency}
                </p>

              </div>

              <div>

                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Başlangıç
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {formatDate(
                    plan.start_date
                  )}
                </p>

              </div>

              <div>

                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Bitiş
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {formatDate(
                    plan.end_date
                  )}
                </p>

              </div>

            </div>

            {plan.description && (
              <div className="border-t border-gray-100 pt-4 dark:border-gray-700">

                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Açıklama
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300">
                  {plan.description}
                </p>

              </div>
            )}

            {plan.notes && (
              <div>

                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Finans Notu
                </p>

                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {plan.notes}
                </p>

              </div>
            )}

            <div className="border-t border-gray-100 pt-4 dark:border-gray-700">

              <p className="text-xs text-gray-400">
                Oluşturan
              </p>

              <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {getPersonName(
                  plan.creator
                )}
              </p>

            </div>

          </Card.Body>

        </Card>

        {/* INSTALLMENT SUMMARY */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-2">

              <CalendarDays className="h-5 w-5 text-purple-600" />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Taksit Özeti
              </h2>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="grid grid-cols-2 gap-3">

              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">

                <p className="text-xs text-gray-400">
                  Toplam
                </p>

                <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                  {summary.installment_count ??
                    installments.length}
                </p>

              </div>

              <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">

                <p className="text-xs text-green-600">
                  Ödenen
                </p>

                <p className="mt-1 text-xl font-bold text-green-700 dark:text-green-300">
                  {summary.paid_installments ||
                    0}
                </p>

              </div>

              <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">

                <p className="text-xs text-amber-600">
                  Kısmi
                </p>

                <p className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-300">
                  {summary.partial_installments ||
                    0}
                </p>

              </div>

              <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">

                <p className="text-xs text-red-600">
                  Gecikmiş
                </p>

                <p className="mt-1 text-xl font-bold text-red-700 dark:text-red-300">
                  {summary.overdue_installments ||
                    0}
                </p>

              </div>

            </div>

          </Card.Body>

        </Card>

      </div>

      {/* INSTALLMENTS */}

      <Card>

        <Card.Header>

          <div className="flex items-center justify-between gap-3">

            <div className="flex items-center gap-2">

              <CalendarDays className="h-5 w-5 text-purple-600" />

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Taksitler
                </h2>

                <p className="text-xs text-gray-500">
                  Planın vade ve tahsilat durumu
                </p>

              </div>

            </div>

            <Badge variant="default">
              {installments.length}{' '}
              kayıt
            </Badge>

          </div>

        </Card.Header>

        <Card.Body>

          {installments.length ===
          0 ? (
            <div className="py-10 text-center">

              <CalendarDays className="mx-auto h-9 w-9 text-gray-300" />

              <p className="mt-2 text-sm text-gray-400">
                Taksit bulunmuyor.
              </p>

            </div>
          ) : (
            <div className="space-y-3">

              {installments.map(
                (
                  installment
                ) => {
                  const amount =
                    Number(
                      installment.amount
                    ) || 0;

                  const paid =
                    Number(
                      installment.paid_amount
                    ) || 0;

                  const remaining =
                    Math.max(
                      amount -
                        paid,
                      0
                    );

                  return (
                    <div
                      key={
                        installment.id
                      }
                      className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                    >

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                        <div>

                          <div className="flex flex-wrap items-center gap-2">

                            <p className="font-semibold text-gray-900 dark:text-white">
                              {installment.title ||
                                `${installment.installment_number}. Taksit`}
                            </p>

                            <Badge
                              variant={
                                getInstallmentStatusVariant(
                                  installment.status
                                )
                              }
                            >
                              {getInstallmentStatusLabel(
                                installment.status
                              )}
                            </Badge>

                          </div>

                          <p className="mt-2 flex items-center gap-1 text-sm text-gray-500">

                            <CalendarDays className="h-4 w-4" />

                            Vade:{' '}
                            {formatDate(
                              installment.due_date
                            )}
                          </p>

                        </div>

                        <div className="text-left sm:text-right">

                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatMoney(
                              amount,
                              currency
                            )}
                          </p>

                          {paid >
                            0 && (
                            <p className="mt-1 text-xs text-green-600">
                              Tahsil:{' '}
                              {formatMoney(
                                paid,
                                currency
                              )}
                            </p>
                          )}

                          {remaining >
                            0 && (
                            <p className="mt-1 text-xs text-gray-500">
                              Kalan:{' '}
                              {formatMoney(
                                remaining,
                                currency
                              )}
                            </p>
                          )}

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </Card.Body>

      </Card>

      {/* PAYMENTS */}

      <Card>

        <Card.Header>

          <div className="flex items-center justify-between gap-3">

            <div className="flex items-center gap-2">

              <CreditCard className="h-5 w-5 text-green-600" />

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Finans Hareketleri
                </h2>

                <p className="text-xs text-gray-500">
                  Bu plana bağlı tahsilat ve diğer hareketler
                </p>

              </div>

            </div>

            <Badge variant="default">
              {payments.length}{' '}
              hareket
            </Badge>

          </div>

        </Card.Header>

        <Card.Body>

          {payments.length ===
          0 ? (
            <div className="py-10 text-center">

              <CreditCard className="mx-auto h-9 w-9 text-gray-300" />

              <p className="mt-2 text-sm text-gray-400">
                Henüz finans hareketi bulunmuyor.
              </p>

            </div>
          ) : (
            <div className="space-y-2">

              {payments.map(
                (
                  payment
                ) => (
                  <div
                    key={
                      payment.id
                    }
                    className="flex flex-col gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between"
                  >

                    <div>

                      <p className="font-medium text-gray-900 dark:text-white">
                        {payment.description ||
                          'Finans hareketi'}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {formatDate(
                          payment.payment_date
                        )}
                      </p>

                    </div>

                    <div className="text-left sm:text-right">

                      <p
                        className={`font-bold ${
                          payment.payment_type ===
                          'refund'
                            ? 'text-red-600'
                            : payment.payment_type ===
                              'expense'
                              ? 'text-amber-600'
                              : 'text-green-600'
                        }`}
                      >
                        {formatMoney(
                          payment.amount,
                          currency
                        )}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        {payment.payment_type ||
                          '-'}
                      </p>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </Card.Body>

      </Card>

    </div>
  );
};

export default PaymentPlanDetail;