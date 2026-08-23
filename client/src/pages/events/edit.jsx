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
  useMutation,
  useQuery,
} from '@tanstack/react-query';

import eventApi from '../../features/events/event.api.js';
import userApi from '../../features/users/user.api.js';

import {
  useAuth,
} from '../../app/providers/auth.provider.jsx';

import {
  PERMISSION_KEYS,
  hasPermission,
} from '../../constants/roles.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';

import {
  AlarmClock,
  ArrowLeft,
  CalendarDays,
  Gavel,
  MapPin,
  Plus,
  Save,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// CONSTANTS
// ======================================================

const HEARING_TYPES = [
  { value: 'preliminary', label: 'Ön İnceleme' },
  { value: 'investigation', label: 'Tahkikat' },
  { value: 'expert_examination', label: 'Bilirkişi İncelemesi' },
  { value: 'witness_hearing', label: 'Tanık Dinlenmesi' },
  { value: 'final_decision', label: 'Karar Duruşması' },
  { value: 'other', label: 'Diğer' },
];

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Planlandı' },
  { value: 'ongoing', label: 'Devam Ediyor' },
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'cancelled', label: 'İptal' },
];

const EXPENSE_OPTIONS = [
  { value: 'pending', label: 'Bekliyor' },
  { value: 'paid', label: 'Ödendi' },
  { value: 'not_applicable', label: 'Yok' },
];

const REMINDER_OPTIONS = [
  { value: '0', label: 'Hatırlatma yok' },
  { value: '5', label: '5 dakika önce' },
  { value: '10', label: '10 dakika önce' },
  { value: '15', label: '15 dakika önce' },
  { value: '30', label: '30 dakika önce' },
  { value: '60', label: '1 saat önce' },
  { value: '120', label: '2 saat önce' },
  { value: '1440', label: '1 gün önce' },
];

const ROLE_OPTIONS = [
  { value: 'avukat', label: 'Avukat', icon: '⚖️' },
  { value: 'karsi_taraf_avukati', label: 'Karşı Taraf Avukatı', icon: '⚖️' },
  { value: 'müvekkil', label: 'Müvekkil', icon: '👤' },
  { value: 'davaci', label: 'Davacı', icon: '👤' },
  { value: 'davali', label: 'Davalı', icon: '👤' },
  { value: 'tanik', label: 'Tanık', icon: '🗣️' },
  { value: 'bilirkişi', label: 'Bilirkişi', icon: '🔬' },
  { value: 'uzman', label: 'Uzman', icon: '🎯' },
  { value: 'tercüman', label: 'Tercüman', icon: '🌐' },
  { value: 'gözlemci', label: 'Gözlemci', icon: '👁️' },
  { value: 'diger', label: 'Diğer', icon: '👤' },
];

// ======================================================
// HELPERS
// ======================================================

const normalizeNullable = (value) => {
  const normalized = String(value ?? '').trim();
  return normalized || null;
};

const toLocalDateTimeInput = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (number) =>
    String(number).padStart(2, '0');

  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
  ].join('');
};

const localDateTimeToIso = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};

const getRoleLabel = (role) =>
  ROLE_OPTIONS.find((item) => item.value === role)?.label ||
  role ||
  'Katılımcı';

const getRoleIcon = (role) =>
  ROLE_OPTIONS.find((item) => item.value === role)?.icon ||
  '👤';

// ======================================================
// COMPONENT
// ======================================================

const EventEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const canEdit =
    hasPermission(
      user,
      PERMISSION_KEYS.EDIT_EVENTS
    );

  const canDelete =
    hasPermission(
      user,
      PERMISSION_KEYS.DELETE_EVENTS
    );

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    hearing_type: 'other',
    last_hearing_result: '',
    opposing_counsel: '',
    expense_status: 'pending',
    start_date: '',
    end_date: '',
    location: '',
    court_room: '',
    judge_name: '',
    status: 'scheduled',
    case_id: '',
    assigned_to: '',
    is_all_day: false,
    reminder_minutes: '30',
  });

  const [attendeeName, setAttendeeName] =
    useState('');

  const [attendeeRole, setAttendeeRole] =
    useState('diger');

  const [attendees, setAttendees] =
    useState([]);

  const [errors, setErrors] =
    useState({});

  // ======================================================
  // EVENT
  // ======================================================

  const {
    data: eventData,
    isLoading: eventLoading,
    error: eventError,
  } = useQuery({
    queryKey: [
      'event',
      id,
    ],

    queryFn: () =>
      eventApi.getOne(id),

    enabled:
      Boolean(id),

    staleTime:
      2 * 60 * 1000,
  });

  const event =
    eventData?.data?.data ||
    null;

  useEffect(() => {
    if (!event) {
      return;
    }

    setFormData({
      title:
        event.title || '',

      description:
        event.description || '',

      hearing_type:
        event.hearing_type || 'other',

      last_hearing_result:
        event.last_hearing_result || '',

      opposing_counsel:
        event.opposing_counsel || '',

      expense_status:
        event.expense_status || 'pending',

      start_date:
        toLocalDateTimeInput(
          event.start_date
        ),

      end_date:
        toLocalDateTimeInput(
          event.end_date
        ),

      location:
        event.location || '',

      court_room:
        event.court_room || '',

      judge_name:
        event.judge_name || '',

      status:
        event.status || 'scheduled',

      case_id:
        event.case_id || '',

      assigned_to:
        event.assigned_to || '',

      is_all_day:
        Boolean(
          event.is_all_day
        ),

      reminder_minutes:
        String(
          event.reminder_minutes ??
          30
        ),
    });

    setAttendees(
      Array.isArray(
        event.attendees
      )
        ? event.attendees
        : []
    );
  }, [
    event,
  ]);

  // ======================================================
  // USERS
  // ======================================================

  const {
    data: usersData,
    isLoading: usersLoading,
  } = useQuery({
    queryKey: [
      'users',
      'hearing-assignees',
    ],

    queryFn: () =>
      userApi.getAll({
        page: 1,
        limit: 100,
      }),

    staleTime:
      5 * 60 * 1000,
  });

  const users =
    Array.isArray(
      usersData?.data?.data
    )
      ? usersData.data.data
      : [];

  const assignableUsers =
    useMemo(
      () =>
        users.filter(
          (item) =>
            [
              'admin',
              'lawyer',
            ].includes(
              item.role
            )
        ),
      [
        users,
      ]
    );

  // ======================================================
  // MUTATIONS
  // ======================================================

  const mutation =
    useMutation({
      mutationFn: (payload) =>
        eventApi.update(
          id,
          payload
        ),

      onSuccess: () => {
        toast.success(
          'Duruşma başarıyla güncellendi'
        );

        navigate(
          `/events/${id}`
        );
      },

      onError: (error) => {
        toast.error(
          error
            ?.response
            ?.data
            ?.message ||
          error?.message ||
          'Duruşma güncellenemedi'
        );
      },
    });

  const deleteMutation =
    useMutation({
      mutationFn: () =>
        eventApi.remove(id),

      onSuccess: () => {
        toast.success(
          'Duruşma silindi'
        );

        if (
          event?.case_id
        ) {
          navigate(
            `/cases/${event.case_id}`
          );

          return;
        }

        navigate(
          '/calendar'
        );
      },

      onError: (error) => {
        toast.error(
          error
            ?.response
            ?.data
            ?.message ||
          error?.message ||
          'Duruşma silinemedi'
        );
      },
    });

  const isPending =
    mutation.isPending ||
    deleteMutation.isPending;

  // ======================================================
  // CHANGE
  // ======================================================

  const handleChange = (e) => {
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setFormData(
      (current) => ({
        ...current,
        [name]:
          type === 'checkbox'
            ? checked
            : value,
      })
    );

    if (
      errors[name]
    ) {
      setErrors(
        (current) => ({
          ...current,
          [name]: '',
        })
      );
    }
  };

  // ======================================================
  // ATTENDEES
  // ======================================================

  const addAttendee = () => {
    const name =
      attendeeName.trim();

    if (!name) {
      return;
    }

    const exists =
      attendees.some(
        (item) =>
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

    if (exists) {
      toast.error(
        'Bu katılımcı zaten eklenmiş'
      );

      return;
    }

    setAttendees(
      (current) => [
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
      (current) =>
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

  const handleAttendeeKeyDown = (
    e
  ) => {
    if (
      e.key !==
      'Enter'
    ) {
      return;
    }

    e.preventDefault();
    addAttendee();
  };

  // ======================================================
  // VALIDATION
  // ======================================================

  const validateForm = () => {
    const nextErrors = {};

    if (
      formData.title
        .trim()
        .length < 2
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
    e
  ) => {
    e.preventDefault();

    if (
      !canEdit
    ) {
      toast.error(
        'Duruşma düzenleme yetkiniz bulunmuyor.'
      );

      return;
    }

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
        formData.case_id ||
        null,

      assigned_to:
        formData.assigned_to ||
        null,

      is_all_day:
        Boolean(
          formData.is_all_day
        ),

      reminder_minutes:
        Number(
          formData.reminder_minutes
        ) || 0,

      attendees:
        attendees.map(
          (attendee) => ({
            name:
              String(
                attendee.name ||
                ''
              ).trim(),

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
  // DELETE
  // ======================================================

  const handleDelete = () => {
    if (
      !canDelete
    ) {
      toast.error(
        'Duruşma silme yetkiniz bulunmuyor.'
      );

      return;
    }

    if (
      isPending
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        'Bu duruşmayı silmek istediğinize emin misiniz? Duruşmaya ait hatırlatmalar da iptal edilecektir.'
      );

    if (!confirmed) {
      return;
    }

    deleteMutation.mutate();
  };

  // ======================================================
  // LOADING / ERROR
  // ======================================================

  if (
    eventLoading
  ) {
    return (
      <div className="flex min-h-[20rem] flex-col items-center justify-center gap-3">

        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />

        <p className="text-sm text-gray-500">
          Duruşma yükleniyor...
        </p>

      </div>
    );
  }

  if (
    eventError ||
    !event
  ) {
    return (
      <div className="py-16 text-center">

        <Gavel className="mx-auto h-10 w-10 text-gray-300" />

        <h2 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
          Duruşma bulunamadı
        </h2>

        <Link
          to="/calendar"
          className="mt-4 inline-block"
        >
          <Button variant="outline">
            Takvime Dön
          </Button>
        </Link>

      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      <div>

        <Link
          to={`/events/${id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Duruşmaya Dön
        </Link>

        <div className="mt-4 flex items-start gap-3">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">
            <Gavel className="h-6 w-6 text-blue-600" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Duruşmayı Düzenle
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Duruşma bilgilerini, sorumlu avukatı, katılımcıları ve hatırlatma ayarlarını güncelleyin.
            </p>
          </div>

        </div>

      </div>

      <Card>
        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-8 p-6"
        >

          <section className="space-y-4">

            <h2 className="font-semibold text-gray-900 dark:text-white">
              Duruşma Bilgileri
            </h2>

            <Input
              label="Başlık *"
              name="title"
              value={formData.title}
              onChange={handleChange}
              error={errors.title}
              disabled={isPending}
            />

            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={isPending}
              rows="3"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Duruşmaya ilişkin genel not..."
            />

            <div className="grid gap-4 md:grid-cols-2">

              <select
                name="hearing_type"
                value={formData.hearing_type}
                onChange={handleChange}
                disabled={isPending}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {HEARING_TYPES.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>

              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                disabled={isPending}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {STATUS_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>

            </div>

          </section>

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Tarih ve Saat
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <Input
                label="Başlangıç Tarihi *"
                name="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={handleChange}
                error={errors.start_date}
                disabled={isPending}
              />

              <Input
                label="Bitiş Tarihi"
                name="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={handleChange}
                error={errors.end_date}
                disabled={isPending}
              />

            </div>

            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                name="is_all_day"
                checked={formData.is_all_day}
                onChange={handleChange}
                disabled={isPending}
                className="h-4 w-4 rounded"
              />

              <span className="text-sm text-gray-700 dark:text-gray-300">
                Tüm gün etkinlik
              </span>
            </label>

          </section>

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-600" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Mahkeme ve Yer Bilgileri
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">

              <Input
                label="Mahkeme / Yer"
                name="location"
                value={formData.location}
                onChange={handleChange}
                disabled={isPending}
              />

              <Input
                label="Salon"
                name="court_room"
                value={formData.court_room}
                onChange={handleChange}
                disabled={isPending}
              />

              <Input
                label="Hakim"
                name="judge_name"
                value={formData.judge_name}
                onChange={handleChange}
                disabled={isPending}
              />

            </div>

          </section>

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <div className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-purple-600" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Avukat Bilgileri
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Atanan Avukat
                </label>

                <select
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={handleChange}
                  disabled={
                    isPending ||
                    usersLoading ||
                    user?.role === 'lawyer'
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">
                    Avukat seçin
                  </option>

                  {assignableUsers.map(
                    (person) => (
                      <option
                        key={person.id}
                        value={person.id}
                      >
                        {person.first_name}{' '}
                        {person.last_name}
                        {person.role === 'admin'
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
                value={formData.opposing_counsel}
                onChange={handleChange}
                disabled={isPending}
              />

            </div>

          </section>

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Katılımcılar
              </h2>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_12rem_auto]">

              <input
                value={attendeeName}
                onChange={(e) =>
                  setAttendeeName(
                    e.target.value
                  )
                }
                onKeyDown={handleAttendeeKeyDown}
                disabled={isPending}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Katılımcı adı"
              />

              <select
                value={attendeeRole}
                onChange={(e) =>
                  setAttendeeRole(
                    e.target.value
                  )
                }
                disabled={isPending}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {ROLE_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.icon}{' '}
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
                onClick={addAttendee}
              >
                <Plus className="mr-1 h-4 w-4" />
                Ekle
              </Button>

            </div>

            <div className="space-y-2">
              {attendees.map(
                (attendee, index) => (
                  <div
                    key={`${attendee.name}-${attendee.role}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {getRoleIcon(
                          attendee.role
                        )}{' '}
                        {attendee.name}
                      </p>

                      <p className="text-xs text-gray-500">
                        {getRoleLabel(
                          attendee.role
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeAttendee(index)
                      }
                      disabled={isPending}
                      className="rounded p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              )}
            </div>

          </section>

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <textarea
              name="last_hearing_result"
              value={formData.last_hearing_result}
              onChange={handleChange}
              disabled={isPending}
              rows="3"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Son duruşma sonucu..."
            />

            <select
              name="expense_status"
              value={formData.expense_status}
              onChange={handleChange}
              disabled={isPending}
              className="w-full max-w-sm rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {EXPENSE_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>

          </section>

          <section className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700">

            <div className="flex items-center gap-2">
              <AlarmClock className="h-5 w-5 text-amber-500" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Hatırlatma
              </h2>
            </div>

            <select
              name="reminder_minutes"
              value={formData.reminder_minutes}
              onChange={handleChange}
              disabled={isPending}
              className="w-full max-w-sm rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {REMINDER_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>

          </section>

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">

            {canEdit && (
              <Button
                type="submit"
                loading={mutation.isPending}
                disabled={isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                Değişiklikleri Kaydet
              </Button>
            )}

            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() =>
                navigate(
                  `/events/${id}`
                )
              }
            >
              Vazgeç
            </Button>

            {canDelete && (
              <Button
                type="button"
                variant="danger"
                loading={deleteMutation.isPending}
                disabled={isPending}
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Duruşmayı Sil
              </Button>
            )}

          </div>

        </form>
      </Card>
    </div>
  );
};

export default EventEdit;
