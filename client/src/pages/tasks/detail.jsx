import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  useTask,
  useStartTask,
  useCompleteTask,
  useApproveTask,
  useAddNote,
  useTaskNotes,
  useUpdateProgress,
} from '../../features/tasks/task.query.js';

import { useAuth } from '../../app/providers/auth.provider.jsx';

import Badge from '../../components/ui/Badge.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';

import {
  CheckCircle2,
  Clock3,
  Edit2,
  FileCheck2,
  Link2,
  MessageSquarePlus,
  Play,
  ShieldCheck,
  Timer,
  User,
} from 'lucide-react';

import toast from 'react-hot-toast';

// ======================================================
// SABİTLER
// ======================================================

const STATUS_LABELS = {
  pending: 'Bekliyor',
  in_progress: 'Devam Ediyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

const PRIORITY_LABELS = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
  critical: 'Kritik',
};

const MAX_MANUAL_PROGRESS = 99;

// ======================================================
// BADGE HELPERS
// ======================================================

const getStatusVariant = ({
  status,
  approvedAt,
}) => {
  if (
    status === 'completed' &&
    !approvedAt
  ) {
    return 'warning';
  }

  switch (status) {
    case 'pending':
      return 'warning';

    case 'in_progress':
      return 'info';

    case 'completed':
      return 'success';

    case 'cancelled':
      return 'danger';

    default:
      return 'default';
  }
};

const getStatusLabel = ({
  status,
  approvedAt,
}) => {
  if (
    status === 'completed' &&
    !approvedAt
  ) {
    return 'Onay Bekliyor';
  }

  return (
    STATUS_LABELS[status] ||
    status ||
    'Bilinmiyor'
  );
};

const getPriorityVariant = (
  priority
) => {
  switch (priority) {
    case 'critical':
      return 'danger';

    case 'high':
      return 'warning';

    case 'normal':
      return 'default';

    case 'low':
      return 'default';

    default:
      return 'default';
  }
};

// ======================================================
// TARİH / SAAT
// Türkiye saat diliminde göster
// ======================================================

const formatDateTime = (date) => {
  if (!date) {
    return '-';
  }

  try {
    const parsed = new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return '-';
    }

    return new Intl.DateTimeFormat(
      'tr-TR',
      {
        timeZone:
          'Europe/Istanbul',

        day: '2-digit',
        month: '2-digit',
        year: 'numeric',

        hour: '2-digit',
        minute: '2-digit',

        hour12: false,
      }
    ).format(parsed);
  } catch {
    return '-';
  }
};

// ======================================================
// KULLANICI ADI
// ======================================================

