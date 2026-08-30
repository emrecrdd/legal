import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  useQuery,
} from '@tanstack/react-query';

import meetingApi from '../../features/meetings/meeting.api.js';

import {
  useDeleteMeeting,
  useUpdateMeeting,
} from '../../features/meetings/meeting.query.js';
import caseApi from '../../features/cases/case.api.js';
import clientApi from '../../features/clients/client.api.js';
import userApi from '../../features/users/user.api.js';

import { useAuth } from '../../app/providers/auth.provider.jsx';

import {
  PERMISSION_KEYS,
  hasPermission,
} from '../../constants/roles.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Link2,
  MapPin,
  Plus,
  Save,
  Trash2,
  UserRound,
  UsersRound,
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

// ======================================================
// HELPERS
// ======================================================

const getStatusVariant = (status) => {
  switch (status) {
    case 'scheduled':
      return 'warning';

    case 'ongoing':
      return 'info';

    case 'completed':
      return 'success';

    case 'cancelled':
      return 'danger';

    default:
      return 'default';
  }
};

const getStatusLabel = (status) => {
  return (
    STATUS_OPTIONS.find(
      (item) =>
        item.value === status
    )?.label ||
    status ||
    'Bilinmiyor'
  );
};

const getMeetingTypeLabel = (type) => {
  return (
    MEETING_TYPE_OPTIONS.find(
      (item) =>
        item.value === type
    )?.label ||
    'Diğer'
  );
};

// ======================================================
// API DATE -> DATETIME LOCAL
// Europe/Istanbul saatine çevir
// ======================================================

const formatForDateTimeLocal = (date) => {
  if (!date) {
    return '';
  }

  try {
    const parsed =
      new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return '';
    }

    const parts =
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone:
            'Europe/Istanbul',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }
      ).formatToParts(parsed);

    const map = {};

    parts.forEach(
      (part) => {
        if (
          part.type !==
          'literal'
        ) {
          map[part.type] =
            part.value;
        }
      }
    );

    return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
  } catch {
    return '';
  }
};

// ======================================================
// DATETIME LOCAL -> ISO
// Türkiye saati kabul ederek UTC gönder
// ======================================================

