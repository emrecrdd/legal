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
  useTask,
  useUpdateTask,
  useDeleteTask,
  useAssignableUsers,
  useAssignTask,
} from '../../features/tasks/task.query.js';

import {
  useCases,
} from '../../features/cases/case.query.js';

import {
  useClients,
} from '../../features/clients/client.query.js';

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
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileLock2,
  Save,
  Trash2,
  UserRound,
} from 'lucide-react';

import toast from 'react-hot-toast';

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
};

const PRIORITY_LABELS = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
  critical: 'Kritik',
};

// ======================================================
// HELPERS
// ======================================================

const normalizeId = (
  value
) => {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return '';
  }

  return String(
    value
  );
};

// ======================================================
// DATE
// ======================================================

const formatForDateTimeLocal = (
  date
) => {
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

          year:
            'numeric',

          month:
            '2-digit',

          day:
            '2-digit',

          hour:
            '2-digit',

          minute:
            '2-digit',

          hour12:
            false,
        }
      ).formatToParts(
        parsed
      );

    const map = {};

    for (
      const part
      of parts
    ) {
      if (
        part.type !==
        'literal'
      ) {
        map[
          part.type
        ] =
          part.value;
      }
    }

    return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
  } catch {
    return '';
  }
};

// ======================================================
// STATUS
// ======================================================

const getDisplayStatus = (
  task
) => {
  if (
    task?.status ===
      'completed' &&
    !task?.approved_at
  ) {
    return {
      label:
        'Onay Bekliyor',

      variant:
        'warning',
    };
  }

  if (
    task?.approved_at
  ) {
    return {
      label:
        'Tamamlandı',

      variant:
        'success',
    };
  }

  switch (
    task?.status
  ) {
    case 'pending':
      return {
        label:
          'Bekliyor',

        variant:
          'warning',
      };

    case 'in_progress':
      return {
        label:
          'Devam Ediyor',

        variant:
          'info',
      };

    case 'completed':
      return {
        label:
          'Tamamlandı',

        variant:
          'success',
      };

    case 'cancelled':
      return {
        label:
          'İptal',

        variant:
          'danger',
      };

    default:
      return {
        label:
          task?.status ||
          'Bilinmiyor',

        variant:
          'default',
      };
  }
};

const getPriorityVariant = (
  priority
) => {
  switch (
    priority
  ) {
    case 'critical':
      return 'danger';

    case 'high':
      return 'warning';

    default:
      return 'default';
  }
};

// ======================================================
// COMPONENT
// ======================================================

