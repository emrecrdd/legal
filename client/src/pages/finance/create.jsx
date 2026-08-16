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
  useQuery,
} from '@tanstack/react-query';

import {
  useCreatePayment,
  usePaymentPlan,
  usePaymentPlans,
} from '../../features/payments/payment.query.js';

import clientApi from '../../features/clients/client.api.js';
import caseApi from '../../features/cases/case.api.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  ArrowLeft,
  Banknote,
  CircleDollarSign,
  CreditCard,
  ReceiptText,
  Save,
  Scale,
  Undo2,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const INITIAL_FORM = {
  client_id: '',
  case_id: '',
  payment_plan_id: '',
  installment_id: '',

  payment_type: 'received',
  payment_method: 'bank_transfer',
  status: 'completed',

  amount: '',

  payment_date:
    new Date()
      .toISOString()
      .slice(
        0,
        16
      ),

  description: '',
  transaction_id: '',
  receipt_number: '',
  notes: '',
};

const PAYMENT_TYPES = [
  {
    value: 'received',
    label: 'Tahsilat',
    description:
      'Müvekkilden alınan ödeme',
    icon:
      CircleDollarSign,
  },
  {
    value: 'expense',
    label: 'Gider',
    description:
      'Dosya veya müvekkil adına yapılan gider',
    icon:
      Banknote,
  },
  {
    value: 'refund',
    label: 'İade',
    description:
      'Müvekkile yapılan para iadesi',
    icon:
      Undo2,
  },
];

const PAYMENT_METHODS = [
  {
    value: 'cash',
    label: 'Nakit',
  },
  {
    value: 'bank_transfer',
    label: 'Banka Transferi',
  },
  {
    value: 'credit_card',
    label: 'Kredi Kartı',
  },
  {
    value: 'check',
    label: 'Çek',
  },
  {
    value: 'other',
    label: 'Diğer',
  },
];

// ======================================================
// HELPERS
// ======================================================

const normalizeNullable = (
  value
) => {
  const normalized =
    String(
      value ?? ''
    ).trim();

  return (
    normalized ||
    null
  );
};

const toNumber = (
  value
) => {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
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
    toNumber(
      value
    )
  );
};

// ======================================================
// COMPONENT
// ======================================================