const localToUTC = (dateTime) => {
  if (!dateTime) {
    return null;
  }

  try {
    const [date, time] =
      dateTime.split('T');

    if (!date || !time) {
      return null;
    }

    const parsed =
      new Date(
        `${date}T${time}:00+03:00`
      );

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return null;
    }

    return parsed.toISOString();
  } catch {
    return null;
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

const MeetingEdit = () => {
  const { id } =
    useParams();

  const navigate =
    useNavigate();

  const { user } =
    useAuth();

  const [
    formData,
    setFormData,
  ] = useState(
    INITIAL_FORM
  );

  const [
    attendeeName,
    setAttendeeName,
  ] = useState('');

  const [
    attendeeRole,
    setAttendeeRole,
  ] = useState('');

  const [
    errors,
    setErrors,
  ] = useState({});

  // ======================================================
  // MEETING
  // ======================================================

  const {
    data: meetingData,
    isLoading:
      meetingLoading,
    error:
      meetingError,
  } = useQuery({
    queryKey: [
      'meeting',
      id,
    ],

    queryFn: () =>
      meetingApi.getOne(id),

    enabled:
      Boolean(id),
  });

  // ======================================================
  // RELATED DATA
  // ======================================================

  const {
    data: casesData,
    isLoading:
      casesLoading,
  } = useQuery({
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
    data: clientsData,
    isLoading:
      clientsLoading,
  } = useQuery({
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
  } = useQuery({
    queryKey: [
      'clients',
      formData.client_id,
      'meeting-edit-cases',
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

  const {
    data:
      selectedCaseData,

    isLoading:
      selectedCaseLoading,
  } = useQuery({
    queryKey: [
      'case',
      formData.case_id,
      'meeting-edit-relation',
    ],

    queryFn: () =>
      caseApi.getOne(
        formData.case_id
      ),

    enabled:
      Boolean(
        formData.case_id
      ),

    staleTime:
      3 * 60 * 1000,
  });

  const {
    data: usersData,
  } = useQuery({
    queryKey: [
      'users',
    ],

    queryFn: () =>
      userApi.getAll(),
  });

  // ======================================================
  // DATA
  // ======================================================

  const meeting =
    meetingData?.data?.data ??
    meetingData?.data ??
    null;

  const cases =
    casesData?.data?.data ||
    [];

  const clients =
    clientsData?.data?.data ||
    [];

  const users =
    usersData?.data?.data ||
    [];


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

  const selectedCaseDetail =
    selectedCaseData?.data?.data ??
    selectedCaseData?.data ??
    null;

  const caseClients =
    useMemo(() => {
      if (
        !selectedCaseDetail
      ) {
        return [];
      }

      const candidates = [
        selectedCaseDetail.clients,
        selectedCaseDetail.case_clients,
        selectedCaseDetail.related_clients,
      ];

      for (
        const candidate of
        candidates
      ) {
        if (
          Array.isArray(
            candidate
          )
        ) {
          return candidate
            .map(
              (
                item
              ) =>
                item?.client ||
                item
            )
            .filter(
              (
                item
              ) =>
                item?.id
            );
        }
      }

      if (
        selectedCaseDetail.client?.id
      ) {
        return [
          selectedCaseDetail.client,
        ];
      }

      if (
        selectedCaseDetail.client_id
      ) {
        const matched =
          clients.find(
            (
              client
            ) =>
              String(
                client.id
              ) ===
              String(
                selectedCaseDetail.client_id
              )
          );

        return matched
          ? [
              matched,
            ]
          : [];
      }

      return [];
    }, [
      selectedCaseDetail,
      clients,
    ]);

  const relationCases =
    formData.client_id
      ? clientCases
      : cases;

  const relationCasesLoading =
    formData.client_id
      ? clientCasesLoading
      : casesLoading;

  const relationClients =
    formData.case_id
      ? caseClients
      : clients;

  const relationClientsLoading =
    formData.case_id
      ? selectedCaseLoading
      : clientsLoading;

  const selectedCase =
    useMemo(() => {
      return (
        relationCases.find(
          (
            item
          ) =>
            String(
              item.id
            ) ===
            String(
              formData.case_id
            )
        ) ||
        (
          selectedCaseDetail &&
          String(
            selectedCaseDetail.id
          ) ===
          String(
            formData.case_id
          )
            ? selectedCaseDetail
            : null
        )
      );
    }, [
      relationCases,
      selectedCaseDetail,
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

  // ======================================================
  // PERMISSIONS
  // ======================================================

  const isAdmin =
    user?.role ===
    'admin';

  const canEdit =
    hasPermission(
      user,
      PERMISSION_KEYS.EDIT_MEETINGS
    );

  const canDelete =
    hasPermission(
      user,
      PERMISSION_KEYS.DELETE_MEETINGS
    );

  const assignableUsers =
    useMemo(() => {
      if (!isAdmin) {
        return [];
      }

      return users.filter(
        (person) =>
          person?.is_active !==
          false
      );
    }, [
      users,
      isAdmin,
    ]);

  // ======================================================
  // FORM INITIALIZATION
  // ======================================================

  useEffect(() => {
    if (!meeting) {
      return;
    }

    setFormData({
      title:
        meeting.title ||
        '',

      description:
        meeting.description ||
        '',

      start_date:
        formatForDateTimeLocal(
          meeting.start_date
        ),

      end_date:
        formatForDateTimeLocal(
          meeting.end_date
        ),

      location:
        meeting.location ||
        '',

      meeting_type:
        meeting.meeting_type ||
        'other',

      case_id:
        meeting.case_id ||
        meeting.case?.id ||
        '',

      client_id:
        meeting.client_id ||
        meeting.client?.id ||
        '',

      assigned_to:
        meeting.assigned_to ||
        meeting.assignee?.id ||
        '',

      status:
        meeting.status ||
        'scheduled',

      attendees:
        Array.isArray(
          meeting.attendees
        )
          ? meeting.attendees
          : [],

      meeting_link:
        meeting.meeting_link ||
        '',

      notes:
        meeting.notes ||
        '',
    });
  }, [
    meeting,
  ]);

  // ======================================================
  // MUTATIONS
  // ======================================================

  const updateMeeting =
    useUpdateMeeting();

  const deleteMeeting =
    useDeleteMeeting();

  const updateMutation = {
    ...updateMeeting,

    mutate: (
      data
    ) =>
      updateMeeting.mutate(
        {
          id,
          data,
        },
        {
          onSuccess: () => {
            navigate(
              `/meetings/${id}`
            );
          },
        }
      ),
  };

  const deleteMutation = {
    ...deleteMeeting,

    mutate: () =>
      deleteMeeting.mutate(
        id,
        {
          onSuccess: () => {
            navigate(
              '/meetings'
            );
          },
        }
      ),
  };

  // ======================================================
  // HANDLERS
  // ======================================================

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (
        current
      ) => {
        /*
         * Müvekkil değişirse mevcut dava yeni müvekkile
         * ait değilse temizlenir.
         */
        if (
          name ===
          'client_id'
        ) {
          const currentCaseStillValid =
            !current.case_id ||
            clientCases.some(
              (
                caseItem
              ) =>
                String(
                  caseItem.id
                ) ===
                String(
                  current.case_id
                )
            );

          return {
            ...current,

            client_id:
              value,

            case_id:
              currentCaseStillValid
                ? current.case_id
                : '',
          };
        }

        /*
         * Dava değişirse mevcut müvekkil yeni davaya
         * bağlı değilse temizlenir.
         */
        if (
          name ===
          'case_id'
        ) {
          const currentClientStillValid =
            !current.client_id ||
            caseClients.some(
              (
                client
              ) =>
                String(
                  client.id
                ) ===
                String(
                  current.client_id
                )
            );

          return {
            ...current,

            case_id:
              value,

            client_id:
              currentClientStillValid
                ? current.client_id
                : '',
          };
        }

        return {
          ...current,

          [name]:
            value,
        };
      }
    );

    if (errors[name]) {
      setErrors(
        (current) => ({
          ...current,
          [name]: '',
        })
      );
    }
  };

  const handleAddAttendee =
    () => {
      const name =
        attendeeName.trim();

      const role =
        attendeeRole.trim();

      if (!name) {
        return;
      }

      setFormData(
        (current) => ({
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

      setAttendeeName('');
      setAttendeeRole('');
    };

  const handleRemoveAttendee =
    (index) => {
      setFormData(
        (current) => ({
          ...current,

          attendees:
            current.attendees.filter(
              (
                _attendee,
                attendeeIndex
              ) =>
                attendeeIndex !==
                index
            ),
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
          'Toplantı başlığı gereklidir';
      }

      if (
        !formData.start_date
      ) {
        nextErrors.start_date =
          'Başlangıç tarihi gereklidir';
      }

      if (
        formData.end_date &&
        formData.start_date &&
        new Date(
          formData.end_date
        ) <
          new Date(
            formData.start_date
          )
      ) {
        nextErrors.end_date =
          'Bitiş tarihi başlangıç tarihinden önce olamaz';
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

    if (!canEdit) {
      toast.error(
        'Bu toplantıyı düzenleme yetkiniz bulunmuyor'
      );

      return;
    }

    if (
      updateMutation.isPending
    ) {
      return;
    }

    if (!validateForm()) {
      toast.error(
        'Formdaki eksik veya hatalı alanları kontrol edin'
      );

      return;
    }

    const submitData = {
      title:
        formData.title.trim(),

      description:
        formData.description
          .trim() ||
        null,

      start_date:
        localToUTC(
          formData.start_date
        ),

      end_date:
        localToUTC(
          formData.end_date
        ),

      location:
        formData.location
          .trim() ||
        null,

      meeting_type:
        formData.meeting_type,

      case_id:
        formData.case_id ||
        null,

      client_id:
        formData.client_id ||
        null,

      status:
        formData.status,

      attendees:
        formData.attendees,

      meeting_link:
        formData.meeting_link
          .trim() ||
        null,

      notes:
        formData.notes
          .trim() ||
        null,
    };

    /*
     * Atanan kullanıcı edit ekranında
     * yalnızca admin tarafından değiştirilsin.
     *
     * Non-admin kullanıcı mevcut atamayı
     * yanlışlıkla kendi üzerine çekmesin.
     */
    if (isAdmin) {
      submitData.assigned_to =
        formData.assigned_to ||
        null;
    }

    updateMutation.mutate(
      submitData
    );
  };

  // ======================================================
  // DELETE
  // ======================================================

  const handleDelete =
    () => {
      if (!canDelete) {
        toast.error(
          'Bu toplantıyı silme yetkiniz bulunmuyor'
        );

        return;
      }

      const confirmed =
        window.confirm(
          `"${meeting?.title}" toplantısını silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`
        );

      if (!confirmed) {
        return;
      }

      deleteMutation.mutate();
    };

  // ======================================================
  // LOADING
  // ======================================================

  if (meetingLoading) {
    return (
      <div className="flex h-64 items-center justify-center">

        <div className="text-center">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600" />

          <p className="mt-4 text-sm text-gray-500">
            Toplantı bilgileri yükleniyor...
          </p>

        </div>

      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (
    meetingError ||
    !meeting
  ) {
    return (
      <div className="py-12 text-center">

        <div className="mb-4 text-5xl">
          🤝
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Toplantı Bulunamadı
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {meetingError
            ?.response
            ?.data
            ?.message ||
            meetingError
              ?.message ||
            'Toplantı bilgileri yüklenemedi'}
        </p>

        <Link
          to="/meetings"
          className="mt-4 inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />

          Toplantılara Dön
        </Link>

      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      {/* HEADER */}

      <div>

        <Link
          to={`/meetings/${id}`}
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

          Toplantı Detayı
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">

          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
            Toplantı Düzenle
          </h1>

          <Badge
            variant={getStatusVariant(
              formData.status
            )}
          >
            {getStatusLabel(
              formData.status
            )}
          </Badge>

        </div>

        <p className="mt-1 text-sm text-gray-500">
          Toplantı bilgilerini, katılımcıları ve ilişkili kayıtları güncelleyin.
        </p>

      </div>

      {/* INFO */}

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">

        <div className="flex items-start gap-3">

          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />

          <div>

            <p className="font-medium text-blue-900 dark:text-blue-200">
              Toplantı takvimde otomatik güncellenir
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-300">
              Tarih, durum veya ilişkili dava değiştirildiğinde toplantı takvim ve dashboard verilerine de yansır.
            </p>

          </div>

        </div>

      </div>

      {/* FORM */}

      <Card
        className="
          overflow-hidden
          border
          border-gray-200
          shadow-sm
          dark:border-white/[0.06]
        "
      >

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6 p-6"
        >

          {/* TITLE */}

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
              updateMutation.isPending
            }
            placeholder="Toplantı başlığı..."
          />

          {/* DESCRIPTION */}

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
                updateMutation.isPending
              }
              rows="4"
              className="
                w-full
                rounded-md
                border
                border-gray-300
                bg-white
                px-3
                py-2
                text-gray-900
                outline-none
                focus:ring-2
                focus:ring-blue-500
                disabled:cursor-not-allowed
                disabled:opacity-60
                dark:border-gray-600
                dark:bg-gray-700
                dark:text-white
              "
              placeholder="Toplantı ile ilgili açıklama..."
            />

          </div>

          {/* DATES */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

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
                updateMutation.isPending
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
                updateMutation.isPending
              }
            />

          </div>

          {/* LOCATION */}

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />

                Yer
              </span>
            </label>

            <input
              type="text"
              name="location"
              value={
                formData.location
              }
              onChange={
                handleChange
              }
              disabled={
                updateMutation.isPending
              }
              placeholder="Toplantı yeri..."
              className="
                w-full
                rounded-md
                border
                border-gray-300
                bg-white
                px-3
                py-2
                text-gray-900
                outline-none
                focus:ring-2
                focus:ring-blue-500
                dark:border-gray-600
                dark:bg-gray-700
                dark:text-white
              "
            />

          </div>

          {/* MEETING LINK */}

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">

              <span className="inline-flex items-center gap-1.5">
                <Video className="h-4 w-4" />

                Toplantı Linki
              </span>

            </label>

            <input
              type="url"
              name="meeting_link"
              value={
                formData.meeting_link
              }
              onChange={
                handleChange
              }
              disabled={
                updateMutation.isPending
              }
              placeholder="https://zoom.us/..."
              className="
                w-full
                rounded-md
                border
                border-gray-300
                bg-white
                px-3
                py-2
                text-gray-900
                outline-none
                focus:ring-2
                focus:ring-blue-500
                dark:border-gray-600
                dark:bg-gray-700
                dark:text-white
              "
            />

          </div>

          {/* TYPE + STATUS */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <div>

              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                disabled={
                  updateMutation.isPending
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >

                {MEETING_TYPE_OPTIONS.map(
                  (type) => (
                    <option
                      key={
                        type.value
                      }
                      value={
                        type.value
                      }
                    >
                      {
                        type.label
                      }
                    </option>
                  )
                )}

              </select>

              <p className="mt-1 text-xs text-gray-400">
                {getMeetingTypeLabel(
                  formData.meeting_type
                )}
              </p>

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
                  updateMutation.isPending
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                      {
                        status.label
                      }
                    </option>
                  )
                )}

              </select>

            </div>

          </div>

          {/* RELATED */}

          <div>

            <div className="mb-3 flex items-center gap-2">

              <Link2 className="h-4 w-4 text-blue-600" />

              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                İlişkili Kayıtlar
              </p>

            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              {/* CASE */}

              <div>

                <label className="mb-1 block text-sm text-gray-500">
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
                    updateMutation.isPending ||
                    relationCasesLoading
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >

                  <option value="">
                    {relationCasesLoading
                      ? 'Davalar yükleniyor...'
                      : formData.client_id &&
                          relationCases.length ===
                            0
                        ? 'Bu müvekkile ait dava bulunamadı'
                        : 'Dava seçin'}
                  </option>

                  {relationCases.map(
                    (caseItem) => (
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

                {selectedCase && (
                  <div className="mt-2">

                    <p className="truncate text-xs font-medium text-gray-500 dark:text-slate-400">
                      Seçili: {getCaseDisplayName(
                        selectedCase
                      )}
                    </p>

                    {getCaseSecondaryInfo(
                      selectedCase
                    ) && (
                      <p className="mt-0.5 truncate text-[10px] text-gray-400 dark:text-slate-500">
                        {getCaseSecondaryInfo(
                          selectedCase
                        )}
                      </p>
                    )}

                  </div>
                )}

              </div>

              {/* CLIENT */}

              <div>

                <label className="mb-1 block text-sm text-gray-500">
                  Müvekkil
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
                    updateMutation.isPending ||
                    relationClientsLoading
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >

                  <option value="">
                    {relationClientsLoading
                      ? 'Müvekkiller yükleniyor...'
                      : formData.case_id &&
                          relationClients.length ===
                            0
                        ? 'Bu davaya bağlı müvekkil bulunamadı'
                        : 'Müvekkil seçin'}
                  </option>

                  {relationClients.map(
                    (client) => (
                      <option
                        key={
                          client.id
                        }
                        value={
                          client.id
                        }
                      >
                        {
                          client.name
                        }

                        {client.company_name &&
                          ` (${client.company_name})`}
                      </option>
                    )
                  )}

                </select>

                {selectedClient && (
                  <p className="mt-2 truncate text-xs text-gray-400 dark:text-slate-500">
                    Seçili: {selectedClient.name}
                  </p>
                )}

              </div>

            </div>

          </div>

          {/* ASSIGNEE */}

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">

              <span className="inline-flex items-center gap-1.5">
                <UserRound className="h-4 w-4" />

                Atanan Avukat
              </span>

            </label>

            {isAdmin ? (
              <select
                name="assigned_to"
                value={
                  formData.assigned_to
                }
                onChange={
                  handleChange
                }
                disabled={
                  updateMutation.isPending
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >

                <option value="">
                  Atanacak kişi seçin
                </option>

                {assignableUsers.map(
                  (person) => (
                    <option
                      key={
                        person.id
                      }
                      value={
                        person.id
                      }
                    >
                      {
                        person.first_name
                      }{' '}
                      {
                        person.last_name
                      }

                      {person.role ===
                        'admin' &&
                        ' (Admin)'}

                      {person.role ===
                        'lawyer' &&
                        ' (Avukat)'}

                      {person.role ===
                        'intern' &&
                        ' (Stajyer)'}

                      {person.role ===
                        'secretary' &&
                        ' (Sekreter)'}
                    </option>
                  )
                )}

              </select>
            ) : (
              <div className="rounded-md border border-gray-300 bg-gray-50 px-3 py-2 dark:border-gray-600 dark:bg-gray-800">

                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {meeting.assignee
                    ? `${meeting.assignee.first_name || ''} ${meeting.assignee.last_name || ''}`.trim()
                    : 'Atanmadı'}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Atanan kişi yalnızca yönetici tarafından değiştirilebilir.
                </p>

              </div>
            )}

          </div>

          {/* ATTENDEES */}

          <div>

            <div className="mb-2 flex items-center gap-2">

              <UsersRound className="h-4 w-4 text-blue-600" />

              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Katılımcılar
              </label>

            </div>

            <div className="flex flex-col gap-2 sm:flex-row">

              <input
                type="text"
                value={
                  attendeeName
                }
                onChange={(event) =>
                  setAttendeeName(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    event.preventDefault();

                    handleAddAttendee();
                  }
                }}
                placeholder="Katılımcı adı"
                className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />

              <input
                type="text"
                value={
                  attendeeRole
                }
                onChange={(event) =>
                  setAttendeeRole(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    'Enter'
                  ) {
                    event.preventDefault();

                    handleAddAttendee();
                  }
                }}
                placeholder="Rol"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:w-40"
              />

              <Button
                type="button"
                variant="secondary"
                onClick={
                  handleAddAttendee
                }
              >
                <Plus className="mr-1 h-4 w-4" />

                Ekle
              </Button>

            </div>

            {formData.attendees.length >
              0 && (
              <div className="mt-3 flex flex-wrap gap-2">

                {formData.attendees.map(
                  (
                    attendee,
                    index
                  ) => {
                    const name =
                      typeof attendee ===
                      'string'
                        ? attendee
                        : attendee?.name;

                    const role =
                      typeof attendee ===
                      'object'
                        ? attendee?.role
                        : null;

                    return (
                      <span
                        key={`${name}-${index}`}
                        className="
                          inline-flex
                          items-center
                          gap-2
                          rounded-full
                          bg-gray-100
                          px-3
                          py-1.5
                          text-sm
                          text-gray-700
                          dark:bg-gray-700
                          dark:text-gray-200
                        "
                      >

                        <span>
                          {name ||
                            'Katılımcı'}

                          {role &&
                            ` · ${role}`}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveAttendee(
                              index
                            )
                          }
                          className="text-gray-400 transition hover:text-red-500"
                          aria-label="Katılımcıyı kaldır"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>

                      </span>
                    );
                  }
                )}

              </div>
            )}

          </div>

          {/* NOTES */}

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Notlar
            </label>

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
                updateMutation.isPending
              }
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Toplantıyla ilgili iç notlar..."
            />

          </div>

          {/* WARNING */}

          {formData.status ===
            'cancelled' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">

              <div className="flex items-start gap-3">

                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                <p className="text-sm leading-6 text-red-800 dark:text-red-300">
                  Toplantı iptal durumunda. Kaydettiğinizde takvim ve ilgili ekranlarda iptal edilmiş olarak görünecektir.
                </p>

              </div>

            </div>
          )}

          {/* ACTIONS */}

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">

            {canEdit && (
              <Button
                type="submit"
                loading={
                  updateMutation.isPending
                }
                disabled={
                  updateMutation.isPending ||
                  deleteMutation.isPending
                }
              >
                <Save className="mr-2 h-4 w-4" />

                Değişiklikleri Kaydet
              </Button>
            )}

            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                navigate(
                  `/meetings/${id}`
                )
              }
              disabled={
                updateMutation.isPending ||
                deleteMutation.isPending
              }
            >
              Vazgeç
            </Button>

            {canDelete && (
              <Button
                type="button"
                variant="danger"
                onClick={
                  handleDelete
                }
                loading={
                  deleteMutation.isPending
                }
                disabled={
                  updateMutation.isPending ||
                  deleteMutation.isPending
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />

                Toplantıyı Sil
              </Button>
            )}

          </div>

        </form>

      </Card>

    </div>
  );
};

export default MeetingEdit;