const getUserName = (
  person,
  fallback = '-'
) => {
  if (!person) {
    return fallback;
  }

  const name = [
    person.first_name,
    person.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return name || fallback;
};

// ======================================================
// COMPONENT
// ======================================================

const TaskDetail = () => {
  const { id } = useParams();

  const { user } = useAuth();

  // ======================================================
  // LOCAL STATE
  // ======================================================

  const [
    noteContent,
    setNoteContent,
  ] = useState('');

  const [
    completionNote,
    setCompletionNote,
  ] = useState('');

  const [
    actualHours,
    setActualHours,
  ] = useState('');

  const [
    showCompleteModal,
    setShowCompleteModal,
  ] = useState(false);

  const [
    progressValue,
    setProgressValue,
  ] = useState(0);

  // ======================================================
  // QUERIES
  // ======================================================

  const {
    data,
    isLoading,
    error,
  } = useTask(id);

  const {
    data: notesData,
  } = useTaskNotes(id);

  // ======================================================
  // MUTATIONS
  // ======================================================

  const startMutation =
    useStartTask();

  const completeMutation =
    useCompleteTask();

  const approveMutation =
    useApproveTask();

  const addNoteMutation =
    useAddNote();

  const updateProgressMutation =
    useUpdateProgress();

  // ======================================================
  // DATA
  // ======================================================

  const task =
    data?.data?.data;

  const notes =
    notesData?.data?.data || [];

  // ======================================================
  // PERMISSIONS / WORKFLOW
  // ======================================================

  const permissions = useMemo(
    () => {
      if (!task || !user) {
        return {
          isAdmin: false,
          isAssignee: false,
          isCreator: false,
          canStart: false,
          canComplete: false,
          canApprove: false,
          canUpdateProgress: false,
          canAddNote: false,
        };
      }

      const isAdmin =
        user.role === 'admin';

      const isAssignee =
        task.assigned_to === user.id;

      const isCreator =
        task.created_by === user.id;

      return {
        isAdmin,
        isAssignee,
        isCreator,

        canStart:
          isAssignee &&
          task.status === 'pending',

        canComplete:
          isAssignee &&
          task.status ===
            'in_progress',

        canApprove:
          isAdmin &&
          task.status ===
            'completed' &&
          !task.approved_at,

        canUpdateProgress:
          isAssignee &&
          task.status ===
            'in_progress',

        // Backend addNote şu anda
        // yalnızca assignee için izin veriyor.
        canAddNote: isAssignee,
      };
    },
    [task, user]
  );

  const {
    isAdmin,
    isAssignee,
    canStart,
    canComplete,
    canApprove,
    canUpdateProgress,
    canAddNote,
  } = permissions;

  // ======================================================
  // WORKFLOW STATE
  // ======================================================

  const workflow = useMemo(
    () => {
      if (!task) {
        return null;
      }

      const awaitingApproval =
        task.status ===
          'completed' &&
        !task.approved_at;

      const approved =
        Boolean(
          task.approved_at
        );

      const completed =
        task.status ===
          'completed';

      return {
        awaitingApproval,
        approved,
        completed,

        statusLabel:
          getStatusLabel({
            status:
              task.status,
            approvedAt:
              task.approved_at,
          }),

        statusVariant:
          getStatusVariant({
            status:
              task.status,
            approvedAt:
              task.approved_at,
          }),
      };
    },
    [task]
  );

  // ======================================================
  // OVERDUE
  // ======================================================

  const isOverdue =
    Boolean(task?.due_date) &&
    new Date(
      task.due_date
    ) < new Date() &&
    ![
      'completed',
      'cancelled',
    ].includes(task?.status);

  // ======================================================
  // PROGRESS SYNC
  // ======================================================

  useEffect(() => {
    if (!task) {
      return;
    }

    setProgressValue(
      Number(task.progress) || 0
    );
  }, [task]);

  // ======================================================
  // HANDLERS
  // ======================================================

  const handleProgressChange = (
    event
  ) => {
    const rawValue =
      Number.parseInt(
        event.target.value,
        10
      );

    const safeValue =
      Number.isFinite(rawValue)
        ? rawValue
        : 0;

    setProgressValue(
      Math.min(
        MAX_MANUAL_PROGRESS,
        Math.max(
          0,
          safeValue
        )
      )
    );
  };

  const handleUpdateProgress = () => {
    if (
      progressValue < 0 ||
      progressValue >
        MAX_MANUAL_PROGRESS
    ) {
      toast.error(
        `İlerleme 0-${MAX_MANUAL_PROGRESS} arasında olmalıdır`
      );

      return;
    }

    updateProgressMutation.mutate(
      {
        id,
        progress:
          progressValue,
      }
    );
  };

  const handleStart = () => {
    if (!task) {
      return;
    }

    const confirmed =
      window.confirm(
        `"${task.title}" görevini başlatmak istediğinize emin misiniz?`
      );

    if (!confirmed) {
      return;
    }

    startMutation.mutate(id);
  };

  const handleOpenCompleteModal =
    () => {
      setCompletionNote('');
      setActualHours('');
      setShowCompleteModal(
        true
      );
    };

  const handleCloseCompleteModal =
    () => {
      if (
        completeMutation.isPending
      ) {
        return;
      }

      setShowCompleteModal(
        false
      );

      setCompletionNote('');
      setActualHours('');
    };

  const handleComplete = () => {
    const cleanNote =
      completionNote.trim();

    if (!cleanNote) {
      toast.error(
        'Tamamlama notu girmelisiniz'
      );

      return;
    }

    let parsedHours;

    if (
      actualHours !== ''
    ) {
      parsedHours =
        Number.parseFloat(
          actualHours
        );

      if (
        !Number.isFinite(
          parsedHours
        ) ||
        parsedHours < 0
      ) {
        toast.error(
          'Gerçek süre geçerli bir sayı olmalıdır'
        );

        return;
      }
    }

    completeMutation.mutate(
      {
        id,
        note: cleanNote,

        actual_hours:
          actualHours !== ''
            ? parsedHours
            : undefined,
      },
      {
        onSuccess: () => {
          setShowCompleteModal(
            false
          );

          setCompletionNote(
            ''
          );

          setActualHours(
            ''
          );
        },
      }
    );
  };

  const handleApprove = () => {
    if (!task) {
      return;
    }

    const confirmed =
      window.confirm(
        `"${task.title}" görevini onaylayarak tamamen kapatmak istediğinize emin misiniz?`
      );

    if (!confirmed) {
      return;
    }

    approveMutation.mutate(id);
  };

  const handleAddNote = () => {
    const content =
      noteContent.trim();

    if (!content) {
      toast.error(
        'Not içeriği boş olamaz'
      );

      return;
    }

    addNoteMutation.mutate(
      {
        id,
        content,
      },
      {
        onSuccess: () => {
          setNoteContent('');
        },
      }
    );
  };

  // ======================================================
  // LOADING
  // ======================================================

  if (isLoading) {
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
    error ||
    !task
  ) {
    return (
      <div className="py-12 text-center">
        <p className="font-medium text-red-600">
          Görev bulunamadı
        </p>

        <Link
          to="/tasks"
          className="mt-3 inline-block text-blue-600 hover:underline"
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
    <div className="space-y-6">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div>
          <Link
            to="/tasks"
            className="text-blue-600 hover:underline"
          >
            ← Görevler
          </Link>

          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {task.title}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-2">

            <Badge
              variant={
                workflow.statusVariant
              }
            >
              {
                workflow.statusLabel
              }
            </Badge>

            <Badge
              variant={getPriorityVariant(
                task.priority
              )}
            >
              {PRIORITY_LABELS[
                task.priority
              ] ||
                task.priority}
            </Badge>

            {isOverdue && (
              <Badge variant="danger">
                ⚠️ Gecikti
              </Badge>
            )}

            {workflow.approved && (
              <Badge variant="success">
                ✅ Onaylandı
              </Badge>
            )}

          </div>
        </div>

        {/* ACTION BUTTONS */}

        <div className="flex flex-wrap items-center gap-2">

          {canStart && (
            <Button
              variant="primary"
              size="sm"
              onClick={
                handleStart
              }
              loading={
                startMutation.isPending
              }
              disabled={
                startMutation.isPending
              }
              className="flex items-center gap-1"
            >
              <Play className="h-4 w-4" />

              Görevi Başlat
            </Button>
          )}

          {canComplete && (
            <Button
              variant="success"
              size="sm"
              onClick={
                handleOpenCompleteModal
              }
              loading={
                completeMutation.isPending
              }
              className="flex items-center gap-1"
            >
              <CheckCircle2 className="h-4 w-4" />

              Tamamlanmak Üzere Gönder
            </Button>
          )}

          {canApprove && (
            <Button
              variant="primary"
              size="sm"
              onClick={
                handleApprove
              }
              loading={
                approveMutation.isPending
              }
              disabled={
                approveMutation.isPending
              }
              className="flex items-center gap-1"
            >
              <ShieldCheck className="h-4 w-4" />

              Görevi Onayla
            </Button>
          )}

          <Link
            to={`/tasks/${task.id}/edit`}
          >
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <Edit2 className="h-4 w-4" />

              Düzenle
            </Button>
          </Link>

        </div>
      </div>

      {/* ==================================================
          ONAY BEKLEME UYARISI
      ================================================== */}

      {workflow.awaitingApproval && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">

          <div className="flex items-start gap-3">

            <Clock3 className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />

            <div>
              <p className="font-medium text-amber-900 dark:text-amber-200">
                Görev tamamlandı ve yönetici onayı bekliyor
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-300">
                Görevi yapan kullanıcı çalışmayı tamamladı.
                Yönetici inceleyip onayladıktan sonra görev
                nihai olarak kapanacaktır.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================
          ONAYLANMIŞ
      ================================================== */}

      {workflow.approved && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">

          <div className="flex items-start gap-3">

            <FileCheck2 className="mt-0.5 h-5 w-5 text-green-600 dark:text-green-400" />

            <div>
              <p className="font-medium text-green-900 dark:text-green-200">
                Görev başarıyla onaylandı
              </p>

              <p className="mt-1 text-sm text-green-800 dark:text-green-300">
                {task.approver
                  ? `${getUserName(
                      task.approver
                    )} tarafından`
                  : 'Yönetici tarafından'}

                {task.approved_at
                  ? ` ${formatDateTime(
                      task.approved_at
                    )} tarihinde onaylandı.`
                  : ' onaylandı.'}
              </p>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================
          BODY GRID
      ================================================== */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ==================================================
            BİLGİLER
        ================================================== */}

        <Card className="lg:col-span-2">

          <Card.Header>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              📋 Görev Bilgileri
            </h2>
          </Card.Header>

          <Card.Body className="space-y-5">

            {task.description && (
              <div>
                <p className="text-sm text-gray-500">
                  Açıklama
                </p>

                <p className="mt-1 whitespace-pre-wrap leading-7 text-gray-900 dark:text-white">
                  {task.description}
                </p>
              </div>
            )}

            {/* PEOPLE */}

            <div className="grid gap-4 sm:grid-cols-2">

              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">

                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <User className="h-4 w-4" />
                  Atanan Kişi
                </div>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {getUserName(
                    task.assignee,
                    'Atanmadı'
                  )}
                </p>

              </div>

              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">

                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <User className="h-4 w-4" />
                  Oluşturan
                </div>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {getUserName(
                    task.creator,
                    'Bilinmiyor'
                  )}
                </p>

              </div>

            </div>

            {/* DATE / ESTIMATE */}

            <div className="grid gap-4 sm:grid-cols-2">

              <div>
                <p className="text-sm text-gray-500">
                  📅 Son Tarih
                </p>

                <p
                  className={`mt-1 font-medium ${
                    isOverdue
                      ? 'text-red-600'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {task.due_date
                    ? formatDateTime(
                        task.due_date
                      )
                    : 'Belirtilmemiş'}

                  {isOverdue &&
                    ' · Gecikti'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  ⏱️ Tahmini Süre
                </p>

                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {task.estimated_hours !=
                  null
                    ? `${task.estimated_hours} saat`
                    : 'Belirtilmemiş'}
                </p>
              </div>

            </div>

            {/* ==================================================
                TIME TRACKING
            ================================================== */}

            {(task.started_at ||
              task.completed_at ||
              task.actual_hours != null) && (
              <div className="border-t border-gray-200 pt-4 dark:border-gray-700">

                <div className="mb-3 flex items-center gap-2">

                  <Timer className="h-4 w-4 text-blue-600" />

                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    Süre Takibi
                  </p>

                </div>

                <div className="grid gap-4 sm:grid-cols-3">

                  <div>
                    <p className="text-sm text-gray-500">
                      Başlangıç
                    </p>

                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                      {task.started_at
                        ? formatDateTime(
                            task.started_at
                          )
                        : '-'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">
                      Bitiş
                    </p>

                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                      {task.completed_at
                        ? formatDateTime(
                            task.completed_at
                          )
                        : '-'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">
                      Gerçek Süre
                    </p>

                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                      {task.actual_hours !=
                      null
                        ? `${task.actual_hours} saat`
                        : 'Otomatik hesaplanacak'}
                    </p>
                  </div>

                </div>
              </div>
            )}

            {/* ==================================================
                PROGRESS
            ================================================== */}

            <div className="border-t border-gray-200 pt-4 dark:border-gray-700">

              <div className="flex items-center justify-between">

                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  📊 İlerleme
                </p>

                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {task.progress || 0}%
                </span>

              </div>

              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">

                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        task.progress || 0
                      )
                    )}%`,
                  }}
                />

              </div>

              {canUpdateProgress && (
                <div className="mt-4 space-y-2">

                  <div className="flex items-center gap-3">

                    <input
                      type="range"
                      min="0"
                      max={
                        MAX_MANUAL_PROGRESS
                      }
                      value={
                        progressValue
                      }
                      onChange={
                        handleProgressChange
                      }
                      className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600 dark:bg-gray-700"
                    />

                    <input
                      type="number"
                      min="0"
                      max={
                        MAX_MANUAL_PROGRESS
                      }
                      value={
                        progressValue
                      }
                      onChange={
                        handleProgressChange
                      }
                      className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />

                    <Button
                      size="sm"
                      onClick={
                        handleUpdateProgress
                      }
                      loading={
                        updateProgressMutation.isPending
                      }
                      disabled={
                        updateProgressMutation.isPending
                      }
                    >
                      Güncelle
                    </Button>

                  </div>

                  <p className="text-xs text-gray-500">
                    %100 ilerleme, görev tamamlanmak üzere
                    gönderildiğinde otomatik olarak atanır.
                  </p>

                </div>
              )}

            </div>

            {/* ==================================================
                RELATED
            ================================================== */}

            {(task.case ||
              task.client) && (
              <div className="border-t border-gray-200 pt-4 dark:border-gray-700">

                <div className="mb-2 flex items-center gap-2">

                  <Link2 className="h-4 w-4 text-blue-600" />

                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    İlişkili Kayıtlar
                  </p>

                </div>

                <div className="space-y-2">

                  {task.case && (
                    <div>
                      <span className="text-sm text-gray-500">
                        Dava:{' '}
                      </span>

                      <Link
                        to={`/cases/${task.case.id}`}
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        {
                          task.case
                            .title
                        }
                      </Link>
                    </div>
                  )}

                  {task.client && (
                    <div>
                      <span className="text-sm text-gray-500">
                        Müvekkil:{' '}
                      </span>

                      <Link
                        to={`/clients/${task.client.id}`}
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        {
                          task.client
                            .name
                        }
                      </Link>
                    </div>
                  )}

                </div>
              </div>
            )}

          </Card.Body>
        </Card>

        {/* ==================================================
            NOTES
        ================================================== */}

        <Card>

          <Card.Header>
            <div className="flex items-center gap-2">

              <MessageSquarePlus className="h-4 w-4 text-blue-600" />

              <h2 className="font-semibold text-gray-900 dark:text-white">
                Görev Notları
              </h2>

            </div>
          </Card.Header>

          <Card.Body className="space-y-4">

            {canAddNote && (
              <div className="space-y-2">

                <textarea
                  value={
                    noteContent
                  }
                  onChange={(event) =>
                    setNoteContent(
                      event.target
                        .value
                    )
                  }
                  placeholder="Görevle ilgili bir çalışma notu ekleyin..."
                  rows="3"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />

                <Button
                  size="sm"
                  onClick={
                    handleAddNote
                  }
                  loading={
                    addNoteMutation.isPending
                  }
                  disabled={
                    addNoteMutation.isPending
                  }
                  className="flex items-center gap-1"
                >
                  <MessageSquarePlus className="h-4 w-4" />

                  Not Ekle
                </Button>

              </div>
            )}

            <div className="max-h-[32rem] space-y-3 overflow-y-auto">

              {notes.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  Henüz görev notu bulunmuyor.
                </div>
              ) : (
                notes.map(
                  (note) => (
                    <div
                      key={
                        note.id
                      }
                      className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
                    >

                      <p className="whitespace-pre-wrap text-sm leading-6 text-gray-900 dark:text-white">
                        {
                          note.content
                        }
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">

                        <span className="font-medium">
                          {getUserName(
                            note.creator,
                            'Sistem'
                          )}
                        </span>

                        <span>
                          •
                        </span>

                        <span>
                          {formatDateTime(
                            note.created_at
                          )}
                        </span>

                      </div>
                    </div>
                  )
                )
              )}

            </div>

          </Card.Body>
        </Card>

      </div>

      {/* ==================================================
          COMPLETION MODAL
      ================================================== */}

      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">

            <div className="mb-5">

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Görevi Tamamlanmak Üzere Gönder
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                Çalışmayı tamamladığınızda görev yönetici
                onayına gönderilecektir. Yönetici onaylayana
                kadar görev nihai olarak kapanmış sayılmaz.
              </p>

            </div>

            <div className="space-y-4">

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tamamlama Notu *
                </label>

                <textarea
                  value={
                    completionNote
                  }
                  onChange={(event) =>
                    setCompletionNote(
                      event.target
                        .value
                    )
                  }
                  placeholder="Hangi işlemler yapıldı? Sonuç nedir? Kontrol edilmesi gereken bir husus var mı?"
                  rows="5"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Gerçek Süre (Saat)
                </label>

                <input
                  type="number"
                  value={
                    actualHours
                  }
                  onChange={(event) =>
                    setActualHours(
                      event.target
                        .value
                    )
                  }
                  placeholder="Boş bırakırsanız sistem otomatik hesaplar"
                  min="0"
                  step="0.25"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />

                <p className="mt-1 text-xs text-gray-500">
                  Manuel süre girebilir veya boş bırakarak başlangıç
                  ve bitiş saatlerinden otomatik hesaplatabilirsiniz.
                </p>
              </div>

            </div>

            <div className="mt-6 flex gap-3">

              <Button
                variant="success"
                onClick={
                  handleComplete
                }
                loading={
                  completeMutation.isPending
                }
                disabled={
                  completeMutation.isPending
                }
                className="flex-1"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />

                Yönetici Onayına Gönder
              </Button>

              <Button
                variant="secondary"
                onClick={
                  handleCloseCompleteModal
                }
                disabled={
                  completeMutation.isPending
                }
                className="flex-1"
              >
                Vazgeç
              </Button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default TaskDetail;