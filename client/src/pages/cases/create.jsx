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
import userApi from '../../features/users/user.api.js';

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

// ======================================================
// COMPONENT
// ======================================================

const CaseCreate = () => {
  const navigate =
    useNavigate();

  const [
    formData,
    setFormData,
  ] =
    useState({
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
    });

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
        'users',
        {
          role: 'lawyer',
        },
      ],

      queryFn: () =>
        userApi.getAll({
          role: 'lawyer',
        }),
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
        toast.error(
          error
            ?.response
            ?.data
            ?.message ||
            'Dava oluşturulamadı'
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
  // SUBMIT
  // ======================================================

  const handleSubmit =
    (
      event
    ) => {
      event.preventDefault();

      const newErrors =
        {};

      if (
        !formData.judiciary_type.trim()
      ) {
        newErrors.judiciary_type =
          'Yargı türü gereklidir';
      }

      if (
        !formData.judiciary_unit.trim()
      ) {
        newErrors.judiciary_unit =
          'Yargı birimi gereklidir';
      }

      if (
        formData.client_ids.length ===
        0
      ) {
        newErrors.client_ids =
          'En az bir müvekkil seçilmelidir';
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

        return;
      }

      const title =
        `${formData.judiciary_type.trim()} - ${formData.judiciary_unit.trim()}`;

      const submitData = {
        ...formData,

        title,

        judiciary_type:
          formData.judiciary_type.trim(),

        judiciary_unit:
          formData.judiciary_unit.trim(),

        court_name:
          formData.court_name.trim() ||
          null,

        case_number:
          formData.case_number.trim() ||
          null,

        subject:
          formData.subject.trim() ||
          null,

        description:
          formData.description.trim() ||
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

      {/* ==================================================
          HEADER
      ================================================== */}

      <div>

        <Link
          to="/cases"
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

          Davalar
        </Link>

        <div className="mt-3 flex items-start gap-3">

          <div
            className="
              flex
              h-11
              w-11
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
            <Gavel size={21} />
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
              Yeni Dava
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

        {/* ==================================================
            JUDICIARY INFO
        ================================================== */}

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
                <Scale size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Yargı Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Dava dosyasının temel mahkeme ve yargı bilgileri
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
            />

          </Card.Body>

        </Card>

        {/* ==================================================
            CLIENTS
        ================================================== */}

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
                <Users size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Müvekkiller
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Davaya bağlı bir veya birden fazla müvekkil ekleyin
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
                className={`
                  h-10
                  flex-1
                  rounded-lg
                  border
                  bg-white
                  px-3.5
                  text-sm
                  text-gray-700
                  outline-none
                  focus:ring-2
                  focus:ring-blue-500/10
                  dark:bg-white/[0.035]
                  dark:text-slate-300
                  ${
                    errors.client_ids
                      ? 'border-red-400 focus:border-red-500'
                      : 'border-gray-200 focus:border-blue-500 dark:border-white/[0.08]'
                  }
                `}
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
                        className="
                          flex
                          items-center
                          justify-between
                          gap-3
                          bg-white
                          px-4
                          py-3
                          dark:bg-transparent
                        "
                      >

                        <div className="flex min-w-0 items-center gap-3">

                          <div
                            className="
                              flex
                              h-9
                              w-9
                              shrink-0
                              items-center
                              justify-center
                              rounded-lg
                              bg-gray-100
                              text-gray-500
                              dark:bg-white/[0.04]
                              dark:text-slate-400
                            "
                          >
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
                          className="
                            inline-flex
                            h-8
                            w-8
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            text-gray-400
                            transition
                            hover:bg-red-50
                            hover:text-red-600
                            dark:hover:bg-red-500/[0.08]
                            dark:hover:text-red-400
                          "
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
              <div
                className="
                  rounded-xl
                  border
                  border-dashed
                  border-gray-200
                  px-4
                  py-6
                  text-center
                  dark:border-white/[0.07]
                "
              >
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

        {/* ==================================================
            RESPONSIBLE & STATUS
        ================================================== */}

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
                  bg-violet-50
                  text-violet-600
                  dark:bg-violet-500/[0.08]
                  dark:text-violet-400
                "
              >
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

            {/* LAWYER */}

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
                  outline-none
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-slate-300
                "
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
                    </option>
                  )
                )}

              </select>

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              {/* STATUS */}

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
                    outline-none
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
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

              {/* PRIORITY */}

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
                    outline-none
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
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

        {/* ==================================================
            CASE DETAIL
        ================================================== */}

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
                  bg-amber-50
                  text-amber-600
                  dark:bg-amber-500/[0.08]
                  dark:text-amber-400
                "
              >
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
                rows={5}
                placeholder="Davanın özeti, önemli hususlar ve dosya hakkında açıklamalar..."
                className="
                  w-full
                  resize-y
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  py-2.5
                  text-sm
                  leading-6
                  text-gray-900
                  outline-none
                  placeholder:text-gray-400
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                  dark:placeholder:text-slate-500
                "
              />

            </div>

          </Card.Body>

        </Card>

        {/* ==================================================
            SUMMARY
        ================================================== */}

        <div
          className="
            grid
            gap-3
            rounded-xl
            border
            border-gray-200
            bg-gray-50/50
            p-4
            dark:border-white/[0.07]
            dark:bg-white/[0.015]
            sm:grid-cols-4
          "
        >

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

        {/* ==================================================
            ACTIONS
        ================================================== */}

        <div
          className="
            flex
            flex-col-reverse
            gap-3
            rounded-xl
            border
            border-gray-200
            bg-white
            p-4
            shadow-sm
            dark:border-white/[0.07]
            dark:bg-[#0b1b33]
            sm:flex-row
            sm:items-center
            sm:justify-end
          "
        >

          <Button
            type="button"
            variant="secondary"
            disabled={
              mutation.isPending
            }
            onClick={() =>
              navigate(
                '/cases'
              )
            }
          >
            İptal
          </Button>

          <Button
            type="submit"
            loading={
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