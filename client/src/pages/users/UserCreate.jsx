import {
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
  Eye,
  EyeOff,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';

import userApi from '../../features/users/user.api.js';

import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';

import toast from 'react-hot-toast';

const INITIAL_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'lawyer',
  password: '',
  confirm_password: '',
  is_active: true,
};

const UserCreate = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] =
    useState(INITIAL_FORM);

  const [errors, setErrors] =
    useState({});

  const [showPassword, setShowPassword] =
    useState(false);

  const createMutation =
    useMutation({
      mutationFn: (data) =>
        userApi.create(data),

      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: ['users'],
        });

        toast.success(
          'Kullanıcı başarıyla oluşturuldu'
        );

        navigate('/users');
      },

      onError: (error) => {
        toast.error(
          error?.response?.data?.message ||
          'Kullanıcı oluşturulamadı'
        );
      },
    });

  const handleChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setFormData((current) => ({
      ...current,
      [name]:
        type === 'checkbox'
          ? checked
          : value,
    }));

    if (errors[name]) {
      setErrors((current) => ({
        ...current,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.first_name.trim()) {
      nextErrors.first_name =
        'Ad gereklidir';
    }

    if (!formData.last_name.trim()) {
      nextErrors.last_name =
        'Soyad gereklidir';
    }

    if (!formData.email.trim()) {
      nextErrors.email =
        'E-posta gereklidir';
    }

    if (
      formData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formData.email
      )
    ) {
      nextErrors.email =
        'Geçerli bir e-posta girin';
    }

    if (!formData.password) {
      nextErrors.password =
        'Şifre gereklidir';
    } else if (
      formData.password.length < 8
    ) {
      nextErrors.password =
        'Şifre en az 8 karakter olmalıdır';
    }

    if (
      formData.password !==
      formData.confirm_password
    ) {
      nextErrors.confirm_password =
        'Şifreler eşleşmiyor';
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (
      createMutation.isPending ||
      !validateForm()
    ) {
      return;
    }

    createMutation.mutate({
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

      password:
        formData.password,

      is_active:
        Boolean(formData.is_active),
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

        <h1 className="mt-3 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-white">
          <UserPlus className="h-6 w-6" />
          Yeni Kullanıcı
        </h1>

        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Büro sistemine yeni kullanıcı ekleyin ve rolünü belirleyin.
        </p>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/15 dark:bg-blue-500/[0.05]">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />

          <div>
            <p className="font-medium text-blue-900 dark:text-blue-200">
              Yönetici işlemi
            </p>

            <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
              Kullanıcı hesapları yalnızca yönetici tarafından oluşturulur.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <form
          onSubmit={handleSubmit}
          className="space-y-6 p-6"
        >

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <Input
              label="Ad *"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              error={errors.first_name}
              disabled={createMutation.isPending}
              placeholder="Ad"
            />

            <Input
              label="Soyad *"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              error={errors.last_name}
              disabled={createMutation.isPending}
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
            disabled={createMutation.isPending}
            placeholder="kullanici@hukuk.com"
          />

          <Input
            label="Telefon"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            disabled={createMutation.isPending}
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
              disabled={createMutation.isPending}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-white"
            >
              <option value="lawyer">
                Avukat
              </option>

              <option value="secretary">
                 Sekreter
              </option>

              <option value="intern">
                 Stajyer
              </option>

              <option value="admin">
                 Yönetici
              </option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                Geçici Şifre *
              </label>

              <div className="relative">
                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={createMutation.isPending}
                  placeholder="En az 8 karakter"
                  className={`
                    h-10
                    w-full
                    rounded-lg
                    border
                    bg-white
                    px-3.5
                    pr-11
                    text-sm
                    text-gray-900
                    outline-none
                    dark:bg-white/[0.035]
                    dark:text-white
                    ${
                      errors.password
                        ? 'border-red-400'
                        : 'border-gray-200 dark:border-white/[0.08]'
                    }
                  `}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current
                    )
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.05]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {errors.password && (
                <p className="mt-1.5 text-xs font-medium text-red-600">
                  {errors.password}
                </p>
              )}
            </div>

            <Input
              label="Şifre Tekrar *"
              name="confirm_password"
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              value={formData.confirm_password}
              onChange={handleChange}
              error={errors.confirm_password}
              disabled={createMutation.isPending}
              placeholder="Şifreyi tekrar girin"
            />

          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-white/[0.07]">

            <label className="flex cursor-pointer items-start gap-3">

              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                disabled={createMutation.isPending}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
              />

              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Hesap aktif
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Aktif kullanıcı oluşturulduktan sonra sisteme giriş yapabilir.
                </p>
              </div>

            </label>

          </div>

          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-5 dark:border-white/[0.06]">

            <Button
              type="submit"
              loading={createMutation.isPending}
              disabled={createMutation.isPending}
            >
              <UserPlus className="h-4 w-4" />
              Kullanıcı Oluştur
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={createMutation.isPending}
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