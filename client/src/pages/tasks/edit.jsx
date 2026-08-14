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
} from '../../features/tasks/task.query.js';

import { useUsers } from '../../features/users/user.query.js';
import { useCases } from '../../features/cases/case.query.js';
import { useClients } from '../../features/clients/client.query.js';
import { useAuth } from '../../app/providers/auth.provider.jsx';

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
// SABİTLER
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

const STATUS_LABELS = {
  pending: 'Bekliyor',
  in_progress: 'Devam Ediyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

// ======================================================
// TARİH HELPERS
// Europe/Istanbul değerini datetime-local formatına çevirir
// ======================================================

const formatForDateTimeLocal = (date) => {
  if (!date) {
    return '';
  }

  try {
    const parsed = new Date(date);

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

    for (const part of parts) {
      if (
        part.type !==
        'literal'
      ) {
        map[part.type] =
          part.value;
      }
    }

    return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
  } catch {
    return '';
  }
};

// ======================================================
// STATUS HELPERS
// ======================================================

const getDisplayStatus = (task) => {
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

  if (task?.approved_at) {
    return {
      label:
        'Tamamlandı',
      variant:
        'success',
    };
  }

  switch (task?.status) {
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

// ======================================================
// COMPONENT
// ======================================================

const TaskEdit = () => {
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
    errors,
    setErrors,
  ] = useState({});

  // ======================================================
  // QUERIES
  // ======================================================

  const {
    data,
    isLoading:
      taskLoading,
    error:
      taskError,
  } = useTask(id);

  const {
    data: usersData,
  } = useUsers();

  const {
    data: casesData,
  } = useCases({
    limit: 100,
  });

  const {
    data: clientsData,
  } = useClients({
    limit: 100,
  });

  // ======================================================
  // MUTATIONS
  // ======================================================

  const updateMutation =
    useUpdateTask();

  const deleteMutation =
    useDeleteTask();

  // ======================================================
  // DATA
  // ======================================================

  const task =
    data?.data?.data;

  const users =
    usersData?.data?.data ||
    [];

  const cases =
    casesData?.data?.data ||
    [];

  const clients =
    clientsData?.data?.data ||
    [];

  // ======================================================
  // PERMISSIONS
  // ======================================================

  const permissions =
    useMemo(() => {
      const role =
        user?.role;

      const isAdmin =
        role === 'admin';

      const isLawyer =
        role === 'lawyer';

      const isSecretary =
        role ===
        'secretary';

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

      // Onay sürecine giren görev artık normal edit
      // ekranından değiştirilemez.
      const workflowLocked =
        awaitingApproval ||
        approved ||
        cancelled;

      return {
        isAdmin,
        isLawyer,
        isSecretary,

        awaitingApproval,
        approved,
        cancelled,
        workflowLocked,

        canEdit:
          (isAdmin ||
            isLawyer ||
            isSecretary) &&
          !workflowLocked,

        // Atama değişikliği yalnız admin tarafından yapılır.
        canChangeAssignee:
          isAdmin &&
          !workflowLocked,

        // Backend route admin + lawyer'a izin veriyor.
        canDelete:
          (isAdmin ||
            isLawyer) &&
          !approved,

        // Admin olmayan kullanıcı görev durumunu
        // veya atanan kişiyi bu ekrandan değiştiremez.
      };
    }, [
      user,
      task,
    ]);

  const {
    isAdmin,
    awaitingApproval,
    approved,
    cancelled,
    workflowLocked,
    canEdit,
    canChangeAssignee,
    canDelete,
  } = permissions;

  // ======================================================
  // STATUS
  // ======================================================

  const displayStatus =
    useMemo(
      () =>
        getDisplayStatus(
          task
        ),
      [task]
    );

  // ======================================================
  // FORM INITIALIZATION
  // ======================================================

  useEffect(() => {
    if (!task) {
      return;
    }

    setFormData({
      title:
        task.title || '',

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

      // Burada artık admin değilse kendine atama YOK.
      // Mevcut görev sahibi korunuyor.
      assigned_to:
        task.assigned_to ||
        '',

      case_id:
        task.case_id || '',

      client_id:
        task.client_id ||
        '',

      estimated_hours:
        task.estimated_hours ??
        '',
    });
  }, [task]);

  // ======================================================
  // ASSIGNABLE USERS
  // ======================================================

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
  // FORM HANDLERS
  // ======================================================

  const handleChange = (
    event
  ) => {
    if (!canEdit) {
      return;
    }

    const {
      name,
      value,
    } = event.target;

    setFormData(
      (current) => ({
        ...current,
        [name]: value,
      })
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

  // ======================================================
  // VALIDATION
  // ======================================================

  const validateForm = () => {
    const nextErrors =
      {};

    if (
      !formData.title.trim()
    ) {
      nextErrors.title =
        'Görev adı gereklidir';
    }

    if (
      formData.estimated_hours !==
        '' &&
      (
        !Number.isFinite(
          Number(
            formData.estimated_hours
          )
        ) ||
        Number(
          formData.estimated_hours
        ) < 0
      )
    ) {
      nextErrors.estimated_hours =
        'Tahmini süre 0 veya daha büyük olmalıdır';
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
        'Bu görev mevcut iş akışı durumunda düzenlenemez.'
      );

      return;
    }

    if (!validateForm()) {
      return;
    }

    const submitData = {
      title:
        formData.title.trim(),

      description:
        formData.description
          .trim() ||
        null,

      priority:
        formData.priority,

      due_date:
        formData.due_date ||
        null,

      case_id:
        formData.case_id ||
        null,

      client_id:
        formData.client_id ||
        null,

      estimated_hours:
        formData.estimated_hours !==
        ''
          ? Number.parseFloat(
              formData.estimated_hours
            )
          : null,
    };

    // Atama sadece admin tarafından değiştirilebilir.
    if (
      canChangeAssignee
    ) {
      submitData.assigned_to =
        formData.assigned_to ||
        null;
    }

    /*
     * Özellikle status göndermiyoruz.
     *
     * Durum yalnızca:
     * - Başlat
     * - Tamamlanmak üzere gönder
     * - Admin onayı
     *
     * gibi workflow endpointleri üzerinden değişmeli.
     */
    updateMutation.mutate(
      {
        id,
        data:
          submitData,
      },
      {
        onSuccess: () => {
          toast.success(
            'Görev bilgileri güncellendi'
          );

          navigate(
            `/tasks/${id}`
          );
        },
      }
    );
  };

  // ======================================================
  // DELETE
  // ======================================================

  const handleDelete = () => {
    if (!canDelete) {
      toast.error(
        'Bu görevi silme yetkiniz bulunmuyor.'
      );

      return;
    }

    const confirmed =
      window.confirm(
        `"${task?.title}" görevini silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`
      );

    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(
      id,
      {
        onSuccess: () => {
          toast.success(
            'Görev silindi'
          );

          navigate(
            '/tasks'
          );
        },
      }
    );
  };

  // ======================================================
  // LOADING
  // ======================================================

  if (taskLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600" />
      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (
    taskError ||
    !task
  ) {
    return (
      <div className="py-12 text-center">

        <div className="mb-4 text-6xl">
          📋
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Görev Bulunamadı
        </h2>

        <Link
          to="/tasks"
          className="mt-4 inline-block text-blue-600 hover:underline"
        >
          ← Görevlere Dön
        </Link>

      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-3xl space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div>

          <Link
            to={`/tasks/${id}`}
            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />

            Görev Detayı
          </Link>

          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            ✏️ Görev Düzenle
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-2">

            <Badge
              variant={
                displayStatus.variant
              }
            >
              {
                displayStatus.label
              }
            </Badge>

            <Badge
              variant={
                task.priority ===
                'critical'
                  ? 'danger'
                  : task.priority ===
                      'high'
                    ? 'warning'
                    : 'default'
              }
            >
              {PRIORITY_LABELS[
                task.priority
              ] ||
                task.priority}
            </Badge>

            {approved && (
              <Badge variant="success">
                ✅ Onaylandı
              </Badge>
            )}

          </div>

          <p className="mt-2 text-sm text-gray-500">
            {task.title}
          </p>

        </div>

      </div>

      {/* ==================================================
          WORKFLOW LOCK WARNINGS
      ================================================== */}

      {awaitingApproval && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">

          <div className="flex items-start gap-3">

            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

            <div>
              <p className="font-medium text-amber-900 dark:text-amber-200">
                Görev yönetici onayı bekliyor
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-300">
                Görevi yapan kullanıcı çalışmayı tamamlanmak
                üzere gönderdi. İnceleme tamamlanana kadar görev
                bilgileri bu ekrandan değiştirilemez.
              </p>
            </div>

          </div>
        </div>
      )}

      {approved && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">

          <div className="flex items-start gap-3">

            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />

            <div>
              <p className="font-medium text-green-900 dark:text-green-200">
                Görev tamamlandı ve onaylandı
              </p>

              <p className="mt-1 text-sm leading-6 text-green-800 dark:text-green-300">
                Onaylanmış görevler normal düzenleme ekranından
                değiştirilemez. İleride gerekirse ayrı bir
                “Görevi Yeniden Aç” işlemi eklenebilir.
              </p>
            </div>

          </div>
        </div>
      )}

      {cancelled && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">

          <div className="flex items-start gap-3">

            <FileLock2 className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

            <div>
              <p className="font-medium text-red-900 dark:text-red-200">
                Görev iptal edilmiş
              </p>

              <p className="mt-1 text-sm text-red-800 dark:text-red-300">
                İptal edilen görevlerin içeriği bu ekrandan
                değiştirilemez.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================
          FORM
      ================================================== */}

      <Card>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6 p-6"
        >

          {/* TITLE */}

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
              rows="5"
              disabled={
                !canEdit
              }
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
              placeholder="Görev açıklaması..."
            />

          </div>

          {/* ==================================================
              STATUS READ ONLY
          ================================================== */}

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">

            <div className="flex items-center justify-between gap-3">

              <div>

                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Görev Durumu
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Durum, görev iş akışı üzerinden yönetilir.
                </p>

              </div>

              <Badge
                variant={
                  displayStatus.variant
                }
              >
                {
                  displayStatus.label
                }
              </Badge>

            </div>

          </div>

          {/* ==================================================
              PRIORITY / DUE DATE
          ================================================== */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <div>

              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
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

              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
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
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
              />

            </div>

          </div>

          {/* ==================================================
              ESTIMATED HOURS
          ================================================== */}

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              ⏱️ Tahmini Süre (Saat)
            </label>

            <input
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
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
              placeholder="Örn: 2.5"
            />

            {errors.estimated_hours && (
              <p className="mt-1 text-sm text-red-600">
                {
                  errors.estimated_hours
                }
              </p>
            )}

          </div>

          {/* ==================================================
              ASSIGNEE
          ================================================== */}

          <div>

            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">

              <span className="inline-flex items-center gap-1">
                <UserRound className="h-4 w-4" />
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
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
              <div className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">

                {task.assignee
                  ? `${task.assignee.first_name || ''} ${task.assignee.last_name || ''}`.trim()
                  : 'Atanmadı'}

                {!isAdmin && (
                  <span className="ml-2 text-xs text-gray-500">
                    Atamayı yalnızca yönetici değiştirebilir.
                  </span>
                )}

              </div>
            )}

          </div>

          {/* ==================================================
              RELATED
          ================================================== */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            {/* CASE */}

            <div>

              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                📁 İlişkili Dava
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
                  !canEdit
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
              >
                <option value="">
                  Dava seçin
                  (isteğe bağlı)
                </option>

                {cases.map(
                  (caseItem) => (
                    <option
                      key={
                        caseItem.id
                      }
                      value={
                        caseItem.id
                      }
                    >
                      {
                        caseItem.title
                      }
                    </option>
                  )
                )}
              </select>

            </div>

            {/* CLIENT */}

            <div>

              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                👤 İlişkili Müvekkil
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
                  !canEdit
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
              >
                <option value="">
                  Müvekkil seçin
                  (isteğe bağlı)
                </option>

                {clients.map(
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

            </div>

          </div>

          {/* ==================================================
              ACTIONS
          ================================================== */}

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">

            {canEdit && (
              <Button
                type="submit"
                loading={
                  updateMutation.isPending
                }
                disabled={
                  updateMutation.isPending
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
              Görev Detayına Dön
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
                  deleteMutation.isPending
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />

                Görevi Sil
              </Button>
            )}

          </div>

          {workflowLocked && (
            <p className="text-xs text-gray-500">
              Bu görevin iş akışı tamamlanmış veya kilitli durumda
              olduğu için normal düzenleme alanları devre dışıdır.
            </p>
          )}

        </form>

      </Card>

    </div>
  );
};

export default TaskEdit;