const FinanceCreate = () => {
  const navigate =
    useNavigate();

  const createMutation =
    useCreatePayment();

  const [
    formData,
    setFormData,
  ] =
    useState(
      INITIAL_FORM
    );

  const [
    errors,
    setErrors,
  ] =
    useState({});

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
        'clients',
        'finance-select',
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
      clientsData
        ?.data
        ?.data
    )
      ? clientsData.data.data
      : [];

  // ======================================================
  // CASES
  // ======================================================

  const {
    data:
      casesData,

    isLoading:
      casesLoading,
  } =
    useQuery({
      queryKey: [
        'cases',
        'finance-select',
        formData.client_id,
      ],

      queryFn: () =>
        caseApi.getAll({
          client_id:
            formData.client_id,

          page:
            1,

          limit:
            100,
        }),

      enabled:
        Boolean(
          formData.client_id
        ),

      staleTime:
        5 * 60 * 1000,
    });

  const cases =
    Array.isArray(
      casesData
        ?.data
        ?.data
    )
      ? casesData.data.data
      : [];

  // ======================================================
  // PAYMENT PLANS
  // ======================================================

  const {
    data:
      plansData,

    isLoading:
      plansLoading,
  } =
    usePaymentPlans({
      page:
        1,

      limit:
        100,

      client_id:
        formData.client_id ||
        undefined,

      case_id:
        formData.case_id ||
        undefined,
    });

  const plans =
    Array.isArray(
      plansData
        ?.data
        ?.data
    )
      ? plansData.data.data
      : [];

  const selectablePlans =
    useMemo(() => {
      return plans.filter(
        (
          plan
        ) =>
          [
            'active',
            'draft',
          ].includes(
            plan.status
          )
      );
    }, [
      plans,
    ]);

  const selectedPlan =
    useMemo(() => {
      return (
        selectablePlans.find(
          (
            plan
          ) =>
            plan.id ===
            formData.payment_plan_id
        ) ||
        null
      );
    }, [
      selectablePlans,
      formData.payment_plan_id,
    ]);

  // ======================================================
  // SELECTED PLAN DETAIL
  //
  // findAll() taksitleri döndürmüyor.
  // Plan seçildiğinde findOne() ile detail çekiyoruz.
  // ======================================================

  const {
    data:
      selectedPlanData,

    isLoading:
      selectedPlanLoading,

    error:
      selectedPlanError,
  } =
    usePaymentPlan(
      formData.payment_plan_id
    );

  const selectedPlanDetail =
    selectedPlanData
      ?.data
      ?.data ??
    selectedPlanData
      ?.data ??
    null;

  const installments =
    Array.isArray(
      selectedPlanDetail
        ?.installments
    )
      ? selectedPlanDetail.installments
      : [];

  const selectableInstallments =
    useMemo(() => {
      return installments.filter(
        (
          installment
        ) =>
          ![
            'paid',
            'cancelled',
          ].includes(
            installment.status
          )
      );
    }, [
      installments,
    ]);

  const selectedInstallment =
    useMemo(() => {
      return (
        selectableInstallments.find(
          (
            installment
          ) =>
            installment.id ===
            formData.installment_id
        ) ||
        null
      );
    }, [
      selectableInstallments,
      formData.installment_id,
    ]);

  // ======================================================
  // DERIVED
  // ======================================================

  const isExpense =
    formData.payment_type ===
    'expense';

  const isReceived =
    formData.payment_type ===
    'received';

  const currency =
    selectedPlanDetail
      ?.currency ||
    selectedPlan
      ?.currency ||
    'TRY';

  const installmentRemaining =
    selectedInstallment
      ? Math.max(
          toNumber(
            selectedInstallment.amount
          ) -
            toNumber(
              selectedInstallment.paid_amount
            ),
          0
        )
      : 0;

  // ======================================================
  // SYNC RELATED FIELDS
  // ======================================================

  useEffect(() => {
    setFormData(
      (
        current
      ) => ({
        ...current,

        case_id:
          '',

        payment_plan_id:
          '',

        installment_id:
          '',
      })
    );
  }, [
    formData.client_id,
  ]);

  useEffect(() => {
    setFormData(
      (
        current
      ) => ({
        ...current,

        payment_plan_id:
          '',

        installment_id:
          '',
      })
    );
  }, [
    formData.case_id,
  ]);

  useEffect(() => {
    setFormData(
      (
        current
      ) => ({
        ...current,

        installment_id:
          '',
      })
    );
  }, [
    formData.payment_plan_id,
  ]);

  useEffect(() => {
    if (
      !isExpense
    ) {
      return;
    }

    setFormData(
      (
        current
      ) => ({
        ...current,

        installment_id:
          '',
      })
    );
  }, [
    isExpense,
  ]);

  // ======================================================
  // CHANGE
  // ======================================================

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } =
      event.target;

    setFormData(
      (
        current
      ) => ({
        ...current,

        [name]:
          value,
      })
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

  // ======================================================
  // PAYMENT TYPE
  // ======================================================

  const handlePaymentTypeChange =
    (
      type
    ) => {
      if (
        createMutation.isPending
      ) {
        return;
      }

      setFormData(
        (
          current
        ) => ({
          ...current,

          payment_type:
            type,

          installment_id:
            type ===
            'expense'
              ? ''
              : current.installment_id,
        })
      );

      setErrors(
        (
          current
        ) => ({
          ...current,

          payment_type:
            '',

          installment_id:
            '',
        })
      );
    };

  // ======================================================
  // APPLY INSTALLMENT BALANCE
  // ======================================================

  const applyInstallmentBalance =
    () => {
      if (
        installmentRemaining <=
        0
      ) {
        return;
      }

      setFormData(
        (
          current
        ) => ({
          ...current,

          amount:
            String(
              installmentRemaining
            ),
        })
      );

      setErrors(
        (
          current
        ) => ({
          ...current,

          amount:
            '',
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

      const amount =
        toNumber(
          formData.amount
        );

      if (
        !formData.client_id
      ) {
        nextErrors.client_id =
          'Müvekkil seçilmelidir';
      }

      if (
        !formData.amount
      ) {
        nextErrors.amount =
          'Tutar gereklidir';
      } else if (
        amount <=
        0
      ) {
        nextErrors.amount =
          'Tutar 0’dan büyük olmalıdır';
      }

      if (
        !formData.payment_type
      ) {
        nextErrors.payment_type =
          'Finans hareketi türü seçilmelidir';
      }

      if (
        !formData.payment_method
      ) {
        nextErrors.payment_method =
          'Ödeme yöntemi seçilmelidir';
      }

      if (
        !formData.payment_date
      ) {
        nextErrors.payment_date =
          'İşlem tarihi gereklidir';
      }

      if (
        isExpense &&
        formData.installment_id
      ) {
        nextErrors.installment_id =
          'Gider hareketi taksite bağlanamaz';
      }

      if (
        formData.installment_id &&
        selectedInstallment &&
        installmentRemaining <=
          0
      ) {
        nextErrors.installment_id =
          'Seçilen taksidin kalan borcu bulunmuyor';
      }

      setErrors(
        nextErrors
      );

      return (
        Object.keys(
          nextErrors
        ).length ===
        0
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
      createMutation.isPending
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
      amount:
        toNumber(
          formData.amount
        ),

      description:
        normalizeNullable(
          formData.description
        ),

      payment_type:
        formData.payment_type,

      payment_method:
        formData.payment_method,

      status:
        formData.status,

      payment_date:
        formData.payment_date,

      transaction_id:
        normalizeNullable(
          formData.transaction_id
        ),

      receipt_number:
        normalizeNullable(
          formData.receipt_number
        ),

      client_id:
        formData.client_id,

      case_id:
        normalizeNullable(
          formData.case_id
        ),

      payment_plan_id:
        normalizeNullable(
          formData.payment_plan_id
        ),

      installment_id:
        isExpense
          ? null
          : normalizeNullable(
              formData.installment_id
            ),

      notes:
        normalizeNullable(
          formData.notes
        ),
    };

    createMutation.mutate(
      payload,
      {
        onSuccess:
          (
            response
          ) => {
            const payment =
              response
                ?.data
                ?.data ??
              response
                ?.data ??
              null;

            if (
              payment
                ?.payment_plan_id
            ) {
              navigate(
                `/payments/plans/${payment.payment_plan_id}`
              );

              return;
            }

            navigate(
              '/finance'
            );
          },

        onError:
          (
            error
          ) => {
            const message =
              error
                ?.response
                ?.data
                ?.message ||
              error
                ?.message ||
              '';

            if (
              /müvekkil/i.test(
                message
              )
            ) {
              setErrors({
                client_id:
                  message,
              });

              return;
            }

            if (
              /taksit/i.test(
                message
              )
            ) {
              setErrors({
                installment_id:
                  message,
              });

              return;
            }

            if (
              /ödeme planı/i.test(
                message
              )
            ) {
              setErrors({
                payment_plan_id:
                  message,
              });
            }
          },
      }
    );
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* HEADER */}

      <div>

        <Link
          to="/finance"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />

          Finans
        </Link>

        <div className="mt-3 flex items-start gap-3">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">

            <ReceiptText className="h-5 w-5 text-blue-600" />

          </div>

          <div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Yeni Finans Hareketi
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Tahsilat, gider veya iade kaydı oluşturun ve gerekiyorsa ödeme planı ile ilişkilendirin.
            </p>

          </div>

        </div>

      </div>

      <Card>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-7 p-6"
        >

          {/* PAYMENT TYPE */}

          <div>

            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Finans Hareketi Türü
            </label>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

              {PAYMENT_TYPES.map(
                (
                  item
                ) => {
                  const Icon =
                    item.icon;

                  const active =
                    formData.payment_type ===
                    item.value;

                  return (
                    <button
                      key={
                        item.value
                      }
                      type="button"
                      disabled={
                        createMutation.isPending
                      }
                      onClick={() =>
                        handlePaymentTypeChange(
                          item.value
                        )
                      }
                      className={`rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        active
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                      }`}
                    >

                      <div className="flex items-start gap-3">

                        <Icon className="mt-0.5 h-5 w-5 text-blue-600" />

                        <div>

                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.label}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-gray-500">
                            {item.description}
                          </p>

                        </div>

                      </div>

                    </button>
                  );
                }
              )}

            </div>

          </div>

          {/* CLIENT / CASE */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

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
                  createMutation.isPending ||
                  clientsLoading
                }
                className={`w-full rounded-md border bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:text-white ${
                  errors.client_id
                    ? 'border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
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

            <div>

              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                İlişkili Dava
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
                  createMutation.isPending ||
                  !formData.client_id ||
                  casesLoading
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >

                <option value="">
                  {!formData.client_id
                    ? 'Önce müvekkil seçin'
                    : casesLoading
                      ? 'Davalar yükleniyor...'
                      : 'Dava bağlantısı yok'}
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

              {formData.client_id &&
                !casesLoading &&
                cases.length ===
                  0 && (
                  <p className="mt-1 text-xs text-gray-400">
                    Bu müvekkile bağlı dava bulunmuyor.
                  </p>
                )}

            </div>

          </div>

          {/* PAYMENT PLAN */}

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">

            <div className="mb-4 flex items-start gap-3">

              <Scale className="mt-0.5 h-5 w-5 text-purple-600" />

              <div>

                <p className="font-medium text-gray-900 dark:text-white">
                  Ödeme Planı Bağlantısı
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Bir tahsilatı ödeme planına veya belirli taksite bağladığınızda kalan bakiye otomatik güncellenir.
                </p>

              </div>

            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <div>

                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ödeme Planı
                </label>

                <select
                  name="payment_plan_id"
                  value={
                    formData.payment_plan_id
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    createMutation.isPending ||
                    !formData.client_id ||
                    plansLoading
                  }
                  className={`w-full rounded-md border bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:text-white ${
                    errors.payment_plan_id
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >

                  <option value="">
                    {!formData.client_id
                      ? 'Önce müvekkil seçin'
                      : plansLoading
                        ? 'Planlar yükleniyor...'
                        : 'Plan bağlantısı yok'}
                  </option>

                  {selectablePlans.map(
                    (
                      plan
                    ) => (
                      <option
                        key={
                          plan.id
                        }
                        value={
                          plan.id
                        }
                      >
                        {plan.title} -{' '}
                        {formatCurrency(
                          plan.total_amount,
                          plan.currency
                        )}
                      </option>
                    )
                  )}

                </select>

                {errors.payment_plan_id && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.payment_plan_id}
                  </p>
                )}

              </div>

              <div>

                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Taksit
                </label>

                <select
                  name="installment_id"
                  value={
                    formData.installment_id
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    createMutation.isPending ||
                    !formData.payment_plan_id ||
                    selectedPlanLoading ||
                    isExpense
                  }
                  className={`w-full rounded-md border bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:text-white ${
                    errors.installment_id
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >

                  <option value="">
                    {isExpense
                      ? 'Gider taksite bağlanamaz'
                      : !formData.payment_plan_id
                        ? 'Önce ödeme planı seçin'
                        : selectedPlanLoading
                          ? 'Taksitler yükleniyor...'
                          : 'Belirli taksite bağlama'}
                  </option>

                  {selectableInstallments.map(
                    (
                      installment
                    ) => {
                      const remaining =
                        Math.max(
                          toNumber(
                            installment.amount
                          ) -
                            toNumber(
                              installment.paid_amount
                            ),
                          0
                        );

                      return (
                        <option
                          key={
                            installment.id
                          }
                          value={
                            installment.id
                          }
                        >
                          {installment.installment_number}. Taksit -{' '}
                          {formatCurrency(
                            remaining,
                            currency
                          )}{' '}
                          kalan
                        </option>
                      );
                    }
                  )}

                </select>

                {errors.installment_id && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.installment_id}
                  </p>
                )}

                {selectedPlanError && (
                  <p className="mt-1 text-xs text-red-500">
                    Ödeme planı detayları alınamadı.
                  </p>
                )}

                {formData.payment_plan_id &&
                  !selectedPlanLoading &&
                  !selectedPlanError &&
                  selectableInstallments.length ===
                    0 &&
                  !isExpense && (
                    <p className="mt-1 text-xs text-gray-400">
                      Bu planda açık taksit bulunmuyor.
                    </p>
                  )}

              </div>

            </div>

            {selectedPlanDetail && (
              <div className="mt-4 flex flex-wrap gap-2">

                <Badge variant="default">
                  {selectedPlanDetail.title}
                </Badge>

                <Badge variant="info">
                  {formatCurrency(
                    selectedPlanDetail.total_amount,
                    selectedPlanDetail.currency
                  )}
                </Badge>

                <Badge
                  variant={
                    selectedPlanDetail.status ===
                    'active'
                      ? 'success'
                      : 'warning'
                  }
                >
                  {selectedPlanDetail.status ===
                  'active'
                    ? 'Aktif'
                    : 'Taslak'}
                </Badge>

              </div>
            )}

            {selectedInstallment && (
              <div className="mt-4 flex flex-col gap-3 rounded-lg bg-white p-3 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Seçili taksit kalan tutarı
                  </p>

                  <p className="mt-1 text-lg font-bold text-amber-600">
                    {formatCurrency(
                      installmentRemaining,
                      currency
                    )}
                  </p>

                </div>

                {isReceived &&
                  installmentRemaining >
                    0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={
                        applyInstallmentBalance
                      }
                    >
                      Kalan Tutarı Kullan
                    </Button>
                  )}

              </div>
            )}

          </div>

          {/* AMOUNT / METHOD */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <Input
              label="Tutar *"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={
                formData.amount
              }
              onChange={
                handleChange
              }
              error={
                errors.amount
              }
              disabled={
                createMutation.isPending
              }
              placeholder="0,00"
            />

            <div>

              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ödeme Yöntemi *
              </label>

              <select
                name="payment_method"
                value={
                  formData.payment_method
                }
                onChange={
                  handleChange
                }
                disabled={
                  createMutation.isPending
                }
                className={`w-full rounded-md border bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:text-white ${
                  errors.payment_method
                    ? 'border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >

                {PAYMENT_METHODS.map(
                  (
                    item
                  ) => (
                    <option
                      key={
                        item.value
                      }
                      value={
                        item.value
                      }
                    >
                      {item.label}
                    </option>
                  )
                )}

              </select>

              {errors.payment_method && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.payment_method}
                </p>
              )}

            </div>

          </div>

          {/* STATUS / DATE */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <div>

              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Durum
              </label>

              <select
                name="status"
                value={
                  formData.status
                }
                onChange={
                  handleChange
                }
                disabled={
                  createMutation.isPending
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="completed">
                  Tamamlandı
                </option>

                <option value="pending">
                  Bekliyor
                </option>

                <option value="cancelled">
                  İptal
                </option>
              </select>

            </div>

            <Input
              label="İşlem Tarihi *"
              name="payment_date"
              type="datetime-local"
              value={
                formData.payment_date
              }
              onChange={
                handleChange
              }
              error={
                errors.payment_date
              }
              disabled={
                createMutation.isPending
              }
            />

          </div>

          {/* DESCRIPTION */}

          <Input
            label="Açıklama"
            name="description"
            value={
              formData.description
            }
            onChange={
              handleChange
            }
            disabled={
              createMutation.isPending
            }
            placeholder={
              isReceived
                ? 'Örn: 1. taksit tahsilatı'
                : isExpense
                  ? 'Örn: Dosya bilirkişi gideri'
                  : 'Örn: Fazla tahsilat iadesi'
            }
          />

          {/* REFERENCES */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <Input
              label="İşlem / Dekont No"
              name="transaction_id"
              value={
                formData.transaction_id
              }
              onChange={
                handleChange
              }
              disabled={
                createMutation.isPending
              }
              placeholder="Banka işlem numarası"
            />

            <Input
              label="Makbuz No"
              name="receipt_number"
              value={
                formData.receipt_number
              }
              onChange={
                handleChange
              }
              disabled={
                createMutation.isPending
              }
              placeholder="Makbuz numarası"
            />

          </div>

          {/* NOTES */}

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Finans Notu
            </label>

            <textarea
              name="notes"
              value={
                formData.notes
              }
              onChange={
                handleChange
              }
              disabled={
                createMutation.isPending
              }
              rows="4"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Bu hareketle ilgili iç not..."
            />

          </div>

          {/* INFO */}

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-900/10 dark:text-blue-200">

            <div className="flex items-start gap-3">

              <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />

              <p>
                Tamamlanmış finans hareketlerinin tutarı sonradan doğrudan değiştirilmez. Hatalı kayıtlar ters kayıt yöntemiyle düzeltilir.
              </p>

            </div>

          </div>

          {/* ACTIONS */}

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">

            <Button
              type="submit"
              loading={
                createMutation.isPending
              }
              disabled={
                createMutation.isPending
              }
            >
              <Save className="mr-2 h-4 w-4" />

              Finans Hareketini Kaydet
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={
                createMutation.isPending
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

      </Card>

    </div>
  );
};

export default FinanceCreate;