const TaskEdit = () => {
  const {
    id,
  } =
    useParams();

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
    errors,
    setErrors,
  ] =
    useState({});

  // ====================================================
  // BASE PERMISSIONS
  // ====================================================

  const hasEditPermission =
    hasPermission(
      user,
      PERMISSION_KEYS.EDIT_TASKS
    );

  const hasAssignPermission =
    hasPermission(
      user,
      PERMISSION_KEYS.ASSIGN_TASKS
    );

  const hasDeletePermission =
    hasPermission(
      user,
      PERMISSION_KEYS.DELETE_TASKS
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
  // QUERIES
  // ====================================================

  const {
    data,
    isLoading:
      taskLoading,
    error:
      taskError,
  } =
    useTask(id);

  const {
    data:
      assignableUsersData,
    isFetching:
      assignableUsersFetching,
  } =
    useAssignableUsers(
      hasAssignPermission
    );

  const {
    data:
      casesData,
  } =
    useCases({
      limit: 100,
    });

  const {
    data:
      clientsData,
  } =
    useClients({
      limit: 100,
    });

  // ====================================================
  // MUTATIONS
  // ====================================================

  const updateMutation =
    useUpdateTask();

  const assignMutation =
    useAssignTask();

  const deleteMutation =
    useDeleteTask();

  // ====================================================
  // DATA
  // ====================================================

  const task =
    data?.data?.data;

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
      casesData
        ?.data
        ?.data
    )
      ? casesData
          .data
          .data
      : [];

  const clients =
    Array.isArray(
      clientsData
        ?.data
        ?.data
    )
      ? clientsData
          .data
          .data
      : [];

  // ====================================================
  // WORKFLOW + PERMISSIONS
  // ====================================================

  const permissions =
    useMemo(() => {
      const awaitingApproval =
        task?.status ===
          'completed' &&
        !task?.approved_at;

      const approved =
        Boolean(
          task?.approved_at
        );

      const cancelled =
        task?.status ===
        'cancelled';

      const workflowLocked =
        awaitingApproval ||
        approved ||
        cancelled;

      return {
        awaitingApproval,
        approved,
        cancelled,
        workflowLocked,

        canEdit:
          hasEditPermission &&
          !workflowLocked,

        canChangeAssignee:
          hasAssignPermission &&
          !workflowLocked,

        canDelete:
          hasDeletePermission &&
          !approved,
      };
    }, [
      task,
      hasEditPermission,
      hasAssignPermission,
      hasDeletePermission,
    ]);

  const {
    awaitingApproval,
    approved,
    cancelled,
    workflowLocked,

    canEdit,
    canChangeAssignee,
    canDelete,
  } =
    permissions;

  // ====================================================
  // STATUS
  // ====================================================

  const displayStatus =
    useMemo(
      () =>
        getDisplayStatus(
          task
        ),
      [
        task,
      ]
    );

  // ====================================================
  // FORM INIT
  // ====================================================

  useEffect(() => {
    if (!task) {
      return;
    }

    setFormData({
      title:
        task.title ||
        '',

      description:
        task.description ||
        '',

      priority:
        task.priority ||
        'normal',

      due_date:
        formatForDateTimeLocal(
          task.due_date
        ),

      assigned_to:
        normalizeId(
          task.assigned_to
        ),

      case_id:
        normalizeId(
          task.case_id
        ),

      client_id:
        normalizeId(
          task.client_id
        ),

      estimated_hours:
        task.estimated_hours ??
        '',
    });
  }, [
    task,
  ]);

  // ====================================================
  // CHANGE
  // ====================================================

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } =
      event.target;

    if (
      name ===
        'assigned_to'
    ) {
      if (
        !canChangeAssignee
      ) {
        return;
      }
    } else if (
      !canEdit
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
      errors[
        name
      ]
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
  // VALIDATION
  // ====================================================

  const validateForm =
    () => {
      const nextErrors =
        {};

      if (
        !formData
          .title
          .trim()
      ) {
        nextErrors.title =
          'Görev adı gereklidir';
      }

      if (
        formData
          .estimated_hours !==
          ''
      ) {
        const hours =
          Number(
            formData
              .estimated_hours
          );

        if (
          !Number.isFinite(
            hours
          ) ||
          hours < 0
        ) {
          nextErrors.estimated_hours =
            'Tahmini süre 0 veya daha büyük olmalıdır';
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

  // ====================================================
  // SUBMIT
  // ====================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (
      workflowLocked
    ) {
      toast.error(
        'Bu görev mevcut iş akışı durumunda düzenlenemez.'
      );

      return;
    }

    if (
      !canEdit &&
      !canChangeAssignee
    ) {
      toast.error(
        'Bu görev üzerinde değişiklik yapma yetkiniz bulunmuyor.'
      );

      return;
    }

    if (
      canEdit &&
      !validateForm()
    ) {
      return;
    }

    // ==================================================
    // GENERAL UPDATE DATA
    // ==================================================

    const updateData =
      {};

    if (
      canEdit
    ) {
      updateData.title =
        formData
          .title
          .trim();

      updateData.description =
        formData
          .description
          .trim() ||
        null;

      updateData.priority =
        formData.priority;

      updateData.due_date =
        formData
          .due_date ||
        null;

      updateData.estimated_hours =
        formData
          .estimated_hours !==
        ''
          ? Number(
              formData
                .estimated_hours
            )
          : null;

      if (
        canViewCases
      ) {
        updateData.case_id =
          formData
            .case_id ||
          null;
      }

      if (
        canViewClients
      ) {
        updateData.client_id =
          formData
            .client_id ||
          null;
      }
    }

    // ==================================================
    // ASSIGNMENT
    //
    // Atama PUT /tasks/:id ile değil,
    // PATCH /tasks/:id/assign ile yapılır.
    // ==================================================

    const currentAssignee =
      normalizeId(
        task.assigned_to
      );

    const requestedAssignee =
      normalizeId(
        formData.assigned_to
      );

    const assignmentChanged =
      canChangeAssignee &&
      requestedAssignee !==
        currentAssignee;

    if (
      assignmentChanged &&
      !requestedAssignee
    ) {
      toast.error(
        'Görev ataması boş bırakılamaz.'
      );

      return;
    }

    const hasGeneralUpdate =
      canEdit &&
      Object.keys(
        updateData
      ).length >
        0;

    if (
      !hasGeneralUpdate &&
      !assignmentChanged
    ) {
      toast.error(
        'Güncellenecek alan bulunamadı.'
      );

      return;
    }

    try {
      if (
        hasGeneralUpdate
      ) {
        await updateMutation.mutateAsync({
          id,

          data:
            updateData,
        });
      }

      if (
        assignmentChanged
      ) {
        await assignMutation.mutateAsync({
          id,

          assigned_to:
            requestedAssignee,
        });
      }

      navigate(
        `/tasks/${id}`
      );
    } catch {
      /*
       * Toast mesajları mutation hook'larında
       * gösteriliyor.
       */
    }
  };

  // ====================================================
  // DELETE
  // ====================================================

  const handleDelete =
    () => {
      if (
        !canDelete
      ) {
        toast.error(
          'Bu görevi silme yetkiniz bulunmuyor.'
        );

        return;
      }

      const confirmed =
        window.confirm(
          `"${task?.title}" görevini silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`
        );

      if (
        !confirmed
      ) {
        return;
      }

      deleteMutation.mutate(
        id,
        {
          onSuccess:
            () => {
              navigate(
                '/tasks'
              );
            },
        }
      );
    };

  // ====================================================
  // LOADING
  // ====================================================

  if (
    taskLoading
  ) {
    return (
      <div className="flex h-64 items-center justify-center">

        <div className="text-center">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600" />

          <p className="mt-4 text-sm text-gray-500">
            Görev bilgileri yükleniyor...
          </p>

        </div>

      </div>
    );
  }

  // ====================================================
  // ERROR
  // ====================================================

  if (
    taskError ||
    !task
  ) {
    return (
      <div className="py-12 text-center">

        <div className="mb-4 text-5xl">
          📋
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Görev Bulunamadı
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          {taskError
            ?.response
            ?.data
            ?.message ||
            taskError
              ?.message ||
            'Görev bilgileri yüklenemedi'}
        </p>

        <Link
          to="/tasks"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />

          Görevlere Dön
        </Link>

      </div>
    );
  }

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
          to={`/tasks/${id}`}
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

          Görev Detayı
        </Link>

        <div className="mt-3">

          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-gray-900 dark:text-white">
            Görev Düzenle
          </h1>

          <p className="mt-1.5 text-sm text-gray-500 dark:text-slate-400">
            {task.title}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">

            <Badge
              variant={
                displayStatus.variant
              }
            >
              {displayStatus.label}
            </Badge>

            <Badge
              variant={
                getPriorityVariant(
                  task.priority
                )
              }
            >
              {PRIORITY_LABELS[
                task.priority
              ] ||
                task.priority}
            </Badge>

            {approved && (
              <Badge variant="success">
                Onaylandı
              </Badge>
            )}

          </div>

        </div>

      </div>

      {/* ==================================================
          WORKFLOW WARNINGS
      ================================================== */}

      {awaitingApproval && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.06]">

          <div className="flex items-start gap-3">

            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />

            <div>

              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Görev onay bekliyor
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-300">
                Çalışma tamamlanmak üzere gönderildi. Onay tamamlanana kadar görev bilgileri değiştirilemez.
              </p>

            </div>

          </div>

        </div>
      )}

      {approved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/[0.06]">

          <div className="flex items-start gap-3">

            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />

            <div>

              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Görev tamamlandı ve onaylandı
              </p>

              <p className="mt-1 text-sm leading-6 text-emerald-800 dark:text-emerald-300">
                Onaylanan görevlerin bilgileri normal düzenleme ekranından değiştirilemez.
              </p>

            </div>

          </div>

        </div>
      )}

      {cancelled && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/[0.06]">

          <div className="flex items-start gap-3">

            <FileLock2 className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

            <div>

              <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                Görev iptal edilmiş
              </p>

              <p className="mt-1 text-sm leading-6 text-red-800 dark:text-red-300">
                İptal edilen görevlerin içeriği bu ekrandan değiştirilemez.
              </p>

            </div>

          </div>

        </div>
      )}

      {/* ==================================================
          FORM
      ================================================== */}

      <Card className="overflow-hidden border border-gray-200 shadow-sm dark:border-white/[0.06]">

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6 p-5 md:p-6"
        >

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
            disabled={
              !canEdit
            }
            placeholder="Görev başlığı..."
          />

          {/* DESCRIPTION */}

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
              disabled={
                !canEdit
              }
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
                focus:border-blue-500
                focus:ring-2
                focus:ring-blue-500/10
                disabled:cursor-not-allowed
                disabled:bg-gray-100
                disabled:text-gray-500
                dark:border-white/[0.08]
                dark:bg-white/[0.035]
                dark:text-white
                dark:disabled:bg-white/[0.02]
              "
            />

          </div>

          {/* STATUS */}

          <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">

            <div className="flex items-center justify-between gap-4">

              <div>

                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Görev Durumu
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-slate-400">
                  Durum bu ekrandan değiştirilmez. Başlatma, tamamlama ve onay işlemleri görev iş akışı üzerinden yönetilir.
                </p>

              </div>

              <Badge
                variant={
                  displayStatus.variant
                }
              >
                {displayStatus.label}
              </Badge>

            </div>

          </div>

          {/* PRIORITY / DATE */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

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
                  !canEdit
                }
                className="
                  w-full
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  py-2.5
                  text-sm
                  text-gray-900
                  outline-none
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  disabled:cursor-not-allowed
                  disabled:bg-gray-100
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                "
              >

                <option value="low">
                  Düşük
                </option>

                <option value="normal">
                  Normal
                </option>

                <option value="high">
                  Yüksek
                </option>

                <option value="critical">
                  Kritik
                </option>

              </select>

            </div>

            <div>

              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">

                <span className="inline-flex items-center gap-1.5">

                  <CalendarDays className="h-4 w-4 text-gray-400" />

                  Son Tarih

                </span>

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
                disabled={
                  !canEdit
                }
                className="
                  w-full
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  py-2.5
                  text-sm
                  text-gray-900
                  outline-none
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  disabled:cursor-not-allowed
                  disabled:bg-gray-100
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                "
              />

            </div>

          </div>

          {/* HOURS */}

          <Input
            label="Tahmini Süre"
            type="number"
            name="estimated_hours"
            value={
              formData.estimated_hours
            }
            onChange={
              handleChange
            }
            min="0"
            step="0.25"
            disabled={
              !canEdit
            }
            error={
              errors.estimated_hours
            }
            placeholder="Örn: 2.5"
          />

          {/* ASSIGNEE */}

          <div>

            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">

              <span className="inline-flex items-center gap-1.5">

                <UserRound className="h-4 w-4 text-gray-400" />

                Atanan Kişi

              </span>

            </label>

            {canChangeAssignee ? (
              <select
                name="assigned_to"
                value={
                  formData.assigned_to
                }
                onChange={
                  handleChange
                }
                disabled={
                  assignableUsersFetching
                }
                className="
                  w-full
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  py-2.5
                  text-sm
                  text-gray-900
                  outline-none
                  focus:border-blue-500
                  focus:ring-2
                  focus:ring-blue-500/10
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                "
              >

                <option value="">
                  {assignableUsersFetching
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
                        normalizeId(
                          person.id
                        )
                      }
                    >
                      {person.first_name}{' '}
                      {person.last_name}
                    </option>
                  )
                )}

              </select>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">

                <p className="text-xs text-gray-400">
                  Atanan Kişi
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {task.assignee
                    ? `${task.assignee.first_name || ''} ${task.assignee.last_name || ''}`.trim()
                    : 'Atanmadı'}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Görev atamasını değiştirme yetkiniz bulunmuyor.
                </p>

              </div>
            )}

          </div>

          {/* RELATED */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

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
                  !canEdit ||
                  !canViewCases
                }
                className="
                  w-full
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  py-2.5
                  text-sm
                  text-gray-900
                  outline-none
                  disabled:cursor-not-allowed
                  disabled:bg-gray-100
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                "
              >

                <option value="">
                  Dava seçin
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
                          normalizeId(
                            caseItem.id
                          )
                        }
                      >
                        {caseItem.title}
                      </option>
                    )
                  )}

              </select>

              {!canViewCases && (
                <p className="mt-1.5 text-xs text-gray-400">
                  Dava kayıtlarını görüntüleme yetkiniz bulunmuyor.
                </p>
              )}

            </div>

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
                  !canEdit ||
                  !canViewClients
                }
                className="
                  w-full
                  rounded-lg
                  border
                  border-gray-200
                  bg-white
                  px-3.5
                  py-2.5
                  text-sm
                  text-gray-900
                  outline-none
                  disabled:cursor-not-allowed
                  disabled:bg-gray-100
                  dark:border-white/[0.08]
                  dark:bg-white/[0.035]
                  dark:text-white
                "
              >

                <option value="">
                  Müvekkil seçin
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
                          normalizeId(
                            client.id
                          )
                        }
                      >
                        {client.name}
                      </option>
                    )
                  )}

              </select>

              {!canViewClients && (
                <p className="mt-1.5 text-xs text-gray-400">
                  Müvekkil kayıtlarını görüntüleme yetkiniz bulunmuyor.
                </p>
              )}

            </div>

          </div>

          {/* ACTIONS */}

          <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 dark:border-white/[0.05] sm:flex-row sm:items-center sm:justify-between">

            <div className="flex flex-wrap gap-2">

              {(canEdit ||
                canChangeAssignee) && (
                <Button
                  type="submit"
                  loading={
                    updateMutation.isPending ||
                    assignMutation.isPending
                  }
                  disabled={
                    updateMutation.isPending ||
                    assignMutation.isPending ||
                    workflowLocked
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
                    `/tasks/${id}`
                  )
                }
              >
                Vazgeç
              </Button>

            </div>

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
                  deleteMutation.isPending
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />

                Görevi Sil
              </Button>
            )}

          </div>

          {workflowLocked && (
            <p className="text-xs leading-5 text-gray-400">
              Bu görevin iş akışı tamamlanmış veya kilitli durumda olduğu için normal düzenleme alanları devre dışıdır.
            </p>
          )}

        </form>

      </Card>

    </div>
  );
};

export default TaskEdit;