import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import eventApi from '../../features/events/event.api.js';
import caseApi from '../../features/cases/case.api.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  ArrowLeft,
  CalendarDays,
  Eye,
  Gavel,
  Languages,
  MapPin,
  MessageCircle,
  Microscope,
  Plus,
  Save,
  Scale,
  Target,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const INITIAL_FORM = {
  title: '',
  description: '',

  hearing_type:
    'preliminary',

  status:
    'scheduled',

  start_date: '',
  end_date: '',

  location: '',
  court_room: '',
  judge_name: '',

  assigned_to: '',
  opposing_counsel: '',

  last_hearing_result: '',

  expense_status:
    'pending',

  is_all_day:
    false,
};

const HEARING_TYPES = [
  {
    value: 'preliminary',
    label: 'Ön İnceleme',
  },
  {
    value: 'investigation',
    label: 'Tahkikat',
  },
  {
    value: 'expert_examination',
    label: 'Bilirkişi İncelemesi',
  },
  {
    value: 'witness_hearing',
    label: 'Tanık Dinlenmesi',
  },
  {
    value: 'final_decision',
    label: 'Karar Duruşması',
  },
  {
    value: 'other',
    label: 'Diğer',
  },
];

const STATUS_OPTIONS = [
  {
    value: 'scheduled',
    label: 'Planlandı',
  },
  {
    value: 'ongoing',
    label: 'Devam Ediyor',
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

const EXPENSE_OPTIONS = [
  {
    value: 'pending',
    label: 'Bekliyor',
  },
  {
    value: 'paid',
    label: 'Ödendi',
  },
  {
    value: 'not_applicable',
    label: 'Yok',
  },
];

const ROLE_OPTIONS = [
  {
    value: 'avukat',
    label: 'Avukat',
  },
  {
    value: 'karsi_taraf_avukati',
    label: 'Karşı Taraf Avukatı',
  },
  {
    value: 'müvekkil',
    label: 'Müvekkil',
  },
  {
    value: 'davaci',
    label: 'Davacı',
  },
  {
    value: 'davali',
    label: 'Davalı',
  },
  {
    value: 'tanik',
    label: 'Tanık',
  },
  {
    value: 'bilirkişi',
    label: 'Bilirkişi',
  },
  {
    value: 'uzman',
    label: 'Uzman',
  },
  {
    value: 'tercüman',
    label: 'Tercüman',
  },
  {
    value: 'gözlemci',
    label: 'Gözlemci',
  },
  {
    value: 'diger',
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

/*
 * datetime-local timezone bilgisi taşımaz.
 *
 * Browser kullanıcının yerel saatini bildiği için
 * burada gerçek ISO zamana dönüştürüyoruz.
 *
 * Örn:
 * kullanıcı 18.08.2026 09:00 seçerse
 * Europe/Istanbul için doğru UTC karşılığı backend'e gider.
 */
const localDateTimeToIso = (
  value
) => {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toISOString();
};

const getRoleLabel = (
  role
) => {
  return (
    ROLE_OPTIONS.find(
      (
        item
      ) =>
        item.value ===
        role
    )?.label ||
    role ||
    'Katılımcı'
  );
};

const getRoleIcon = (
  role
) => {
  switch (role) {
    case 'avukat':
    case 'karsi_taraf_avukati':
      return (
        <Scale className="h-4 w-4" />
      );

    case 'tanik':
      return (
        <MessageCircle className="h-4 w-4" />
      );

    case 'bilirkişi':
      return (
        <Microscope className="h-4 w-4" />
      );

    case 'uzman':
      return (
        <Target className="h-4 w-4" />
      );

    case 'tercüman':
      return (
        <Languages className="h-4 w-4" />
      );

    case 'gözlemci':
      return (
        <Eye className="h-4 w-4" />
      );

    default:
      return (
        <UserRound className="h-4 w-4" />
      );
  }
};

// ======================================================
// COMPONENT
// ======================================================

const EventCreate = () => {
  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

  const {
    user,
  } =
    useAuth();

  const [
    searchParams,
  ] =
    useSearchParams();

  const caseIdFromUrl =
    searchParams.get(
      'case'
    );

  const [
    formData,
    setFormData,
  ] =
    useState({
      ...INITIAL_FORM,

      case_id:
        caseIdFromUrl ||
        '',
    });

  const [
    errors,
    setErrors,
  ] =
    useState({});

  const [
    attendeeName,
    setAttendeeName,
  ] =
    useState('');

  const [
    attendeeRole,
    setAttendeeRole,
  ] =
    useState(
      'diger'
    );

  const [
    attendees,
    setAttendees,
  ] =
    useState([]);

  // ======================================================
  // CURRENT CASE
  // ======================================================

  const {
    data:
      caseData,

    isLoading:
      caseLoading,
  } =
    useQuery({
      queryKey: [
        'case',
        'event-create',
        caseIdFromUrl,
      ],

      queryFn: () =>
        caseApi.getOne(
          caseIdFromUrl
        ),

      enabled:
        Boolean(
          caseIdFromUrl
        ),

      staleTime:
        5 * 60 * 1000,
    });

  const caseItem =
    caseData?.data?.data ||
    null;

  // ======================================================
  // ASSIGNABLE LAWYERS
  // ======================================================

  const {
    data:
      lawyersData,

    isLoading:
      lawyersLoading,
  } =
    useQuery({
      queryKey: [
        'case-assignable-lawyers',
        'event-create',
      ],

      queryFn: () =>
        caseApi.getAssignableLawyers(),

      staleTime:
        5 * 60 * 1000,
    });

  const assignableUsers =
    Array.isArray(
      lawyersData?.data?.data
    )
      ? lawyersData.data.data
      : [];

  // ======================================================
  // DEFAULT ASSIGNEE
  // ======================================================

  useEffect(() => {
    if (
      !user?.id
    ) {
      return;
    }

    /*
     * Avukat kendi oluşturduğu duruşmada varsayılan
     * olarak seçili gelir.
     *
     * Kullanıcı isterse listeden başka bir avukat
     * seçebilir.
     */
    if (
      user.role ===
      'lawyer'
    ) {
      setFormData(
        (
          current
        ) => ({
          ...current,

          assigned_to:
            current.assigned_to ||
            user.id,
        })
      );
    }
  }, [
    user,
  ]);

  // ======================================================
  // CASE DEFAULTS
  // ======================================================

  useEffect(() => {
    if (
      !caseItem
    ) {
      return;
    }

    /*
     * Davada mahkeme bilgisi zaten varsa duruşma formuna
     * otomatik öneriyoruz.
     *
     * Kullanıcı isterse değiştirebilir.
     */
    setFormData(
      (
        current
      ) => ({
        ...current,

        location:
          current.location ||
          caseItem.court_name ||
          '',
      })
    );
  }, [
    caseItem,
  ]);

  // ======================================================
  // MUTATION
  // ======================================================

  const mutation =
    useMutation({
      mutationFn: (
        payload
      ) =>
        eventApi.create(
          payload
        ),

      onSuccess: async (
  response
) => {
  const event =
    response?.data?.data ??
    response?.data ??
    null;

  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['calendar-events'],
    }),

    queryClient.invalidateQueries({
      queryKey: ['event'],
    }),

    queryClient.invalidateQueries({
      queryKey: ['events'],
    }),

    queryClient.invalidateQueries({
      queryKey: ['case'],
    }),
  ]);

  toast.success(
    'Duruşma başarıyla oluşturuldu'
  );

  if (event?.id) {
    navigate(
      `/events/${event.id}`
    );

    return;
  }

  if (event?.case_id) {
    navigate(
      `/cases/${event.case_id}`
    );

    return;
  }

  navigate(
    '/calendar'
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
          error?.message ||
          'Duruşma oluşturulamadı'
        );
      },
    });

  const isPending =
    mutation.isPending;

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

    setFormData(
      (
        current
      ) => ({
        ...current,

        [name]:
          type ===
          'checkbox'
            ? checked
            : value,
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
  // ATTENDEES
  // ======================================================

  const addAttendee =
    () => {
      const name =
        attendeeName.trim();

      if (!name) {
        return;
      }

      const alreadyExists =
        attendees.some(
          (
            item
          ) =>
            item.name
              ?.trim()
              .toLocaleLowerCase(
                'tr-TR'
              ) ===
              name.toLocaleLowerCase(
                'tr-TR'
              ) &&
            item.role ===
              attendeeRole
        );

      if (
        alreadyExists
      ) {
        toast.error(
          'Bu katılımcı zaten eklenmiş'
        );

        return;
      }

      setAttendees(
        (
          current
        ) => [
          ...current,

          {
            name,
            role:
              attendeeRole,
          },
        ]
      );

      setAttendeeName('');
    };

  const removeAttendee = (
    index
  ) => {
    setAttendees(
      (
        current
      ) =>
        current.filter(
          (
            _,
            currentIndex
          ) =>
            currentIndex !==
            index
        )
    );
  };

  const handleAttendeeKeyDown =
    (
      event
    ) => {
      if (
        event.key !==
        'Enter'
      ) {
        return;
      }

      event.preventDefault();

      addAttendee();
    };

  // ======================================================
  // VALIDATION
  // ======================================================

  const validateForm =
    () => {
      const nextErrors =
        {};

      const title =
        formData.title.trim();

      if (
        title.length <
        2
      ) {
        nextErrors.title =
          'Duruşma başlığı gereklidir';
      }

      if (
        !formData.start_date
      ) {
        nextErrors.start_date =
          'Başlangıç tarihi gereklidir';
      }

      if (
        formData.start_date &&
        !localDateTimeToIso(
          formData.start_date
        )
      ) {
        nextErrors.start_date =
          'Geçerli bir başlangıç tarihi girin';
      }

      if (
        formData.end_date &&
        !localDateTimeToIso(
          formData.end_date
        )
      ) {
        nextErrors.end_date =
          'Geçerli bir bitiş tarihi girin';
      }

      if (
        formData.start_date &&
        formData.end_date
      ) {
        const start =
          new Date(
            formData.start_date
          );

        const end =
          new Date(
            formData.end_date
          );

        if (
          end <
          start
        ) {
          nextErrors.end_date =
            'Bitiş tarihi başlangıç tarihinden önce olamaz';
        }
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

    const assignedTo =
      formData.assigned_to ||
      null;

    const payload = {
      title:
        formData.title.trim(),

      description:
        normalizeNullable(
          formData.description
        ),

      event_type:
        'hearing',

      hearing_type:
        formData.hearing_type,

      status:
        formData.status,

      start_date:
        localDateTimeToIso(
          formData.start_date
        ),

      end_date:
        formData.end_date
          ? localDateTimeToIso(
              formData.end_date
            )
          : null,

      location:
        normalizeNullable(
          formData.location
        ),

      court_room:
        normalizeNullable(
          formData.court_room
        ),

      judge_name:
        normalizeNullable(
          formData.judge_name
        ),

      last_hearing_result:
        normalizeNullable(
          formData.last_hearing_result
        ),

      opposing_counsel:
        normalizeNullable(
          formData.opposing_counsel
        ),

      expense_status:
        formData.expense_status,

      case_id:
        caseIdFromUrl ||
        null,

      assigned_to:
        assignedTo,

      is_all_day:
        Boolean(
          formData.is_all_day
        ),

      attendees:
        attendees.map(
          (
            attendee
          ) => ({
            name:
              attendee.name.trim(),

            role:
              attendee.role ||
              'diger',
          })
        ),
    };

    mutation.mutate(
      payload
    );
  };

  // ======================================================
  // CANCEL
  // ======================================================

  const handleCancel =
    () => {
      if (
        caseIdFromUrl
      ) {
        navigate(
          `/cases/${caseIdFromUrl}`
        );

        return;
      }

      navigate(
        '/calendar'
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
          to={
            caseIdFromUrl
              ? `/cases/${caseIdFromUrl}`
              : '/calendar'
          }
          className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />

          {caseIdFromUrl
            ? 'Davaya Dön'
            : 'Takvime Dön'}
        </Link>

        <div className="mt-4 flex items-start gap-3">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">

            <Gavel className="h-6 w-6 text-blue-600" />

          </div>

          <div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Yeni Duruşma
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Duruşma tarihini, görevlendirilen avukatı ve katılımcıları oluşturun.
            </p>

          </div>

        </div>

      </div>

      {/* ==================================================
          CASE SUMMARY
      ================================================== */}

      {caseIdFromUrl && (
        <Card>

          <Card.Body>

            {caseLoading ? (
              <p className="text-sm text-gray-500">
                Dava bilgileri yükleniyor...
              </p>
            ) : caseItem ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-start gap-3">

                  <div className="rounded-xl bg-gray-100 p-3 dark:bg-gray-800">

                    <Scale className="h-5 w-5 text-gray-600 dark:text-gray-300" />

                  </div>

                  <div>

                    <p className="font-semibold text-gray-900 dark:text-white">
                      {caseItem.title}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {caseItem.case_number ||
                        'Dosya numarası yok'}

                      {caseItem.court_name
                        ? ` · ${caseItem.court_name}`
                        : ''}
                    </p>

                  </div>

                </div>

                <Badge variant="default">
                  Davaya Bağlı
                </Badge>

              </div>
            ) : (
              <p className="text-sm text-red-600">
                İlişkili dava yüklenemedi.
              </p>
            )}

          </Card.Body>

        </Card>
      )}

      {/* ==================================================
          FORM
      ================================================== */}

      <Card>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-8 p-6"
        >

          {/* ==================================================
              BASIC INFORMATION
          ================================================== */}

          <section className="space-y-4">

            <div>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Duruşma Bilgileri
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Duruşmanın temel bilgilerini belirleyin.
              </p>

            </div>

            <Input
              label="Başlık *"
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
              placeholder="Örn: Ön İnceleme Duruşması"
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
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Duruşmaya ilişkin genel not..."
              />

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <div>

                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Duruşma Türü
                </label>

                <select
                  name="hearing_type"
                  value={
                    formData.hearing_type
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    isPending
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >

                  {HEARING_TYPES.map(
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
                    isPending
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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

            </div>

          </section>

          {/* ==================================================
              DATE
          ================================================== */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <div className="flex items-start gap-3">

              <CalendarDays className="mt-0.5 h-5 w-5 text-blue-600" />

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Tarih ve Saat
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Duruşmanın başlangıç ve varsa bitiş zamanını belirleyin.
                </p>

              </div>

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <Input
                label="Başlangıç Tarihi *"
                name="start_date"
                type="datetime-local"
                value={
                  formData.start_date
                }
                onChange={
                  handleChange
                }
                error={
                  errors.start_date
                }
                disabled={
                  isPending
                }
              />

              <Input
                label="Bitiş Tarihi"
                name="end_date"
                type="datetime-local"
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

            <label className="inline-flex cursor-pointer items-center gap-2">

              <input
                type="checkbox"
                name="is_all_day"
                checked={
                  formData.is_all_day
                }
                onChange={
                  handleChange
                }
                disabled={
                  isPending
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />

              <span className="text-sm text-gray-700 dark:text-gray-300">
                Tüm gün etkinlik
              </span>

            </label>

          </section>

          {/* ==================================================
              LOCATION
          ================================================== */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <div className="flex items-start gap-3">

              <MapPin className="mt-0.5 h-5 w-5 text-emerald-600" />

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Mahkeme ve Yer Bilgileri
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Duruşmanın gerçekleştirileceği mahkeme, salon ve hakim bilgileri.
                </p>

              </div>

            </div>

            <div className="grid gap-4 md:grid-cols-3">

              <Input
                label="Mahkeme / Yer"
                name="location"
                value={
                  formData.location
                }
                onChange={
                  handleChange
                }
                disabled={
                  isPending
                }
                placeholder="Örn: İstanbul 3. Sulh Hukuk Mahkemesi"
              />

              <Input
                label="Salon"
                name="court_room"
                value={
                  formData.court_room
                }
                onChange={
                  handleChange
                }
                disabled={
                  isPending
                }
                placeholder="Örn: Salon 8"
              />

              <Input
                label="Hakim"
                name="judge_name"
                value={
                  formData.judge_name
                }
                onChange={
                  handleChange
                }
                disabled={
                  isPending
                }
                placeholder="Hakim adı"
              />

            </div>

          </section>

          {/* ==================================================
              LAWYERS
          ================================================== */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <div className="flex items-start gap-3">

              <UserRound className="mt-0.5 h-5 w-5 text-purple-600" />

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Avukat Bilgileri
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Duruşmadan sorumlu avukatı ve karşı taraf vekilini belirleyin.
                </p>

              </div>

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <div>

                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                    isPending ||
                    lawyersLoading
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >

                  <option value="">
                    {lawyersLoading
                      ? 'Avukatlar yükleniyor...'
                      : 'Avukat seçin'}
                  </option>

                  {assignableUsers.map(
                    (
                      person
                    ) => (
                      <option
                        key={
                          person.id
                        }
                        value={
                          person.id
                        }
                      >
                        {person.first_name}{' '}
                        {person.last_name}
                        {person.id ===
                        user?.id
                          ? ' (Kendiniz)'
                          : person.role ===
                            'admin'
                            ? ' (Yönetici)'
                            : ' (Avukat)'}
                      </option>
                    )
                  )}

                </select>

              </div>

              <Input
                label="Karşı Taraf Avukatı"
                name="opposing_counsel"
                value={
                  formData.opposing_counsel
                }
                onChange={
                  handleChange
                }
                disabled={
                  isPending
                }
                placeholder="Örn: Av. Ahmet Yılmaz"
              />

            </div>

          </section>

          {/* ==================================================
              ATTENDEES
          ================================================== */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <div className="flex items-start gap-3">

              <Users className="mt-0.5 h-5 w-5 text-indigo-600" />

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Katılımcılar
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Tanık, bilirkişi, taraf veya diğer katılımcıları ekleyin.
                </p>

              </div>

            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_12rem_auto]">

              <input
                type="text"
                value={
                  attendeeName
                }
                onChange={(
                  event
                ) =>
                  setAttendeeName(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleAttendeeKeyDown
                }
                disabled={
                  isPending
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Katılımcı adı"
              />

              <select
                value={
                  attendeeRole
                }
                onChange={(
                  event
                ) =>
                  setAttendeeRole(
                    event.target.value
                  )
                }
                disabled={
                  isPending
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >

                {ROLE_OPTIONS.map(
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

              <Button
                type="button"
                variant="outline"
                disabled={
                  isPending ||
                  !attendeeName.trim()
                }
                onClick={
                  addAttendee
                }
              >
                <Plus className="mr-1 h-4 w-4" />

                Ekle
              </Button>

            </div>

            {attendees.length ===
            0 ? (
              <p className="text-xs text-gray-400">
                Henüz ek katılımcı bulunmuyor.
              </p>
            ) : (
              <div className="space-y-2">

                {attendees.map(
                  (
                    attendee,
                    index
                  ) => (
                    <div
                      key={`${attendee.name}-${attendee.role}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                    >

                      <div className="flex min-w-0 items-center gap-3">

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                          {getRoleIcon(
                            attendee.role
                          )}
                        </div>

                        <div className="min-w-0">

                          <p className="truncate font-medium text-gray-900 dark:text-white">
                            {attendee.name}
                          </p>

                          <p className="text-xs text-gray-500">
                            {getRoleLabel(
                              attendee.role
                            )}
                          </p>

                        </div>

                      </div>

                      <button
                        type="button"
                        disabled={
                          isPending
                        }
                        onClick={() =>
                          removeAttendee(
                            index
                          )
                        }
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20"
                        aria-label="Katılımcıyı kaldır"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                    </div>
                  )
                )}

              </div>
            )}

          </section>

          {/* ==================================================
              RESULT / EXPENSE
          ================================================== */}

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <div>

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Duruşma Sonucu ve Masraf
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Gerekliyse mevcut sonucu ve harç durumunu kaydedin.
              </p>

            </div>

            <div>

              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Son Duruşma Sonucu
              </label>

              <textarea
                name="last_hearing_result"
                value={
                  formData.last_hearing_result
                }
                onChange={
                  handleChange
                }
                disabled={
                  isPending
                }
                rows="3"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Örn: Bilirkişi raporunun beklenmesine karar verildi."
              />

            </div>

            <div className="max-w-sm">

              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Masraf / Harç Durumu
              </label>

              <select
                name="expense_status"
                value={
                  formData.expense_status
                }
                onChange={
                  handleChange
                }
                disabled={
                  isPending
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >

                {EXPENSE_OPTIONS.map(
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

          </section>

          {/* ==================================================
              ACTIONS
          ================================================== */}

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">

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

              Duruşmayı Oluştur
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={
                isPending
              }
              onClick={
                handleCancel
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

export default EventCreate;