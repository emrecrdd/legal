import {
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import {
  ArrowLeft,
  MailPlus,
  ShieldCheck,
} from 'lucide-react';

import userApi from '../../features/users/user.api.js';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import toast from 'react-hot-toast';

const INITIAL_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'lawyer',
};

const ROLE_OPTIONS = [
  { value: 'lawyer', label: 'Avukat' },
  { value: 'secretary', label: 'Sekreter' },
  { value: 'intern', label: 'Stajyer' },
  { value: 'admin', label: 'Yönetici' },
];

const normalizeForm = (
  value = {}
) => ({
  first_name:
    String(value.first_name ?? '').trim(),
  last_name:
    String(value.last_name ?? '').trim(),
  email:
    String(value.email ?? '')
      .trim()
      .toLowerCase(),
  phone:
    String(value.phone ?? '').trim(),
  role:
    String(value.role ?? 'lawyer'),
});

const UserCreate = () => {
  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

  const formRef =
    useRef(null);

  const [formData, setFormData] =
    useState(INITIAL_FORM);

  const [errors, setErrors] =
    useState({});

  const normalizedForm =
    useMemo(
      () => normalizeForm(formData),
      [formData]
    );

  const isDirty =
    useMemo(
      () =>
        JSON.stringify(normalizedForm) !==
        JSON.stringify(
          normalizeForm(INITIAL_FORM)
        ),
      [normalizedForm]
    );

  const focusField = (
    name
  ) => {
    window.requestAnimationFrame(
      () => {
        formRef.current
          ?.querySelector(
            `[name="${name}"]`
          )
          ?.focus?.();
      }
    );
  };

  const mutation =
    useMutation({
      mutationFn: (data) =>
        userApi.create(data),

      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: ['users'],
        });

        toast.success(
          'Kullanıcı daveti e-posta ile gönderildi.'
        );

        navigate('/users');
      },

      onError: (error) => {
        const status =
          error?.response?.status;

        const message =
          error?.response?.data?.message;

        if (status === 409) {
          setErrors({
            email:
              'Bu e-posta adresi zaten kullanımda.',
          });
          focusField('email');
          return;
        }

        toast.error(
          message ||
            'Kullanıcı daveti gönderilemedi.'
        );
      },
    });

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((current) => ({
        ...current,
        [name]: '',
      }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.first_name.trim()) {
      nextErrors.first_name =
        'Ad gereklidir';
    }

    if (!formData.last_name.trim()) {
      nextErrors.last_name =
        'Soyad gereklidir';
    }

    const email =
      formData.email
        .trim()
        .toLowerCase();

    if (!email) {
      nextErrors.email =
        'E-posta gereklidir';
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      nextErrors.email =
        'Geçerli bir e-posta girin';
    }

    if (
      !ROLE_OPTIONS.some(
        (item) =>
          item.value ===
          formData.role
      )
    ) {
      nextErrors.role =
        'Geçerli bir rol seçin';
    }

    setErrors(nextErrors);

    const first =
      Object.keys(nextErrors)[0];

    if (first) {
      focusField(first);
      return false;
    }

    return true;
  };

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    if (
      mutation.isPending ||
      !validate()
    ) {
      return;
    }

    mutation.mutate({
      first_name:
        formData.first_name.trim(),
      last_name:
        formData.last_name.trim(),
      email:
        formData.email
          .trim()
          .toLowerCase(),
      phone:
        formData.phone.trim() || null,
      role:
        formData.role,
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          to="/users"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Kullanıcılar
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-white">
              <MailPlus className="h-6 w-6" />
              Yeni Kullanıcı Daveti
            </h1>

            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Büro sistemine yeni kullanıcı davet edin ve rolünü belirleyin.
            </p>
          </div>

          {isDirty && (
            <Badge
              variant="warning"
              dot
            >
              Kaydedilmemiş değişiklik
            </Badge>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/15 dark:bg-blue-500/[0.05]">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />

          <div>
            <p className="font-medium text-blue-900 dark:text-blue-200">
              Güvenli kullanıcı daveti
            </p>

            <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
              Kullanıcıya 24 saat geçerli, tek kullanımlık bir davet bağlantısı gönderilir. İlk şifresini kullanıcı kendisi belirler.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          noValidate
          className="space-y-6 p-6"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Ad *"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              error={errors.first_name}
              disabled={mutation.isPending}
              placeholder="Ad"
            />

            <Input
              label="Soyad *"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              error={errors.last_name}
              disabled={mutation.isPending}
              placeholder="Soyad"
            />
          </div>

          <Input
            label="E-posta *"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            disabled={mutation.isPending}
            placeholder="kullanici@hukuk.com"
          />

          <Input
            label="Telefon"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            error={errors.phone}
            disabled={mutation.isPending}
            placeholder="05xx xxx xx xx"
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Rol *
            </label>

            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              disabled={mutation.isPending}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-white"
            >
              {ROLE_OPTIONS.map(
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

            {errors.role && (
              <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                {errors.role}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-white/[0.07] dark:bg-white/[0.02]">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Şifreyi yönetici belirlemez
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-slate-400">
              Davet kabul edilene kadar hesap pasif kalır. Kullanıcı bağlantıyı açıp kendi şifresini belirlediğinde hesap etkinleşir.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-5 dark:border-white/[0.06]">
            <Button
              type="submit"
              loading={mutation.isPending}
              disabled={mutation.isPending}
            >
              <MailPlus className="h-4 w-4" />
              Davet Gönder
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={mutation.isPending}
              onClick={() =>
                navigate('/users')
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

export default UserCreate;
