import {
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  useMutation,
  useQuery,
} from '@tanstack/react-query';

import caseApi from '../../features/cases/case.api.js';
import clientApi from '../../features/clients/client.api.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  Gavel,
  Plus,
  Save,
  Scale,
  UserRound,
  Users,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const INITIAL_FORM = {
  judiciary_type: '',
  judiciary_unit: '',
  court_name: '',
  case_number: '',
  client_ids: [],
  assigned_to: '',
  status: 'preparation',
  priority: 'normal',
  subject: '',
  description: '',
  opening_date: '',
};

const STATUS_OPTIONS = [
  {
    value: 'preparation',
    label: 'Hazırlık',
  },
  {
    value: 'active',
    label: 'Devam Ediyor',
  },
  {
    value: 'hearing',
    label: 'Duruşmada',
  },
  {
    value: 'appeal',
    label: 'İstinaf',
  },
  {
    value: 'cassation',
    label: 'Temyiz',
  },
  {
    value: 'concluded',
    label: 'Sonuçlandı',
  },
  {
    value: 'archived',
    label: 'Arşivlendi',
  },
];

const PRIORITY_OPTIONS = [
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

// ======================================================
// HELPERS
// ======================================================

const getStatusVariant = (
  status
) => {
  const variants = {
    preparation: 'warning',
    active: 'success',
    hearing: 'info',
    appeal: 'warning',
    cassation: 'default',
    concluded: 'default',
    archived: 'danger',
  };

  return (
    variants[status] ||
    'default'
  );
};

const getStatusLabel = (
  status
) => {
  return (
    STATUS_OPTIONS.find(
      (item) =>
        item.value ===
        status
    )?.label ||
    status
  );
};

const getPriorityVariant = (
  priority
) => {
  const variants = {
    low: 'default',
    normal: 'primary',
    high: 'warning',
    critical: 'danger',
  };

  return (
    variants[priority] ||
    'default'
  );
};

const getPriorityLabel = (
  priority
) => {
  return (
    PRIORITY_OPTIONS.find(
      (item) =>
        item.value ===
        priority
    )?.label ||
    priority
  );
};

const normalizeText = (
  value
) => {
  return String(
    value || ''
  )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
};

const normalizeNullable = (
  value
) => {
  const normalized =
    normalizeText(
      value
    );

  return normalized || null;
};

const isFutureDate = (
  value
) => {
  if (!value) {
    return false;
  }

  const selected =
    new Date(
      `${value}T00:00:00`
    );

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  return (
    selected >
    today
  );
};

// ======================================================
// COMPONENT
// ======================================================

const CaseCreate = () => {
  const navigate =
    useNavigate();

  const {
    user,
  } = useAuth();

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

  const [
    clientToAdd,
    setClientToAdd,
  ] =
    useState('');

  // ======================================================
  // QUERIES
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
        {
          limit: 100,
        },
      ],

      queryFn: () =>
        clientApi.getAll({
          limit: 100,
        }),
    });

  const {
    data:
      lawyersData,
    isLoading:
      lawyersLoading,
  } =
    useQuery({
      queryKey: [
        'case-assignable-lawyers',
      ],

      queryFn: () =>
        caseApi.getAssignableLawyers(),
    });

  // ======================================================
  // DATA
  // ======================================================

  const clients =
    Array.isArray(
      clientsData?.data?.data
    )
      ? clientsData.data.data
      : [];

  const lawyers =
    Array.isArray(
      lawyersData?.data?.data
    )
      ? lawyersData.data.data
      : [];

  const selectedClients =
    useMemo(() => {
      return clients.filter(
        (
          client
        ) =>
          formData.client_ids.includes(
            client.id
          )
      );
    }, [
      clients,
      formData.client_ids,
    ]);

  const availableClients =
    useMemo(() => {
      return clients.filter(
        (
          client
        ) =>
          !formData.client_ids.includes(
            client.id
          )
      );
    }, [
      clients,
      formData.client_ids,
    ]);

  const isDirty =
    useMemo(() => {
      return (
        normalizeText(
          formData.judiciary_type
        ) !== '' ||
        normalizeText(
          formData.judiciary_unit
        ) !== '' ||
        normalizeText(
          formData.court_name
        ) !== '' ||
        normalizeText(
          formData.case_number
        ) !== '' ||
        formData.client_ids.length >
          0 ||
        formData.assigned_to !==
          '' ||
        formData.status !==
          'preparation' ||
        formData.priority !==
          'normal' ||
        normalizeText(
          formData.subject
        ) !== '' ||
        normalizeText(
          formData.description
        ) !== '' ||
        formData.opening_date !==
          ''
      );
    }, [
      formData,
    ]);

  // ======================================================
  // MUTATION
  // ======================================================

  const mutation =
    useMutation({
      mutationFn: (
        data
      ) =>
        caseApi.create(
          data
        ),

      onSuccess: (
        response
      ) => {
        toast.success(
          'Dava başarıyla oluşturuldu'
        );

        const id =
          response?.data
            ?.data?.id;

        if (id) {
          navigate(
            `/cases/${id}`
          );

          return;
        }

        navigate(
          '/cases'
        );
      },

      onError: (
        error
      ) => {
        const backendErrors =
          error?.response
            ?.data?.errors;

        const message =
          error?.response
            ?.data?.message ||
          error?.message ||
          'Dava oluşturulamadı';

        const nextErrors =
          {};

        if (
          Array.isArray(
            backendErrors
          )
        ) {
          backendErrors.forEach(
            (
              item
            ) => {
              const field =
                item?.path ||
                item?.param;

              if (
                field
              ) {
                nextErrors[field] =
                  item?.msg ||
                  'Geçersiz değer';
              }
            }
          );
        }

        if (
          /yargı türü|judiciary_type/i.test(
            message
          )
        ) {
          nextErrors.judiciary_type =
            message;
        }

        if (
          /yargı birimi|judiciary_unit/i.test(
            message
          )
        ) {
          nextErrors.judiciary_unit =
            message;
        }

        if (
          /mahkeme|court_name/i.test(
            message
          )
        ) {
          nextErrors.court_name =
            message;
        }

        if (
          /dosya|esas|case_number/i.test(
            message
          )
        ) {
          nextErrors.case_number =
            message;
        }

        if (
          /müvekkil|client_ids/i.test(
            message
          )
        ) {
          nextErrors.client_ids =
            message;
        }

        if (
          /konu|subject/i.test(
            message
          )
        ) {
          nextErrors.subject =
            message;
        }

        if (
          /açıklama|description/i.test(
            message
          )
        ) {
          nextErrors.description =
            message;
        }

        if (
          /açılış|opening_date/i.test(
            message
          )
        ) {
          nextErrors.opening_date =
            message;
        }

        if (
          Object.keys(
            nextErrors
          ).length >
          0
        ) {
          setErrors(
            (
              current
            ) => ({
              ...current,
              ...nextErrors,
            })
          );

          toast.error(
            'Formdaki hatalı alanları kontrol edin'
          );

          return;
        }

        toast.error(
          message
        );
      },
    });

  // ======================================================
  // HANDLERS
  // ======================================================

  const handleChange =
    (
      event
    ) => {
      const {
        name,
        value,
      } =
        event.target;

      let nextValue =
        value;

      if (
        name ===
        'judiciary_type'
      ) {
        nextValue =
          value.slice(
            0,
            100
          );
      }

      if (
        name ===
        'judiciary_unit'
      ) {
        nextValue =
          value.slice(
            0,
            150
          );
      }

      if (
        name ===
        'court_name'
      ) {
        nextValue =
          value.slice(
            0,
            200
          );
      }

      if (
        name ===
        'case_number'
      ) {
        nextValue =
          value.slice(
            0,
            100
          );
      }

      if (
        name ===
        'subject'
      ) {
        nextValue =
          value.slice(
            0,
            255
          );
      }

      if (
        name ===
        'description'
      ) {
        nextValue =
          value.slice(
            0,
            5000
          );
      }

      setFormData(
        (
          current
        ) => ({
          ...current,
          [name]:
            nextValue,
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
  // CLIENTS
  // ======================================================

  const handleAddClient =
    () => {
      if (
        !clientToAdd
      ) {
        return;
      }

      if (
        formData.client_ids.includes(
          clientToAdd
        )
      ) {
        return;
      }

      setFormData(
        (
          current
        ) => ({
          ...current,

          client_ids: [
            ...current.client_ids,
            clientToAdd,
          ],
        })
      );

      setClientToAdd(
        ''
      );

      if (
        errors.client_ids
      ) {
        setErrors(
          (
            current
          ) => ({
            ...current,
            client_ids:
              '',
          })
        );
      }
    };

  const handleRemoveClient =
    (
      id
    ) => {
      setFormData(
        (
          current
        ) => ({
          ...current,

          client_ids:
            current.client_ids.filter(
              (
                clientId
              ) =>
                clientId !==
                id
            ),
        })
      );
    };

  // ======================================================
  // CANCEL
  // ======================================================

  const handleCancel =
    () => {
      if (
        mutation.isPending
      ) {
        return;
      }

      if (
        isDirty
      ) {
        const confirmed =
          window.confirm(
            'Kaydedilmemiş dava bilgileri var. Sayfadan ayrılmak istediğinize emin misiniz?'
          );

        if (
          !confirmed
        ) {
          return;
        }
      }

      navigate(
        '/cases'
      );
    };

  // ======================================================
  // SUBMIT
  // ======================================================

  const handleSubmit =
    (
      event
    ) => {
      event.preventDefault();

      if (
        mutation.isPending
      ) {
        return;
      }

      const newErrors =
        {};

      const judiciaryType =
        normalizeText(
          formData.judiciary_type
        );

      const judiciaryUnit =
        normalizeText(
          formData.judiciary_unit
        );

      const courtName =
        normalizeText(
          formData.court_name
        );

      const caseNumber =
        normalizeText(
          formData.case_number
        );

      const subject =
        normalizeText(
          formData.subject
        );

      const description =
        String(
          formData.description ||
          ''
        ).trim();

      // ==================================================
      // JUDICIARY TYPE
      // ==================================================

      if (
        !judiciaryType
      ) {
        newErrors.judiciary_type =
          'Yargı türü gereklidir';
      } else if (
        judiciaryType.length >
        100
      ) {
        newErrors.judiciary_type =
          'Yargı türü en fazla 100 karakter olabilir';
      }

      // ==================================================
      // JUDICIARY UNIT
      // ==================================================

      if (
        !judiciaryUnit
      ) {
        newErrors.judiciary_unit =
          'Yargı birimi gereklidir';
      } else if (
        judiciaryUnit.length >
        150
      ) {
        newErrors.judiciary_unit =
          'Yargı birimi en fazla 150 karakter olabilir';
      }

      // ==================================================
      // COURT
      // ==================================================

      if (
        courtName.length >
        200
      ) {
        newErrors.court_name =
          'Mahkeme adı en fazla 200 karakter olabilir';
      }

      // ==================================================
      // CASE NUMBER
      // ==================================================

      if (
        caseNumber.length >
        100
      ) {
        newErrors.case_number =
          'Dosya / esas numarası en fazla 100 karakter olabilir';
      }

      // ==================================================
      // CLIENT
      // ==================================================

      if (
        formData.client_ids.length ===
        0
      ) {
        newErrors.client_ids =
          'En az bir müvekkil seçilmelidir';
      }

      // ==================================================
      // OPENING DATE
      // ==================================================

      if (
        formData.opening_date &&
        isFutureDate(
          formData.opening_date
        )
      ) {
        newErrors.opening_date =
          'Dava açılış tarihi bugünden ileri bir tarih olamaz';
      }

      // ==================================================
      // SUBJECT
      // ==================================================

      if (
        subject.length >
        255
      ) {
        newErrors.subject =
          'Dava konusu en fazla 255 karakter olabilir';
      }

      // ==================================================
      // DESCRIPTION
      // ==================================================

      if (
        description.length >
        5000
      ) {
        newErrors.description =
          'Açıklama en fazla 5000 karakter olabilir';
      }

      if (
        Object.keys(
          newErrors
        ).length >
        0
      ) {
        setErrors(
          newErrors
        );

        toast.error(
          'Formdaki eksik veya hatalı alanları kontrol edin'
        );

        return;
      }

      const title =
        `${judiciaryType} - ${judiciaryUnit}`;

      const submitData = {
        ...formData,

        title,

        judiciary_type:
          judiciaryType,

        judiciary_unit:
          judiciaryUnit,

        court_name:
          courtName ||
          null,

        case_number:
          caseNumber ||
          null,

        subject:
          subject ||
          null,

        description:
          description ||
          null,

        assigned_to:
          formData.assigned_to ||
          null,

        opening_date:
          formData.opening_date ||
          null,
      };

      mutation.mutate(
        submitData
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
          to="/cases"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Davalar
        </Link>

        <div className="mt-3 flex items-start gap-3">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">
            <Gavel size={21} />
          </div>

          <div>

            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
              Yeni Dava
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-slate-400">
              Dava dosyasının yargı bilgilerini, müvekkillerini ve sorumlu avukatı belirleyin.
            </p>

          </div>

        </div>

      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-5"
      >

        {/* YARGI */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/[0.08] dark:text-blue-400">
                <Scale size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Yargı Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Bilgileri dosyada yer aldığı şekliyle elle girebilirsiniz.
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <div className="grid gap-4 md:grid-cols-2">

              <Input
                label="Yargı Türü *"
                name="judiciary_type"
                value={
                  formData.judiciary_type
                }
                onChange={
                  handleChange
                }
                error={
                  errors.judiciary_type
                }
                disabled={
                  mutation.isPending
                }
                maxLength={100}
                placeholder="Örn: Hukuk, Ceza, İdare, CBS"
                autoFocus
              />

              <Input
                label="Yargı Birimi *"
                name="judiciary_unit"
                value={
                  formData.judiciary_unit
                }
                onChange={
                  handleChange
                }
                error={
                  errors.judiciary_unit
                }
                disabled={
                  mutation.isPending
                }
                maxLength={150}
                placeholder="Örn: Asliye Hukuk Mahkemesi"
              />

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <Input
                label="Mahkeme"
                name="court_name"
                value={
                  formData.court_name
                }
                onChange={
                  handleChange
                }
                error={
                  errors.court_name
                }
                disabled={
                  mutation.isPending
                }
                maxLength={200}
                placeholder="Örn: İstanbul 5. Asliye Hukuk Mahkemesi"
              />

              <Input
                label="Dosya / Esas No"
                name="case_number"
                value={
                  formData.case_number
                }
                onChange={
                  handleChange
                }
                error={
                  errors.case_number
                }
                disabled={
                  mutation.isPending
                }
                maxLength={100}
                placeholder="Örn: 2026/123 E."
              />

            </div>

            <Input
              label="Dava Açılış Tarihi"
              name="opening_date"
              type="date"
              value={
                formData.opening_date
              }
              onChange={
                handleChange
              }
              error={
                errors.opening_date
              }
              disabled={
                mutation.isPending
              }
            />

          </Card.Body>

        </Card>

        {/* MÜVEKKİLLER */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/[0.08] dark:text-emerald-400">
                <Users size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Müvekkiller
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Davaya en az bir müvekkil bağlayın.
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-4">

            <div className="flex flex-col gap-2 sm:flex-row">

              <select
                value={
                  clientToAdd
                }
                onChange={(
                  event
                ) =>
                  setClientToAdd(
                    event.target.value
                  )
                }
                disabled={
                  clientsLoading ||
                  mutation.isPending
                }
                className={`h-10 flex-1 rounded-lg border bg-white px-3.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/10 dark:bg-white/[0.035] dark:text-slate-300 ${
                  errors.client_ids
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                }`}
              >

                <option value="">
                  {clientsLoading
                    ? 'Müvekkiller yükleniyor...'
                    : availableClients.length ===
                        0
                      ? 'Eklenebilecek müvekkil yok'
                      : 'Müvekkil seçin'}
                </option>

                {availableClients.map(
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
                      {client.client_type ===
                        'corporate'
                        ? ' · Kurumsal'
                        : ' · Bireysel'}
                    </option>
                  )
                )}

              </select>

              <Button
                type="button"
                variant="secondary"
                onClick={
                  handleAddClient
                }
                disabled={
                  !clientToAdd ||
                  mutation.isPending
                }
              >
                <Plus className="h-4 w-4" />
                Ekle
              </Button>

            </div>

            {errors.client_ids && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.client_ids}
              </p>
            )}

            {selectedClients.length >
              0 ? (
              <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-white/[0.05]">

                <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">

                  {selectedClients.map(
                    (
                      client
                    ) => (
                      <div
                        key={
                          client.id
                        }
                        className="flex items-center justify-between gap-3 bg-white px-4 py-3 dark:bg-transparent"
                      >

                        <div className="flex min-w-0 items-center gap-3">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-white/[0.04] dark:text-slate-400">
                            <UserRound size={16} />
                          </div>

                          <div className="min-w-0">

                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                              {client.name}
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-2">

                              <Badge
                                variant="default"
                              >
                                {client.client_type ===
                                'corporate'
                                  ? 'Kurumsal'
                                  : 'Bireysel'}
                              </Badge>

                              {client.identification_number && (
                                <span className="text-xs text-gray-400 dark:text-slate-500">
                                  ••••
                                  {String(
                                    client.identification_number
                                  ).slice(
                                    -4
                                  )}
                                </span>
                              )}

                            </div>

                          </div>

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveClient(
                              client.id
                            )
                          }
                          disabled={
                            mutation.isPending
                          }
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/[0.08] dark:hover:text-red-400"
                          title="Müvekkili kaldır"
                        >
                          <X className="h-4 w-4" />
                        </button>

                      </div>
                    )
                  )}

                </div>

              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center dark:border-white/[0.07]">

                <Users className="mx-auto h-6 w-6 text-gray-300 dark:text-slate-600" />

                <p className="mt-2 text-sm text-gray-500 dark:text-slate-500">
                  Henüz müvekkil eklenmedi.
                </p>

              </div>
            )}

            <p className="text-xs text-gray-400 dark:text-slate-500">
              {selectedClients.length} müvekkil seçildi
            </p>

          </Card.Body>

        </Card>

        {/* DOSYA YÖNETİMİ */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/[0.08] dark:text-violet-400">
                <BriefcaseBusiness size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Dosya Yönetimi
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Sorumlu avukat, dosya durumu ve öncelik
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Atanan Avukat
              </label>

              <select
                name="assigned_to"
                value={
                  formData.assigned_to
                }
                onChange={
                  handleChange
                }
                disabled={
                  lawyersLoading ||
                  mutation.isPending
                }
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300"
              >

                <option value="">
                  {lawyersLoading
                    ? 'Avukatlar yükleniyor...'
                    : 'Avukat seçin'}
                </option>

                {lawyers.map(
                  (
                    lawyer
                  ) => (
                    <option
                      key={
                        lawyer.id
                      }
                      value={
                        lawyer.id
                      }
                    >
                      {lawyer.first_name}{' '}
                      {lawyer.last_name}
                      {String(
                        lawyer.id
                      ) ===
                      String(
                        user?.id
                      )
                        ? ' (Ben)'
                        : ''}
                    </option>
                  )
                )}

              </select>

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
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
                    mutation.isPending
                  }
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300"
                >

                  {STATUS_OPTIONS.map(
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

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Öncelik
                </label>

                <select
                  name="priority"
                  value={
                    formData.priority
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    mutation.isPending
                  }
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300"
                >

                  {PRIORITY_OPTIONS.map(
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

            </div>

          </Card.Body>

        </Card>

        {/* DAVA DETAY */}

        <Card>

          <Card.Header>

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/[0.08] dark:text-amber-400">
                <FileText size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Dava Detayları
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Dava konusu ve büro içi açıklamalar
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <Input
              label="Konu"
              name="subject"
              value={
                formData.subject
              }
              onChange={
                handleChange
              }
              error={
                errors.subject
              }
              disabled={
                mutation.isPending
              }
              maxLength={255}
              placeholder="Örn: Tapu iptali ve tescil"
            />

            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
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
                  mutation.isPending
                }
                maxLength={5000}
                rows={5}
                placeholder="Davanın özeti, önemli hususlar ve dosya hakkında açıklamalar..."
                className={`w-full resize-y rounded-lg border bg-white px-3.5 py-2.5 text-sm leading-6 text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/[0.035] dark:text-white dark:placeholder:text-slate-500 ${
                  errors.description
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                }`}
              />

              <div className="mt-1 flex justify-between gap-3">

                {errors.description ? (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {errors.description}
                  </p>
                ) : (
                  <span />
                )}

                <p className="text-xs text-gray-400 dark:text-slate-600">
                  {formData.description.length}/5000
                </p>

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* SUMMARY */}

        <div className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-white/[0.07] dark:bg-white/[0.015] sm:grid-cols-4">

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Müvekkil
            </p>
            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
              {formData.client_ids.length} kişi
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Durum
            </p>
            <div className="mt-1">
              <Badge
                variant={
                  getStatusVariant(
                    formData.status
                  )
                }
                dot
              >
                {getStatusLabel(
                  formData.status
                )}
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Öncelik
            </p>
            <div className="mt-1">
              <Badge
                variant={
                  getPriorityVariant(
                    formData.priority
                  )
                }
              >
                {getPriorityLabel(
                  formData.priority
                )}
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Açılış
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-slate-300">
              <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
              {formData.opening_date ||
                'Belirtilmedi'}
            </div>
          </div>

        </div>

        {/* ACTIONS */}

        <div className="flex flex-col-reverse gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.07] dark:bg-[#0b1b33] sm:flex-row sm:items-center sm:justify-end">

          <Button
            type="button"
            variant="secondary"
            disabled={
              mutation.isPending
            }
            onClick={
              handleCancel
            }
          >
            İptal
          </Button>

          <Button
            type="submit"
            loading={
              mutation.isPending
            }
            disabled={
              mutation.isPending
            }
          >
            <Save className="h-4 w-4" />
            Dava Oluştur
          </Button>

        </div>

      </form>

    </div>
  );
};

export default CaseCreate;