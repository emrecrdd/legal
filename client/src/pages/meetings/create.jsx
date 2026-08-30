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
  useCreateMeeting,
} from '../../features/meetings/meeting.queries.js';
import caseApi from '../../features/cases/case.api.js';
import clientApi from '../../features/clients/client.api.js';
import userApi from '../../features/users/user.api.js';

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
  CalendarClock,
  Link2,
  MapPin,
  Plus,
  Save,
  UserRound,
  Users,
  Video,
  X,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const INITIAL_FORM = {
  title: '',
  description: '',
  start_date: '',
  end_date: '',
  location: '',
  meeting_type: 'other',
  case_id: '',
  client_id: '',
  assigned_to: '',
  status: 'scheduled',
  attendees: [],
  meeting_link: '',
  notes: '',
};

const MEETING_TYPE_OPTIONS = [
  {
    value: 'client',
    label: 'Müvekkil Görüşmesi',
  },
  {
    value: 'internal',
    label: 'İç Toplantı',
  },
  {
    value: 'phone',
    label: 'Telefon Görüşmesi',
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

// ======================================================
// HELPERS
// ======================================================

const getRoleLabel = (
  role
) => {
  const labels = {
    admin: 'Yönetici',
    lawyer: 'Avukat',
    intern: 'Stajyer',
    secretary: 'Sekreter',
  };

  return (
    labels[role] ||
    role ||
    'Kullanıcı'
  );
};

const getMeetingTypeLabel = (
  type
) => {
  return (
    MEETING_TYPE_OPTIONS.find(
      (option) =>
        option.value ===
        type
    )?.label ||
    'Diğer'
  );
};

const getStatusVariant = (
  status
) => {
  const variants = {
    scheduled: 'warning',
    ongoing: 'info',
    completed: 'success',
    cancelled: 'danger',
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
      (option) =>
        option.value ===
        status
    )?.label ||
    status
  );
};

/*
 * datetime-local kullanıcının ekranda
 * Türkiye saatiyle girdiği değeri temsil ediyor.
 *
 * Backend'e ISO UTC gönderiyoruz.
 *
 * Örn:
 * 2026-08-17T14:30
 * ->
 * 2026-08-17T11:30:00.000Z
 */
const localToUTC = (
  dateTime
) => {
  if (!dateTime) {
    return null;
  }

  try {
    const normalized =
      dateTime.length === 16
        ? `${dateTime}:00`
        : dateTime;

    const date =
      new Date(
        `${normalized}+03:00`
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }

    return date.toISOString();
  } catch {
    return null;
  }
};

const isValidHttpUrl = (
  value
) => {
  if (!value) {
    return true;
  }

  try {
    const url =
      new URL(value);

    return [
      'http:',
      'https:',
    ].includes(
      url.protocol
    );
  } catch {
    return false;
  }
};

const getCaseDisplayName = (
  caseItem
) => {
  if (!caseItem) {
    return 'Dava';
  }

  const courtName =
    String(
      caseItem.court_name ||
      ''
    ).trim();

  const caseNumber =
    String(
      caseItem.case_number ||
      ''
    ).trim();

  if (
    courtName &&
    caseNumber
  ) {
    return `${courtName} · ${caseNumber}`;
  }

  return (
    courtName ||
    caseNumber ||
    caseItem.title ||
    'Dava'
  );
};

const getCaseSecondaryInfo = (
  caseItem
) => {
  if (!caseItem) {
    return '';
  }

  return [
    caseItem.judiciary_type,
    caseItem.judiciary_unit,
  ]
    .filter(Boolean)
    .join(' · ');
};

// ======================================================
// COMPONENT
// ======================================================

const MeetingCreate = () => {
  const navigate =
    useNavigate();

  const {
    user,
  } =
    useAuth();

  const [
    formData,
    setFormData,
  ] =
    useState(
      INITIAL_FORM
    );

  const [
    attendeeName,
    setAttendeeName,
  ] =
    useState('');

  const [
    attendeeRole,
    setAttendeeRole,
  ] =
    useState('');

  const [
    errors,
    setErrors,
  ] =
    useState({});

  // ====================================================
  // QUERIES
  // ====================================================

  const {
    data:
      casesData,
    isLoading:
      casesLoading,
  } =
    useQuery({
      queryKey: [
        'cases',
        {
          limit: 100,
        },
      ],

      queryFn: () =>
        caseApi.getAll({
          limit: 100,
        }),
    });

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
      clientCasesData,
    isLoading:
      clientCasesLoading,
  } =
    useQuery({
      queryKey: [
        'clients',
        formData.client_id,
        'cases',
      ],

      queryFn: () =>
        clientApi.getCaseHistory(
          formData.client_id
        ),

      enabled:
        Boolean(
          formData.client_id
        ),
    });

  const {
    data:
      usersData,
    isLoading:
      usersLoading,
  } =
    useQuery({
      queryKey: [
        'users',
      ],

      queryFn: () =>
        userApi.getAll(),
    });

  // ====================================================
  // DATA
  // ====================================================

  const cases =
    Array.isArray(
      casesData?.data?.data
    )
      ? casesData.data.data
      : [];

  const clients =
    Array.isArray(
      clientsData?.data?.data
    )
      ? clientsData.data.data
      : [];

  const users =
    Array.isArray(
      usersData?.data?.data
    )
      ? usersData.data.data
      : [];

  const clientCases =
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

  const relationCases =
    formData.client_id
      ? clientCases
      : cases;

  const relationCasesLoading =
    formData.client_id
      ? clientCasesLoading
      : casesLoading;

  const assignableUsers =
    useMemo(() => {
      if (
        user?.role ===
        'admin'
      ) {
        return users;
      }

      return users.filter(
        (
          person
        ) =>
          person.id ===
          user?.id
      );
    }, [
      users,
      user,
    ]);

  const selectedCase =
    useMemo(() => {
      return relationCases.find(
        (
          item
        ) =>
          String(
            item.id
          ) ===
          String(
            formData.case_id
          )
      );
    }, [
      relationCases,
      formData.case_id,
    ]);

  const selectedClient =
    useMemo(() => {
      return clients.find(
        (
          item
        ) =>
          String(
            item.id
          ) ===
          String(
            formData.client_id
          )
      );
    }, [
      clients,
      formData.client_id,
    ]);

  // ====================================================
  // MUTATION
  // ====================================================

  const createMeeting =
    useCreateMeeting();

  const mutation = {
    ...createMeeting,

    mutate: (
      data
    ) =>
      createMeeting.mutate(
        data,
        {
          onSuccess: (
            response
          ) => {
            const meeting =
              response?.data?.data ??
              response?.data ??
              null;

            if (
              meeting?.id
            ) {
              navigate(
                `/meetings/${meeting.id}`
              );

              return;
            }

            navigate(
              '/meetings'
            );
          },
        }
      ),
  };

  // ====================================================
  // FORM HANDLERS
  // ====================================================

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
        ) => {
          if (
            name ===
            'client_id'
          ) {
            return {
              ...current,

              client_id:
                value,

              case_id:
                '',
            };
          }

          return {
            ...current,

            [name]:
              value,
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

  // ====================================================
  // ATTENDEES
  // ====================================================

  const handleAddAttendee =
    () => {
      const name =
        attendeeName.trim();

      const role =
        attendeeRole.trim();

      if (!name) {
        return;
      }

      const alreadyExists =
        formData.attendees.some(
          (
            attendee
          ) =>
            attendee.name
              ?.trim()
              .toLocaleLowerCase(
                'tr-TR'
              ) ===
            name.toLocaleLowerCase(
              'tr-TR'
            )
        );

      if (
        alreadyExists
      ) {
        toast.error(
          'Bu katılımcı zaten eklenmiş'
        );

        return;
      }

      setFormData(
        (
          current
        ) => ({
          ...current,

          attendees: [
            ...current.attendees,

            {
              name,
              role:
                role ||
                'Katılımcı',
            },
          ],
        })
      );

      setAttendeeName(
        ''
      );

      setAttendeeRole(
        ''
      );
    };

  const handleRemoveAttendee =
    (
      index
    ) => {
      setFormData(
        (
          current
        ) => ({
          ...current,

          attendees:
            current.attendees.filter(
              (
                _,
                currentIndex
              ) =>
                currentIndex !==
                index
            ),
        })
      );
    };

  // ====================================================
  // SUBMIT
  // ====================================================

  const handleSubmit =
    (
      event
    ) => {
      event.preventDefault();

      const newErrors =
        {};

      if (
        !formData.title.trim()
      ) {
        newErrors.title =
          'Toplantı başlığı gereklidir';
      }

      if (
        !formData.start_date
      ) {
        newErrors.start_date =
          'Başlangıç tarihi gereklidir';
      }

      if (
        formData.start_date &&
        formData.end_date &&
        formData.end_date <
          formData.start_date
      ) {
        newErrors.end_date =
          'Bitiş tarihi başlangıç tarihinden önce olamaz';
      }

      if (
        formData.meeting_link &&
        !isValidHttpUrl(
          formData.meeting_link
        )
      ) {
        newErrors.meeting_link =
          'Geçerli bir toplantı bağlantısı girin';
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

      const assignedTo =
        user?.role !==
        'admin'
          ? user?.id
          : formData.assigned_to;

      const submitData = {
        ...formData,

        title:
          formData.title.trim(),

        description:
          formData.description
            ?.trim() ||
          null,

        location:
          formData.location
            ?.trim() ||
          null,

        meeting_link:
          formData.meeting_link
            ?.trim() ||
          null,

        notes:
          formData.notes
            ?.trim() ||
          null,

        start_date:
          localToUTC(
            formData.start_date
          ),

        end_date:
          localToUTC(
            formData.end_date
          ),

        case_id:
          formData.case_id ||
          null,

        client_id:
          formData.client_id ||
          null,

        assigned_to:
          assignedTo ||
          null,

        attendees:
          formData.attendees,
      };

      mutation.mutate(
        submitData
      );
    };

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* HEADER */}

      <div>

        <Link
          to="/meetings"
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

          Toplantılar
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
              bg-emerald-50
              text-emerald-600
              dark:bg-emerald-500/[0.08]
              dark:text-emerald-400
            "
          >
            <Users size={21} />
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
              Yeni Toplantı
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
              Toplantının zamanını, katılımcılarını ve ilişkili dava veya müvekkil kayıtlarını belirleyin.
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
            BASIC INFO
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
                <BriefcaseBusiness size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Toplantı Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Başlık, toplantı türü ve açıklama
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <Input
              label="Toplantı Başlığı *"
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
              placeholder="Örn: Dava stratejisi değerlendirme toplantısı"
              autoFocus
            />

            <div className="grid gap-4 md:grid-cols-2">

              {/* TYPE */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Toplantı Türü
                </label>

                <select
                  name="meeting_type"
                  value={
                    formData.meeting_type
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
                  {MEETING_TYPE_OPTIONS.map(
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

            </div>

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
                rows={4}
                placeholder="Gündem, görüşülecek konular veya toplantının amacı..."
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
            DATE & LOCATION
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
                <CalendarClock size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Tarih ve Konum
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Toplantının ne zaman ve nerede yapılacağını belirleyin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

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
                min={
                  formData.start_date ||
                  undefined
                }
              />

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <Input
                label="Toplantı Yeri"
                name="location"
                value={
                  formData.location
                }
                onChange={
                  handleChange
                }
                placeholder="Örn: Toplantı Odası 1"
                icon={
                  <MapPin size={16} />
                }
              />

              <Input
                label="Online Toplantı Linki"
                name="meeting_link"
                type="url"
                value={
                  formData.meeting_link
                }
                onChange={
                  handleChange
                }
                error={
                  errors.meeting_link
                }
                placeholder="https://zoom.us/..."
                icon={
                  <Video size={16} />
                }
              />

            </div>

            {formData.meeting_link && (
              <div
                className="
                  flex
                  items-center
                  gap-2
                  rounded-lg
                  bg-blue-50
                  px-3
                  py-2
                  text-xs
                  text-blue-700
                  dark:bg-blue-500/[0.05]
                  dark:text-blue-400
                "
              >
                <Link2 className="h-4 w-4 shrink-0" />

                Online toplantı bağlantısı kayda eklenecek.
              </div>
            )}

          </Card.Body>

        </Card>

        {/* ==================================================
            RELATIONS
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
                  İlişkili Kayıtlar
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Önce müvekkili, ardından o müvekkile ait davayı seçin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="grid gap-4 md:grid-cols-2">

              {/* CLIENT */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  İlişkili Müvekkil
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
                    clientsLoading
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
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >
                  <option value="">
                    {clientsLoading
                      ? 'Müvekkiller yükleniyor...'
                      : 'Müvekkil seçin (isteğe bağlı)'}
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
                        {client.company_name
                          ? ` · ${client.company_name}`
                          : ''}
                      </option>
                    )
                  )}
                </select>

                {selectedClient && (
                  <div
                    className="
                      mt-3
                      flex
                      items-center
                      gap-3
                      rounded-lg
                      border
                      border-gray-100
                      bg-gray-50
                      p-3
                      dark:border-white/[0.05]
                      dark:bg-white/[0.025]
                    "
                  >

                    <UserRound
                      size={15}
                      className="shrink-0 text-gray-400"
                    />

                    <p className="truncate text-xs font-semibold text-gray-700 dark:text-slate-300">
                      {selectedClient.name}
                    </p>

                  </div>
                )}

              </div>

              {/* CASE */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
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
                    relationCasesLoading ||
                    !formData.client_id
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
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >
                  <option value="">
                    {!formData.client_id
                      ? 'Önce müvekkil seçin'
                      : relationCasesLoading
                        ? 'Davalar yükleniyor...'
                        : relationCases.length >
                            0
                          ? 'Dava seçin (isteğe bağlı)'
                          : 'Bu müvekkile ait dava bulunamadı'}
                  </option>

                  {relationCases.map(
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
                        {getCaseDisplayName(
                          caseItem
                        )}
                      </option>
                    )
                  )}
                </select>

                {!formData.client_id && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                    Dava seçebilmek için önce ilişkili müvekkili seçin.
                  </p>
                )}

                {selectedCase && (
                  <div
                    className="
                      mt-3
                      rounded-lg
                      border
                      border-gray-100
                      bg-gray-50
                      p-3
                      dark:border-white/[0.05]
                      dark:bg-white/[0.025]
                    "
                  >
                    <div className="flex items-center gap-2">

                      <BriefcaseBusiness
                        size={15}
                        className="shrink-0 text-gray-400 dark:text-slate-500"
                      />

                      <p className="truncate text-xs font-semibold text-gray-700 dark:text-slate-300">
                        {getCaseDisplayName(
                          selectedCase
                        )}
                      </p>

                    </div>

                    {getCaseSecondaryInfo(
                      selectedCase
                    ) && (
                      <p className="mt-1 text-[10px] text-gray-400 dark:text-slate-500">
                        {getCaseSecondaryInfo(
                          selectedCase
                        )}
                      </p>
                    )}
                  </div>
                )}

              </div>

            </div>

          </Card.Body>

        </Card>

        {/* ==================================================
            RESPONSIBLE USER
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
                <UserRound size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Sorumlu Kişi
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Toplantının takibinden sorumlu kullanıcı
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            {user?.role ===
            'admin' ? (
              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Atanan Kişi
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
                    usersLoading
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
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/10
                    dark:border-white/[0.08]
                    dark:bg-white/[0.035]
                    dark:text-slate-300
                  "
                >
                  <option value="">
                    {usersLoading
                      ? 'Kullanıcılar yükleniyor...'
                      : 'Atanacak kişi seçin'}
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
                        {' · '}
                        {getRoleLabel(
                          person.role
                        )}
                      </option>
                    )
                  )}
                </select>

              </div>
            ) : (
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-4
                  rounded-xl
                  border
                  border-gray-100
                  bg-gray-50
                  p-4
                  dark:border-white/[0.06]
                  dark:bg-white/[0.025]
                "
              >

                <div className="flex items-center gap-3">

                  <div
                    className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-full
                      bg-blue-100
                      text-sm
                      font-semibold
                      text-blue-700
                      dark:bg-blue-500/[0.1]
                      dark:text-blue-400
                    "
                  >
                    {user?.first_name?.[0] ||
                      ''}
                    {user?.last_name?.[0] ||
                      ''}
                  </div>

                  <div>

                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {user?.first_name}{' '}
                      {user?.last_name}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-500">
                      {getRoleLabel(
                        user?.role
                      )}
                    </p>

                  </div>

                </div>

                <Badge
                  variant="primary"
                  dot
                >
                  Sorumlu
                </Badge>

              </div>
            )}

          </Card.Body>

        </Card>

        {/* ==================================================
            ATTENDEES
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
                  Katılımcılar
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Toplantıya katılacak harici veya dahili kişileri ekleyin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="flex flex-col gap-2 md:flex-row">

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
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    event.preventDefault();

                    handleAddAttendee();
                  }
                }}
                placeholder="Ad Soyad"
                className="
                  h-10
                  flex-1
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  text-sm
                  text-gray-900
                  outline-none
                  placeholder:text-gray-400
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                "
              />

              <input
                type="text"
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
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    event.preventDefault();

                    handleAddAttendee();
                  }
                }}
                placeholder="Rol / Unvan"
                className="
                  h-10
                  md:w-48
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  text-sm
                  text-gray-900
                  outline-none
                  placeholder:text-gray-400
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                "
              />

              <Button
                type="button"
                variant="secondary"
                onClick={
                  handleAddAttendee
                }
              >
                <Plus className="h-4 w-4" />

                Ekle
              </Button>

            </div>

            {formData.attendees.length >
              0 ? (
              <div className="mt-4 flex flex-wrap gap-2">

                {formData.attendees.map(
                  (
                    attendee,
                    index
                  ) => (
                    <div
                      key={`${attendee.name}-${index}`}
                      className="
                        inline-flex
                        items-center
                        gap-2
                        rounded-full
                        border
                        border-gray-200
                        bg-gray-50
                        px-3
                        py-1.5
                        text-xs
                        text-gray-700
                        dark:border-white/[0.07]
                        dark:bg-white/[0.03]
                        dark:text-slate-300
                      "
                    >

                      <UserRound className="h-3.5 w-3.5 text-gray-400" />

                      <span className="font-medium">
                        {attendee.name}
                      </span>

                      {attendee.role && (
                        <span className="text-gray-400 dark:text-slate-500">
                          · {attendee.role}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveAttendee(
                            index
                          )
                        }
                        className="text-gray-400 transition hover:text-red-500"
                        aria-label={`${attendee.name} katılımcısını kaldır`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>

                    </div>
                  )
                )}

              </div>
            ) : (
              <p className="mt-3 text-xs text-gray-400 dark:text-slate-500">
                Henüz ek katılımcı eklenmedi.
              </p>
            )}

          </Card.Body>

        </Card>

        {/* ==================================================
            NOTES
        ================================================== */}

        <Card>

          <Card.Header>

            <h2 className="font-semibold text-gray-900 dark:text-white">
              Notlar
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
              rows={4}
              placeholder="Toplantıyla ilgili büro içi notlar, hazırlık bilgileri veya hatırlatmalar..."
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
            sm:grid-cols-3
          "
        >

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Toplantı Türü
            </p>

            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
              {getMeetingTypeLabel(
                formData.meeting_type
              )}
            </p>

          </div>

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-600">
              Katılımcı
            </p>

            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-slate-300">
              {
                formData.attendees
                  .length
              } kişi
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
            onClick={() =>
              navigate(
                '/meetings'
              )
            }
            disabled={
              mutation.isPending
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

            Toplantı Oluştur
          </Button>

        </div>

      </form>

    </div>
  );
};

export default MeetingCreate;