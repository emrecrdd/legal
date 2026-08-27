import {
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  useQuery,
} from '@tanstack/react-query';

import {
  useCreatePaymentPlan,
} from '../../features/payments/payment.query.js';

import clientApi from '../../features/clients/client.api.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Save,
  Scale,
  WalletCards,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const INITIAL_FORM = {
  title: '',
  description: '',

  client_id: '',
  case_id: '',

  total_amount: '',
  down_payment_amount: '0',

  currency: 'TRY',
  plan_type: 'installment',

  installment_count: '1',
  first_due_date: '',

  start_date: '',
  end_date: '',

  reference_number: '',
  notes: '',

  auto_reminders_enabled: true,
  remind_days_before: '3',

  notify_on_due_date: true,
  notify_on_overdue: true,

  notify_by_email: true,
  notify_by_sms: false,
  notify_in_app: true,
};

// ======================================================
// HELPERS
// ======================================================

const toNumber = (
  value
) => {
  const parsed =
    Number(
      String(value)
        .replace(',', '.')
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
};

const formatMoney = (
  value
) => {
  return new Intl.NumberFormat(
    'tr-TR',
    {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(
    Number(value) || 0
  );
};

const addMonths = (
  dateString,
  months
) => {
  if (!dateString) {
    return '';
  }

  const [
    year,
    month,
    day,
  ] =
    dateString
      .split('-')
      .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return '';
  }

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  const originalDay =
    date.getUTCDate();

  date.setUTCDate(1);

  date.setUTCMonth(
    date.getUTCMonth() +
      months
  );

  const lastDay =
    new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        0
      )
    ).getUTCDate();

  date.setUTCDate(
    Math.min(
      originalDay,
      lastDay
    )
  );

  return date
    .toISOString()
    .slice(0, 10);
};

const buildInstallmentPreview = ({
  totalAmount,
  downPayment,
  installmentCount,
  firstDueDate,
}) => {
  const totalCents =
    Math.round(
      totalAmount * 100
    );

  const downPaymentCents =
    Math.round(
      downPayment * 100
    );

  const financedCents =
    totalCents -
    downPaymentCents;

  const count =
    Number.parseInt(
      installmentCount,
      10
    );

  if (
    financedCents <= 0 ||
    !Number.isInteger(count) ||
    count <= 0 ||
    !firstDueDate
  ) {
    return [];
  }

  const baseAmount =
    Math.floor(
      financedCents /
      count
    );

  let remainder =
    financedCents %
    count;

  return Array.from(
    {
      length: count,
    },
    (
      _,
      index
    ) => {
      let cents =
        baseAmount;

      if (
        remainder >
        0
      ) {
        cents += 1;
        remainder -= 1;
      }

      return {
        installment_number:
          index + 1,

        amount:
          cents / 100,

        due_date:
          addMonths(
            firstDueDate,
            index
          ),
      };
    }
  );
};

// ======================================================
// COMPONENT
// ======================================================

