import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  useCases,
} from '../../features/cases/case.query.js';

import {
  useClients,
} from '../../features/clients/client.query.js';

import {
  useCreateTask,
  useAssignableUsers,
} from '../../features/tasks/task.query.js';

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
import Badge from '../../components/ui/Badge.jsx';

import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  CheckSquare2,
  Clock3,
  FileText,
  Save,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';

// ======================================================
// CONSTANTS
// ======================================================

const INITIAL_FORM = {
  title: '',
  description: '',
  priority: 'normal',
  due_date: '',
  assigned_to: '',
  case_id: '',
  client_id: '',
  estimated_hours: '',
  note: '',
};

const VALID_PRIORITIES = new Set([
  'low',
  'normal',
  'high',
  'critical',
]);

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

const normalizeDateTimeLocal = (
  value
) => {
  if (!value) {
    return '';
  }

  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(
      value
    )
  ) {
    return value.slice(
      0,
      16
    );
  }

  return value;
};

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

// ======================================================
// COMPONENT
// ======================================================

const TaskCreate = () => {
  const navigate =
    useNavigate();

  const [
    searchParams,
  ] =
    useSearchParams();

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
    errors,
    setErrors,
  ] =
    useState({});

  // ====================================================
  // PERMISSIONS
  // ====================================================

  const canAssignTasks =
    hasPermission(
      user,
      PERMISSION_KEYS.ASSIGN_TASKS
    );

  const canViewCases =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_CASES
    );

  const canViewClients =
    hasPermission(
      user,
      PERMISSION_KEYS.VIEW_CLIENTS
    );

  // ====================================================
  // QUERY PARAM PREFILL
  // ====================================================

  const prefillData =
    useMemo(() => {
      const priority =
        searchParams.get(
          'priority'
        );

      const dueDate =
        searchParams.get(
          'due_date'
        );

      return {
        title:
          searchParams.get(
            'title'
          ) || '',

        description:
          searchParams.get(
            'description'
          ) || '',

        priority:
          priority &&
          VALID_PRIORITIES.has(
            priority
          )
            ? priority
            : 'normal',

        due_date:
          normalizeDateTimeLocal(
            dueDate
          ),

        estimated_hours:
          searchParams.get(
            'estimated_hours'
          ) || '',

        case_id:
          searchParams.get(
            'case_id'
          ) || '',

        client_id:
          searchParams.get(
            'client_id'
          ) || '',

        note:
          searchParams.get(
            'note'
          ) || '',

        source:
          searchParams.get(
            'source'
          ) || '',
      };
    }, [
      searchParams,
    ]);

  const isAiPrefill =
    prefillData.source ===
    'ai';

  // ====================================================
  // QUERIES
  // ====================================================

  const {
    data:
      assignableUsersData,
    isLoading:
      assignableUsersLoading,
  } =
    useAssignableUsers(
      canAssignTasks
    );

  const {
    data:
      casesData,
    isLoading:
      casesLoading,
  } =
    useCases({
      limit: 100,
    });

  const {
    data:
      clientsData,
    isLoading:
      clientsLoading,
  } =
    useClients({
      limit: 100,
    });

  const createMutation =
    useCreateTask();

  const assignableUsers =
    Array.isArray(
      assignableUsersData
        ?.data
        ?.data
    )
      ? assignableUsersData
          .data
          .data
      : [];

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

  // ====================================================
  // PREFILL
  // ====================================================

  useEffect(() => {
    const hasPrefill =
      Boolean(
        prefillData.title
      ) ||
      Boolean(
        prefillData.description
      ) ||
      Boolean(
        prefillData.case_id
      ) ||
      Boolean(
        prefillData.client_id
      ) ||
      Boolean(
        prefillData.due_date
      ) ||
      Boolean(
        prefillData.estimated_hours
      ) ||
      Boolean(
        prefillData.note
      ) ||
      isAiPrefill;

    if (
      !hasPrefill
    ) {
      return;
    }

    setFormData(
      (
        current
      ) => ({
        ...current,

        title:
          prefillData.title ||
          current.title,

        description:
          prefillData.description ||
          current.description,

        priority:
          prefillData.priority ||
          current.priority,

        due_date:
          prefillData.due_date ||
          current.due_date,

        estimated_hours:
          prefillData.estimated_hours ||
          current.estimated_hours,

        case_id:
          canViewCases
            ? (
                prefillData.case_id ||
                current.case_id
              )
            : '',

        client_id:
          canViewClients
            ? (
                prefillData.client_id ||
                current.client_id
              )
            : '',

        note:
          prefillData.note ||
          current.note,
      })
    );
  }, [
    prefillData,
    isAiPrefill,
    canViewCases,
    canViewClients,
  ]);

  // ====================================================
  // DEFAULT ASSIGNEE
  //
  // assign_tasks yoksa kullanıcı yalnızca kendisine
  // görev oluşturur.
  // ====================================================

  useEffect(() => {
    if (
      !canAssignTasks &&
      user?.id
    ) {
      setFormData(
        (
          current
        ) => ({
          ...current,
          assigned_to:
            user.id,
        })
      );
    }
  }, [
    canAssignTasks,
    user?.id,
  ]);

  // ====================================================
  // SELECTED DATA
  // ====================================================

  const selectedCase =
    useMemo(() => {
      return cases.find(
        (
          item
        ) =>
          item.id ===
          formData.case_id
      );
    }, [
      cases,
      formData.case_id,
    ]);

  const selectedClient =
    useMemo(() => {
      return clients.find(
        (
          item
        ) =>
          item.id ===
          formData.client_id
      );
    }, [
      clients,
      formData.client_id,
    ]);

  // ====================================================
  // HANDLERS
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

      if (
        name ===
          'assigned_to' &&
        !canAssignTasks
      ) {
        return;
      }

      if (
        name ===
          'case_id' &&
        !canViewCases
      ) {
        return;
      }

      if (
        name ===
          'client_id' &&
        !canViewClients
      ) {
        return;
      }

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
          'Görev adı gereklidir';
      }

      if (
        formData.estimated_hours &&
        Number(
          formData.estimated_hours
        ) <
          0
      ) {
        newErrors.estimated_hours =
          'Tahmini süre negatif olamaz';
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

      /*
       * assign_tasks yoksa frontend her zaman
       * oturum açmış kullanıcıyı gönderir.
       */
      const assignedTo =
        canAssignTasks
          ? formData.assigned_to
          : user?.id;

      const submitData = {
        title:
          formData.title.trim(),

        description:
          formData.description
            ?.trim() ||
          null,

        /*
         * Yeni görev workflow'a pending olarak girer.
         * Status daha sonra start/complete/approve
         * endpointleri üzerinden ilerler.
         */
        status:
          'pending',

        priority:
          formData.priority,

        note:
          formData.note
            ?.trim() ||
          '',

        assigned_to:
          assignedTo ||
          null,

        case_id:
          canViewCases
            ? (
                formData.case_id ||
                null
              )
            : null,

        client_id:
          canViewClients
            ? (
                formData.client_id ||
                null
              )
            : null,

        due_date:
          formData.due_date ||
          null,

        estimated_hours:
          formData.estimated_hours
            ? Number(
                formData.estimated_hours
              )
            : null,
      };

      createMutation.mutate(
        submitData,
        {
          onSuccess: (
            response
          ) => {
            const taskId =
              response?.data
                ?.data?.id;

            if (
              taskId
            ) {
              navigate(
                `/tasks/${taskId}`
              );

              return;
            }

            navigate(
              '/tasks'
            );
          },
        }
      );
    };

  const handleCancel =
    () => {
      if (
        canViewCases &&
        formData.case_id
      ) {
        navigate(
          `/cases/${formData.case_id}`
        );

        return;
      }

      navigate(
        '/tasks'
      );
    };

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div>

        <Link
          to="/tasks"
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
          Görevler
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
            <CheckSquare2 size={21} />
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
              Yeni Görev
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
              Yapılacak işi, sorumlu kişiyi, önceliği ve ilişkili dosyaları tanımlayın.
            </p>

          </div>

        </div>

      </div>

      {/* ==================================================
          AI PREFILL
      ================================================== */}

      {isAiPrefill && (
        <div
          className="
            rounded-xl
            border
            border-blue-200
            bg-blue-50/70
            p-4
            dark:border-blue-500/20
            dark:bg-blue-500/[0.05]
          "
        >

          <div className="flex items-start gap-3">

            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-blue-100
                text-blue-600
                dark:bg-blue-500/[0.1]
                dark:text-blue-400
              "
            >
              <Sparkles size={17} />
            </div>

            <div>

              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                AI önerisinden görev oluşturuluyor
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-700/80 dark:text-blue-300/70">
                Bazı alanlar dava analizindeki öneriden otomatik dolduruldu.
                Kaydetmeden önce görev içeriğini, sorumlu kişiyi ve son tarihi kontrol edin.
              </p>

            </div>

          </div>

        </div>
      )}

      {/* ==================================================
          FORM
      ================================================== */}

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
                <FileText size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Görev Bilgileri
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Görevin adı, açıklaması ve başlangıç notu
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <Input
              label="Görev Adı *"
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
              placeholder="Örn: Bilirkişi raporuna itiraz dilekçesi hazırla"
              autoFocus
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
                rows={4}
                placeholder="Görevin kapsamını ve yapılması gerekenleri açıklayın..."
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
                  transition
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

            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Başlangıç Notu
              </label>

              <textarea
                name="note"
                value={
                  formData.note
                }
                onChange={
                  handleChange
                }
                rows={3}
                placeholder="Göreve ilişkin ilk not veya önemli hatırlatma..."
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
                  transition
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

              <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                Bu not görev detayında ekip üyeleri tarafından görüntülenebilir.
              </p>

            </div>

          </Card.Body>

        </Card>

        {/* ==================================================
            PLANNING
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
                  Planlama
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Öncelik, son tarih ve tahmini çalışma süresi
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body className="space-y-5">

            <div className="grid gap-4 md:grid-cols-2">

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

                <div className="mt-2">
                  <Badge
                    variant={
                      getPriorityVariant(
                        formData.priority
                      )
                    }
                    dot
                  >
                    {PRIORITY_OPTIONS.find(
                      (
                        option
                      ) =>
                        option.value ===
                        formData.priority
                    )?.label ||
                      formData.priority}
                  </Badge>
                </div>

              </div>

              {/* DUE DATE */}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Son Tarih
                </label>

                <input
                  type="datetime-local"
                  name="due_date"
                  value={
                    formData.due_date
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
                />

              </div>

            </div>

            <div className="max-w-xs">

              <Input
                label="Tahmini Süre (Saat)"
                name="estimated_hours"
                type="number"
                value={
                  formData.estimated_hours
                }
                onChange={
                  handleChange
                }
                error={
                  errors.estimated_hours
                }
                min="0"
                step="0.5"
                placeholder="Örn: 2.5"
                icon={
                  <Clock3 size={16} />
                }
              />

            </div>

            <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-xs text-gray-500 dark:bg-white/[0.025] dark:text-slate-400">
              Yeni görev <strong>Bekliyor</strong> durumunda oluşturulur. Görev durumu daha sonra görev iş akışından değiştirilir.
            </div>

          </Card.Body>

        </Card>

        {/* ==================================================
            ASSIGNMENT
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
                <Users size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Görev Ataması
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Görevden sorumlu kullanıcıyı belirleyin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            {canAssignTasks ? (
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
                    assignableUsersLoading
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
                    {assignableUsersLoading
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

                    <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                      Başka kullanıcıya görev atama yetkiniz olmadığı için görev size atanacaktır.
                    </p>

                  </div>

                </div>

                <Badge
                  variant="primary"
                  dot
                >
                  Kendin
                </Badge>

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
                  bg-emerald-50
                  text-emerald-600
                  dark:bg-emerald-500/[0.08]
                  dark:text-emerald-400
                "
              >
                <BriefcaseBusiness size={17} />
              </div>

              <div>

                <h2 className="font-semibold text-gray-900 dark:text-white">
                  İlişkili Kayıtlar
                </h2>

                <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                  Görevi dava veya müvekkil kaydıyla ilişkilendirin
                </p>

              </div>

            </div>

          </Card.Header>

          <Card.Body>

            <div className="grid gap-4 md:grid-cols-2">

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
                    casesLoading ||
                    !canViewCases
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
                    {!canViewCases
                      ? 'Dava görüntüleme yetkiniz yok'
                      : casesLoading
                        ? 'Davalar yükleniyor...'
                        : 'Dava seçin (isteğe bağlı)'}
                  </option>

                  {canViewCases &&
                    cases.map(
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
                          {caseItem.title}
                        </option>
                      )
                    )}
                </select>

                {isAiPrefill &&
                  canViewCases &&
                  formData.case_id && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">

                      <Sparkles className="h-3.5 w-3.5" />

                      AI önerisinin ilişkili davası otomatik seçildi.

                    </div>
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

                    <p className="truncate text-xs font-semibold text-gray-700 dark:text-slate-300">
                      {selectedCase.title}
                    </p>

                    {selectedCase.case_number && (
                      <p className="mt-1 text-[10px] text-gray-400 dark:text-slate-500">
                        {selectedCase.case_number}
                      </p>
                    )}

                  </div>
                )}

              </div>

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
                    clientsLoading ||
                    !canViewClients
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
                    {!canViewClients
                      ? 'Müvekkil görüntüleme yetkiniz yok'
                      : clientsLoading
                        ? 'Müvekkiller yükleniyor...'
                        : 'Müvekkil seçin (isteğe bağlı)'}
                  </option>

                  {canViewClients &&
                    clients.map(
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

                    <div
                      className="
                        flex
                        h-8
                        w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        bg-blue-50
                        text-blue-600
                        dark:bg-blue-500/[0.08]
                        dark:text-blue-400
                      "
                    >
                      <UserRound size={15} />
                    </div>

                    <div className="min-w-0">

                      <p className="truncate text-xs font-semibold text-gray-700 dark:text-slate-300">
                        {selectedClient.name}
                      </p>

                      {selectedClient.company_name && (
                        <p className="mt-0.5 truncate text-[10px] text-gray-400 dark:text-slate-500">
                          {selectedClient.company_name}
                        </p>
                      )}

                    </div>

                  </div>
                )}

              </div>

            </div>

          </Card.Body>

        </Card>

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
            onClick={
              handleCancel
            }
            disabled={
              createMutation.isPending
            }
          >
            İptal
          </Button>

          <Button
            type="submit"
            loading={
              createMutation.isPending
            }
            disabled={
              createMutation.isPending
            }
          >
            <Save className="h-4 w-4" />
            Görevi Oluştur
          </Button>

        </div>

      </form>

    </div>
  );
};

export default TaskCreate;
