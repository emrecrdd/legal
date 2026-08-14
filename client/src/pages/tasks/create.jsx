import {
  useState,
  useEffect,
  useMemo,
} from 'react';

import {
  useNavigate,
  Link,
  useSearchParams,
} from 'react-router-dom';

import { useUsers } from '../../features/users/user.query.js';
import { useCases } from '../../features/cases/case.query.js';
import { useClients } from '../../features/clients/client.query.js';
import { useCreateTask } from '../../features/tasks/task.query.js';
import { useAuth } from '../../app/providers/auth.provider.jsx';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';

// ======================================================
// SABİTLER
// ======================================================

const INITIAL_FORM = {
  title: '',
  description: '',
  status: 'pending',
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

// ======================================================
// COMPONENT
// ======================================================

const TaskCreate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { user } = useAuth();

  const [formData, setFormData] =
    useState(INITIAL_FORM);

  const [errors, setErrors] =
    useState({});

  // ======================================================
  // QUERY PARAMETRELERİ
  // AI veya başka bir ekrandan form prefill edilebilir
  // ======================================================

  const prefillData = useMemo(() => {
    const priority =
      searchParams.get('priority');

    return {
      title:
        searchParams.get('title') || '',

      description:
        searchParams.get('description') || '',

      priority:
        priority &&
        VALID_PRIORITIES.has(priority)
          ? priority
          : 'normal',

      due_date:
        searchParams.get('due_date') || '',

      estimated_hours:
        searchParams.get(
          'estimated_hours'
        ) || '',

      case_id:
        searchParams.get('case_id') || '',

      client_id:
        searchParams.get('client_id') || '',

      note:
        searchParams.get('note') || '',

      source:
        searchParams.get('source') || '',
    };
  }, [searchParams]);

  const isAiPrefill =
    prefillData.source === 'ai';

  // ======================================================
  // HOOK'LAR
  // ======================================================

  const { data: usersData } =
    useUsers();

  const { data: casesData } =
    useCases({
      limit: 100,
    });

  const { data: clientsData } =
    useClients({
      limit: 100,
    });

  const createMutation =
    useCreateTask();

  const users =
    usersData?.data?.data || [];

  const cases =
    casesData?.data?.data || [];

  const clients =
    clientsData?.data?.data || [];

  // ======================================================
  // AI / QUERY PARAM PREFILL
  // ======================================================

  useEffect(() => {
    const hasPrefill =
      Boolean(prefillData.title) ||
      Boolean(prefillData.description) ||
      Boolean(prefillData.case_id) ||
      Boolean(prefillData.client_id) ||
      Boolean(prefillData.due_date) ||
      Boolean(
        prefillData.estimated_hours
      ) ||
      Boolean(prefillData.note) ||
      isAiPrefill;

    if (!hasPrefill) {
      return;
    }

    setFormData((prev) => ({
      ...prev,

      title:
        prefillData.title ||
        prev.title,

      description:
        prefillData.description ||
        prev.description,

      priority:
        prefillData.priority ||
        prev.priority,

      due_date:
        prefillData.due_date ||
        prev.due_date,

      estimated_hours:
        prefillData.estimated_hours ||
        prev.estimated_hours,

      case_id:
        prefillData.case_id ||
        prev.case_id,

      client_id:
        prefillData.client_id ||
        prev.client_id,

      note:
        prefillData.note ||
        prev.note,
    }));
  }, [
    prefillData,
    isAiPrefill,
  ]);

  // ======================================================
  // ADMIN DEĞİLSE KENDİNE ATA
  // ======================================================

  useEffect(() => {
    if (
      user?.role !== 'admin' &&
      user?.id
    ) {
      setFormData((prev) => ({
        ...prev,
        assigned_to: user.id,
      }));
    }
  }, [user]);

  // ======================================================
  // ATANABİLİR KULLANICILAR
  // ======================================================

  const assignableUsers =
    useMemo(() => {
      if (user?.role === 'admin') {
        return users;
      }

      return users.filter(
        (u) =>
          u.id === user?.id
      );
    }, [users, user]);

  // ======================================================
  // HANDLERS
  // ======================================================

  const handleChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      !formData.title.trim()
    ) {
      setErrors({
        title:
          'Görev adı gereklidir',
      });

      return;
    }

    const assignedTo =
      user?.role !== 'admin'
        ? user?.id
        : formData.assigned_to;

    const submitData = {
      ...formData,

      title:
        formData.title.trim(),

      description:
        formData.description?.trim() ||
        null,

      note:
        formData.note?.trim() ||
        '',

      assigned_to:
        assignedTo || null,

      case_id:
        formData.case_id || null,

      client_id:
        formData.client_id || null,

      due_date:
        formData.due_date || null,

      estimated_hours:
        formData.estimated_hours
          ? parseFloat(
              formData.estimated_hours
            )
          : null,
    };

    createMutation.mutate(
      submitData,
      {
        onSuccess: () => {
          navigate('/tasks');
        },
      }
    );
  };

  const handleCancel = () => {
    if (formData.case_id) {
      navigate(
        `/cases/${formData.case_id}`
      );

      return;
    }

    navigate('/tasks');
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/tasks"
            className="text-blue-600 hover:underline"
          >
            ← Görevler
          </Link>

          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            ✅ Yeni Görev
          </h1>

          {isAiPrefill && (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
              ✨ Bu görev AI dava
              analizindeki bir öneriden
              oluşturuluyor. Bilgileri
              kontrol edip atanan kişiyi
              ve son tarihi belirleyin.
            </div>
          )}
        </div>
      </div>

      <Card>
        <form
          onSubmit={handleSubmit}
          className="space-y-6 p-6"
        >
          <Input
            label="Görev Adı *"
            name="title"
            value={formData.title}
            onChange={
              handleChange
            }
            error={errors.title}
            placeholder="Görev başlığı..."
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
              rows="4"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Görev açıklaması..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              📝 Başlangıç Notu
            </label>

            <textarea
              name="note"
              value={formData.note}
              onChange={
                handleChange
              }
              rows="2"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Görevle ilgili başlangıç notu..."
            />

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Bu not göreve eklenecek
              ve herkes görebilecek
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="pending">
                  Bekliyor
                </option>

                <option value="in_progress">
                  Devam Ediyor
                </option>

                <option value="completed">
                  Tamamlandı
                </option>

                <option value="cancelled">
                  İptal
                </option>
              </select>
            </div>

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
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              ⏱️ Tahmini Süre
              (Saat)
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
              step="0.5"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Örn: 2.5"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              👤 Atanan Kişi
            </label>

            {user?.role ===
            'admin' ? (
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
                      key={person.id}
                      value={person.id}
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
              <div className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                {user?.first_name}{' '}
                {user?.last_name}{' '}
                (Kendin)
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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

              {isAiPrefill &&
                formData.case_id && (
                  <p className="mt-1 text-xs text-blue-600 dark:text-blue-300">
                    AI önerisinin ait
                    olduğu dava otomatik
                    seçildi.
                  </p>
                )}
            </div>

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
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
                      {client.name}

                      {client.company_name &&
                        ` (${client.company_name})`}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="flex gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
            <Button
              type="submit"
              loading={
                createMutation.isPending
              }
            >
              ✅ Görev Oluştur
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={
                handleCancel
              }
            >
              İptal
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default TaskCreate;