const PaymentPlanCreate = () => {
  const navigate =
    useNavigate();

  const createMutation =
    useCreatePaymentPlan();

  const [
    formData,
    setFormData,
  ] = useState(
    INITIAL_FORM
  );

  const [
    errors,
    setErrors,
  ] = useState({});

  // ======================================================
  // CLIENTS
  // ======================================================

  const {
    data:
      clientsData,
    isLoading:
      clientsLoading,
  } =
    useQuery({
      queryKey: [
        'payment-plan-clients',
      ],

      queryFn: () =>
        clientApi.getAll({
          page: 1,
          limit: 100,
          status: 'active',
        }),

      staleTime:
        5 * 60 * 1000,
    });

  const clients =
    Array.isArray(
      clientsData?.data?.data
    )
      ? clientsData.data.data
      : [];

  // ======================================================
  // CLIENT CASES
  // ======================================================

  const {
    data:
      clientCasesData,
    isLoading:
      clientCasesLoading,
  } =
    useQuery({
      queryKey: [
        'payment-plan-client-cases',
        formData.client_id,
      ],

      queryFn: () =>
        clientApi.getCaseHistory(
          formData.client_id
        ),

      enabled:
        Boolean(
          formData.client_id
        ),

      staleTime:
        3 * 60 * 1000,
    });

  const cases =
    useMemo(() => {
      const payload =
        clientCasesData?.data?.data ??
        clientCasesData?.data ??
        [];

      if (
        Array.isArray(
          payload
        )
      ) {
        return payload;
      }

      if (
        Array.isArray(
          payload?.data
        )
      ) {
        return payload.data;
      }

      if (
        Array.isArray(
          payload?.cases
        )
      ) {
        return payload.cases;
      }

      return [];
    }, [
      clientCasesData,
    ]);

  // ======================================================
  // DERIVED VALUES
  // ======================================================

  const totalAmount =
    useMemo(
      () =>
        toNumber(
          formData.total_amount
        ),
      [
        formData.total_amount,
      ]
    );

  const downPayment =
    useMemo(
      () =>
        toNumber(
          formData.down_payment_amount
        ),
      [
        formData.down_payment_amount,
      ]
    );

  const remainingAmount =
    useMemo(
      () =>
        Math.max(
          totalAmount -
            downPayment,
          0
        ),
      [
        totalAmount,
        downPayment,
      ]
    );

  const installmentPreview =
    useMemo(
      () =>
        buildInstallmentPreview({
          totalAmount,
          downPayment,

          installmentCount:
            formData.installment_count,

          firstDueDate:
            formData.first_due_date,
        }),
      [
        totalAmount,
        downPayment,
        formData.installment_count,
        formData.first_due_date,
      ]
    );

  const previewTotal =
    useMemo(
      () =>
        installmentPreview.reduce(
          (
            total,
            item
          ) =>
            total +
            item.amount,
          0
        ),
      [
        installmentPreview,
      ]
    );

  const isOneTime =
    formData.plan_type ===
    'one_time';

  const isPending =
    createMutation.isPending;

  // ======================================================
  // CHANGE
  // ======================================================

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } =
      event.target;

    const nextValue =
      type ===
      'checkbox'
        ? checked
        : value;

    setFormData(
      (
        current
      ) => {
        if (
          name ===
          'client_id'
        ) {
          return {
            ...current,

            client_id:
              nextValue,

            /*
             * Müvekkil değişince eski dava seçimi
             * her zaman temizlenir.
             */
            case_id:
              '',
          };
        }

        return {
          ...current,

          [name]:
            nextValue,
        };
      }
    );

    if (
      errors[name]
    ) {
      setErrors(
        (
          current
        ) => ({
          ...current,

          [name]:
            '',
        })
      );
    }
  };

  const handlePlanTypeChange = (
    type
  ) => {
    setFormData(
      (
        current
      ) => ({
        ...current,

        plan_type:
          type,

        installment_count:
          type === 'one_time'
            ? '1'
            : current.installment_count ||
              '1',
      })
    );
  };

  // ======================================================
  // VALIDATION
  // ======================================================

  const validateForm =
    () => {
      const nextErrors =
        {};

      if (
        !formData.title.trim()
      ) {
        nextErrors.title =
          'Ödeme planı başlığı gereklidir';
      }

      if (
        !formData.client_id
      ) {
        nextErrors.client_id =
          'Müvekkil seçilmelidir';
      }

      if (
        totalAmount <= 0
      ) {
        nextErrors.total_amount =
          'Toplam ücret 0’dan büyük olmalıdır';
      }

      if (
        downPayment < 0
      ) {
        nextErrors.down_payment_amount =
          'Peşinat negatif olamaz';
      }

      if (
        downPayment >
        totalAmount
      ) {
        nextErrors.down_payment_amount =
          'Peşinat toplam ücretten büyük olamaz';
      }

      if (
        remainingAmount >
        0
      ) {
        const count =
          Number.parseInt(
            formData.installment_count,
            10
          );

        if (
          !Number.isInteger(
            count
          ) ||
          count <= 0
        ) {
          nextErrors.installment_count =
            'Taksit sayısı en az 1 olmalıdır';
        }

        if (
          !formData.first_due_date
        ) {
          nextErrors.first_due_date =
            'İlk taksit tarihi gereklidir';
        }
      }

      if (
        formData.start_date &&
        formData.end_date &&
        formData.end_date <
          formData.start_date
      ) {
        nextErrors.end_date =
          'Bitiş tarihi başlangıç tarihinden önce olamaz';
      }

      const remindDays =
        Number.parseInt(
          formData.remind_days_before,
          10
        );

      if (
        formData.auto_reminders_enabled &&
        (
          !Number.isInteger(
            remindDays
          ) ||
          remindDays < 0 ||
          remindDays > 365
        )
      ) {
        nextErrors.remind_days_before =
          'Hatırlatma günü 0-365 arasında olmalıdır';
      }

      setErrors(
        nextErrors
      );

      return (
        Object.keys(
          nextErrors
        ).length === 0
      );
    };

  // ======================================================
  // SUBMIT
  // ======================================================

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    if (
      isPending
    ) {
      return;
    }

    if (
      !validateForm()
    ) {
      toast.error(
        'Formdaki eksik veya hatalı alanları kontrol edin'
      );

      return;
    }

    const payload = {
      title:
        formData.title.trim(),

      description:
        formData.description.trim() ||
        null,

      client_id:
        formData.client_id,

      case_id:
        formData.case_id ||
        null,

      total_amount:
        totalAmount,

      down_payment_amount:
        downPayment,

      currency:
        formData.currency,

      plan_type:
        formData.plan_type,

      installment_count:
        isOneTime
          ? 1
          : Number.parseInt(
              formData.installment_count,
              10
            ),

      first_due_date:
        remainingAmount >
        0
          ? formData.first_due_date
          : null,

      start_date:
        formData.start_date ||
        null,

      end_date:
        formData.end_date ||
        null,

      reference_number:
        formData.reference_number.trim() ||
        null,

      notes:
        formData.notes.trim() ||
        null,

      auto_reminders_enabled:
        formData.auto_reminders_enabled,

      remind_days_before:
        Number.parseInt(
          formData.remind_days_before,
          10
        ) || 0,

      notify_on_due_date:
        formData.notify_on_due_date,

      notify_on_overdue:
        formData.notify_on_overdue,

      notify_by_email:
        formData.notify_by_email,

      notify_by_sms:
        formData.notify_by_sms,

      notify_in_app:
        formData.notify_in_app,

      status:
        'draft',
    };

    createMutation.mutate(
      payload,
      {
        onSuccess: (
          response
        ) => {
          const plan =
            response?.data?.data ??
            response?.data ??
            null;

          if (
            plan?.id
          ) {
            navigate(
              `/payments/plans/${plan.id}`
            );

            return;
          }

          navigate(
            '/finance'
          );
        },
      }
    );
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* HEADER */}

      <div>

        <Link
          to="/finance"
          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Finans
        </Link>

        <div className="mt-3 flex items-start gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">
            <WalletCards className="h-5 w-5 text-blue-600" />
          </div>

          <div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Yeni Ödeme Planı
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Müvekkil için ücret, peşinat ve taksit yapısını oluşturun.
            </p>

          </div>

        </div>

      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-6"
      >

        {/* GENERAL INFORMATION */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-2">

              <Scale className="h-5 w-5 text-blue-600" />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Plan Bilgileri
              </h2>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <Input
              label="Plan Başlığı *"
              name="title"
              value={
                formData.title
              }
              onChange={
                handleChange
              }
              error={
                errors.title
              }
              disabled={
                isPending
              }
              maxLength={255}
              placeholder="Örn: 2026 Hukuki Danışmanlık Ücreti"
            />

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
                  isPending
                }
                rows="3"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Planla ilgili kısa açıklama..."
              />

            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              {/* CLIENT */}

              <div>

                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Müvekkil *
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
                    isPending ||
                    clientsLoading
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">
                    {clientsLoading
                      ? 'Müvekkiller yükleniyor...'
                      : 'Müvekkil seçin'}
                  </option>

                  {clients.map(
                    (
                      client
                    ) => (
                      <option
                        key={
                          client.id
                        }
                        value={
                          client.id
                        }
                      >
                        {client.name}
                      </option>
                    )
                  )}

                </select>

                {errors.client_id && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.client_id}
                  </p>
                )}

              </div>

              {/* CASE */}

              <div>

                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Dava
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
                    isPending ||
                    !formData.client_id ||
                    clientCasesLoading
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">
                    {!formData.client_id
                      ? 'Önce müvekkil seçin'
                      : clientCasesLoading
                        ? 'Davalar yükleniyor...'
                        : cases.length > 0
                          ? 'Dava bağlantısı yok'
                          : 'Bu müvekkile ait dava bulunamadı'}
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
                        {caseItem.case_number
                          ? `${caseItem.case_number} - ${caseItem.title}`
                          : caseItem.title}
                      </option>
                    )
                  )}

                </select>

                {!formData.client_id && (
                  <p className="mt-1 text-xs text-gray-500">
                    Dava seçebilmek için önce müvekkili seçin.
                  </p>
                )}

              </div>

            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

              <Input
                label="Referans No"
                name="reference_number"
                value={
                  formData.reference_number
                }
                onChange={
                  handleChange
                }
                disabled={
                  isPending
                }
                placeholder="Örn: FIN-2026-001"
              />

              <Input
                label="Başlangıç Tarihi"
                name="start_date"
                type="date"
                value={
                  formData.start_date
                }
                onChange={
                  handleChange
                }
                disabled={
                  isPending
                }
              />

              <Input
                label="Bitiş Tarihi"
                name="end_date"
                type="date"
                value={
                  formData.end_date
                }
                onChange={
                  handleChange
                }
                error={
                  errors.end_date
                }
                disabled={
                  isPending
                }
              />

            </div>

          </Card.Body>

        </Card>

        {/* MONEY */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-2">

              <CreditCard className="h-5 w-5 text-green-600" />

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Ücret ve Taksit Yapısı
                </h2>

                <p className="text-xs text-gray-500">
                  Anlaşılan toplam ücret ile tahsilat planını belirleyin.
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-6">

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <Input
                label="Toplam Anlaşılan Ücret *"
                name="total_amount"
                type="number"
                min="0"
                step="0.01"
                value={
                  formData.total_amount
                }
                onChange={
                  handleChange
                }
                error={
                  errors.total_amount
                }
                disabled={
                  isPending
                }
                placeholder="120000"
              />

              <Input
                label="Peşinat"
                name="down_payment_amount"
                type="number"
                min="0"
                step="0.01"
                value={
                  formData.down_payment_amount
                }
                onChange={
                  handleChange
                }
                error={
                  errors.down_payment_amount
                }
                disabled={
                  isPending
                }
              />

            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">

                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Toplam
                </p>

                <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                  {formatMoney(
                    totalAmount
                  )}
                </p>

              </div>

              <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">

                <p className="text-xs uppercase tracking-wide text-blue-600">
                  Peşinat
                </p>

                <p className="mt-2 text-lg font-bold text-blue-700 dark:text-blue-300">
                  {formatMoney(
                    downPayment
                  )}
                </p>

              </div>

              <div className="rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20">

                <p className="text-xs uppercase tracking-wide text-amber-600">
                  Taksitlenecek
                </p>

                <p className="mt-2 text-lg font-bold text-amber-700 dark:text-amber-300">
                  {formatMoney(
                    remainingAmount
                  )}
                </p>

              </div>

            </div>

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ödeme Yapısı
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                <button
                  type="button"
                  onClick={() =>
                    handlePlanTypeChange(
                      'one_time'
                    )
                  }
                  disabled={
                    isPending
                  }
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    isOneTime
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <p className="font-medium text-gray-900 dark:text-white">
                    Tek Ödeme
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Kalan tutar tek vadede tahsil edilir.
                  </p>

                </button>

                <button
                  type="button"
                  onClick={() =>
                    handlePlanTypeChange(
                      'installment'
                    )
                  }
                  disabled={
                    isPending
                  }
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    !isOneTime
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <p className="font-medium text-gray-900 dark:text-white">
                    Taksitli
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Kalan tutar aylık taksitlere bölünür.
                  </p>

                </button>

              </div>

            </div>

            {remainingAmount >
              0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                <Input
                  label="Taksit Sayısı"
                  name="installment_count"
                  type="number"
                  min="1"
                  max="120"
                  value={
                    isOneTime
                      ? '1'
                      : formData.installment_count
                  }
                  onChange={
                    handleChange
                  }
                  error={
                    errors.installment_count
                  }
                  disabled={
                    isPending ||
                    isOneTime
                  }
                />

                <Input
                  label="İlk Vade Tarihi *"
                  name="first_due_date"
                  type="date"
                  value={
                    formData.first_due_date
                  }
                  onChange={
                    handleChange
                  }
                  error={
                    errors.first_due_date
                  }
                  disabled={
                    isPending
                  }
                />

              </div>
            )}

          </Card.Body>

        </Card>

        {/* INSTALLMENT PREVIEW */}

        {installmentPreview.length >
          0 && (
          <Card>

            <Card.Header>

              <div className="flex items-center justify-between gap-3">

                <div className="flex items-center gap-2">

                  <CalendarDays className="h-5 w-5 text-purple-600" />

                  <div>

                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      Taksit Önizlemesi
                    </h2>

                    <p className="text-xs text-gray-500">
                      Plan oluşturulduğunda backend bu taksitleri otomatik oluşturacak.
                    </p>

                  </div>

                </div>

                <Badge variant="default">
                  {installmentPreview.length}{' '}
                  taksit
                </Badge>

              </div>

            </Card.Header>

            <Card.Body>

              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">

                {installmentPreview.map(
                  (
                    installment,
                    index
                  ) => (
                    <div
                      key={
                        installment.installment_number
                      }
                      className={`flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between ${
                        index !==
                        installmentPreview.length -
                          1
                          ? 'border-b border-gray-200 dark:border-gray-700'
                          : ''
                      }`}
                    >

                      <div>

                        <p className="font-medium text-gray-900 dark:text-white">
                          {installment.installment_number}. Taksit
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Vade:{' '}
                          {installment.due_date}
                        </p>

                      </div>

                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatMoney(
                          installment.amount
                        )}
                      </p>

                    </div>
                  )
                )}

              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-800">

                <span className="text-sm font-medium text-gray-500">
                  Taksit Toplamı
                </span>

                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatMoney(
                    previewTotal
                  )}
                </span>

              </div>

            </Card.Body>

          </Card>
        )}

        {/* REMINDERS */}

        <Card>

          <Card.Header>

            <h2 className="font-semibold text-gray-900 dark:text-white">
              Tahsilat Hatırlatmaları
            </h2>

          </Card.Header>

          <Card.Body className="space-y-5">

            <label className="flex items-center gap-3">

              <input
                type="checkbox"
                name="auto_reminders_enabled"
                checked={
                  formData.auto_reminders_enabled
                }
                onChange={
                  handleChange
                }
                disabled={
                  isPending
                }
                className="h-4 w-4 rounded border-gray-300"
              />

              <div>

                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Otomatik hatırlatmaları etkinleştir
                </p>

                <p className="text-xs text-gray-500">
                  Vadesi yaklaşan ve geciken taksitlerin takip edilmesini sağlar.
                </p>

              </div>

            </label>

            {formData.auto_reminders_enabled && (
              <>

                <Input
                  label="Vade Öncesi Hatırlatma"
                  name="remind_days_before"
                  type="number"
                  min="0"
                  max="365"
                  value={
                    formData.remind_days_before
                  }
                  onChange={
                    handleChange
                  }
                  error={
                    errors.remind_days_before
                  }
                  disabled={
                    isPending
                  }
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      name="notify_on_due_date"
                      checked={
                        formData.notify_on_due_date
                      }
                      onChange={
                        handleChange
                      }
                    />
                    Vade gününde bildir
                  </label>

                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      name="notify_on_overdue"
                      checked={
                        formData.notify_on_overdue
                      }
                      onChange={
                        handleChange
                      }
                    />
                    Gecikmede bildir
                  </label>

                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      name="notify_in_app"
                      checked={
                        formData.notify_in_app
                      }
                      onChange={
                        handleChange
                      }
                    />
                    Uygulama içi bildirim
                  </label>

                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      name="notify_by_email"
                      checked={
                        formData.notify_by_email
                      }
                      onChange={
                        handleChange
                      }
                    />
                    E-posta bildirimi
                  </label>

                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      name="notify_by_sms"
                      checked={
                        formData.notify_by_sms
                      }
                      onChange={
                        handleChange
                      }
                    />
                    SMS bildirimi
                  </label>

                </div>

              </>
            )}

          </Card.Body>

        </Card>

        {/* NOTES */}

        <Card>

          <Card.Header>

            <h2 className="font-semibold text-gray-900 dark:text-white">
              Finans Notu
            </h2>

          </Card.Header>

          <Card.Body>

            <textarea
              name="notes"
              value={
                formData.notes
              }
              onChange={
                handleChange
              }
              rows="4"
              disabled={
                isPending
              }
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Ücret anlaşması veya tahsilat planıyla ilgili özel notlar..."
            />

          </Card.Body>

        </Card>

        {/* ACTIONS */}

        <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">

          <Button
            type="submit"
            loading={
              isPending
            }
            disabled={
              isPending
            }
          >
            <Save className="mr-2 h-4 w-4" />
            Ödeme Planını Oluştur
          </Button>

          <Button
            type="button"
            variant="secondary"
            disabled={
              isPending
            }
            onClick={() =>
              navigate(
                '/finance'
              )
            }
          >
            Vazgeç
          </Button>

        </div>

      </form>

    </div>
  );
};

export default PaymentPlanCreate;
