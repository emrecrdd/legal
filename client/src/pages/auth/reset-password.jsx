import {
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  useMutation,
} from '@tanstack/react-query';

import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldAlert,
} from 'lucide-react';

import authApi from '../../features/auth/auth.api.js';

import Button from '../../components/ui/Button.jsx';

import toast from 'react-hot-toast';

// ======================================================
// COMPONENT
// ======================================================

const ResetPassword = () => {
  const [
    searchParams,
  ] =
    useSearchParams();

  const token =
    searchParams.get(
      'token'
    );

  const navigate =
    useNavigate();

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] =
    useState(false);

  const [
    formData,
    setFormData,
  ] =
    useState({
      password: '',
      confirmPassword: '',
    });

  const [
    errors,
    setErrors,
  ] =
    useState({});

  // ======================================================
  // MUTATION
  // ======================================================

  const mutation =
    useMutation({
      mutationFn: ({
        token,
        password,
      }) =>
        authApi.resetPassword(
          token,
          password
        ),

      onSuccess: () => {
        toast.success(
          'Şifreniz başarıyla değiştirildi'
        );

        navigate(
          '/login',
          {
            replace:
              true,
          }
        );
      },

      onError: (
        error
      ) => {
        toast.error(
          error
            ?.response
            ?.data
            ?.message ||
          error?.message ||
          'Şifre değiştirilemedi'
        );
      },
    });

  // ======================================================
  // CHANGE
  // ======================================================

  const handleChange = (
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

  // ======================================================
  // VALIDATION
  // ======================================================

  const validateForm =
    () => {
      const nextErrors =
        {};

      if (
        !formData.password
      ) {
        nextErrors.password =
          'Yeni şifre gereklidir';
      } else if (
        formData.password.length <
        8
      ) {
        nextErrors.password =
          'Şifre en az 8 karakter olmalıdır';
      }

      if (
        !formData.confirmPassword
      ) {
        nextErrors.confirmPassword =
          'Şifre tekrarını girin';
      } else if (
        formData.password !==
        formData.confirmPassword
      ) {
        nextErrors.confirmPassword =
          'Şifreler eşleşmiyor';
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
    event
  ) => {
    event.preventDefault();

    if (
      mutation.isPending
    ) {
      return;
    }

    if (
      !validateForm()
    ) {
      return;
    }

    mutation.mutate({
      token,
      password:
        formData.password,
    });
  };

  // ======================================================
  // INVALID TOKEN
  // ======================================================

  if (!token) {
    return (
      <div className="w-full">

        {/* BRAND */}

        <div className="mb-7">
          <img
            src="/derkenar-logo.png"
            alt="Derkenar"
            className="
              h-auto
              w-full
              max-w-[260px]
              object-contain
              object-left
            "
          />
        </div>

        <div
          className="
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-xl
            bg-red-50
            text-red-600
            dark:bg-red-500/[0.08]
            dark:text-red-400
          "
        >
          <ShieldAlert size={22} />
        </div>

        <p
          className="
            mt-5
            text-[10px]
            font-bold
            uppercase
            tracking-[0.16em]
            text-red-600
            dark:text-red-400
          "
        >
          Geçersiz Bağlantı
        </p>

        <h2
          className="
            mt-2
            text-2xl
            font-semibold
            tracking-[-0.035em]
            text-gray-900
            dark:text-white
          "
        >
          Şifre sıfırlama bağlantısı kullanılamıyor
        </h2>

        <p
          className="
            mt-3
            text-sm
            leading-6
            text-gray-500
            dark:text-slate-400
          "
        >
          Bağlantı geçersiz olabilir veya süresi dolmuş olabilir.
          Yeni bir şifre sıfırlama bağlantısı isteyebilirsiniz.
        </p>

        <div className="mt-7 space-y-3">

          <Link
            to="/forgot-password"
            className="block"
          >
            <Button className="w-full">
              Yeni Bağlantı İste
            </Button>
          </Link>

          <Link
            to="/login"
            className="block"
          >
            <Button
              variant="secondary"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4" />
              Giriş Ekranına Dön
            </Button>
          </Link>

        </div>

      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="w-full">

      {/* HEADER */}

      <div className="mb-8">

        {/* BRAND */}

        <div className="mb-7">
          <img
            src="/derkenar-logo.png"
            alt="Derkenar"
            className="
              h-auto
              w-full
              max-w-[260px]
              object-contain
              object-left
            "
          />
        </div>

        <div
          className="
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-xl
            border
            border-amber-200/70
            bg-amber-50
            text-amber-700
            dark:border-amber-400/15
            dark:bg-amber-400/[0.07]
            dark:text-amber-300
          "
        >
          <KeyRound size={20} />
        </div>

        <p
          className="
            mt-5
            text-[10px]
            font-bold
            uppercase
            tracking-[0.16em]
            text-amber-600
            dark:text-amber-300
          "
        >
          Şifre Yenileme
        </p>

        <h2
          className="
            mt-2
            text-2xl
            font-semibold
            tracking-[-0.035em]
            text-gray-900
            dark:text-white
            sm:text-[28px]
          "
        >
          Yeni şifrenizi belirleyin
        </h2>

        <p
          className="
            mt-2
            text-sm
            leading-6
            text-gray-500
            dark:text-slate-400
          "
        >
          Hesabınız için yeni ve güçlü bir şifre oluşturun.
        </p>

      </div>

      {/* FORM */}

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-5"
      >

        {/* PASSWORD */}

        <div>

          <label
            htmlFor="reset-password"
            className="
              mb-1.5
              block
              text-sm
              font-medium
              text-gray-700
              dark:text-slate-300
            "
          >
            Yeni Şifre
          </label>

          <div className="relative">

            <LockKeyhole
              size={17}
              className="
                pointer-events-none
                absolute
                left-3.5
                top-1/2
                -translate-y-1/2
                text-gray-400
                dark:text-slate-500
              "
            />

            <input
              id="reset-password"
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              name="password"
              value={
                formData.password
              }
              onChange={
                handleChange
              }
              autoComplete="new-password"
              disabled={
                mutation.isPending
              }
              placeholder="Yeni şifrenizi girin"
              aria-invalid={
                Boolean(
                  errors.password
                )
              }
              className={`
                h-11
                w-full
                rounded-lg
                border
                bg-white
                pl-10
                pr-11
                text-sm
                text-gray-900
                shadow-sm
                outline-none
                transition-all
                placeholder:text-gray-400

                dark:bg-white/[0.035]
                dark:text-white
                dark:placeholder:text-slate-500

                ${
                  errors.password
                    ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 dark:border-red-500/50'
                    : 'border-gray-200 hover:border-gray-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 dark:border-white/[0.08] dark:hover:border-white/[0.14] dark:focus:border-amber-400/60'
                }

                disabled:cursor-not-allowed
                disabled:opacity-60
              `}
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (
                    current
                  ) =>
                    !current
                )
              }
              disabled={
                mutation.isPending
              }
              className="
                absolute
                right-2
                top-1/2
                inline-flex
                h-8
                w-8
                -translate-y-1/2
                items-center
                justify-center
                rounded-lg
                text-gray-400
                transition
                hover:bg-gray-100
                hover:text-gray-700
                dark:text-slate-500
                dark:hover:bg-white/[0.05]
                dark:hover:text-white
              "
              aria-label={
                showPassword
                  ? 'Şifreyi gizle'
                  : 'Şifreyi göster'
              }
            >
              {showPassword ? (
                <EyeOff size={17} />
              ) : (
                <Eye size={17} />
              )}
            </button>

          </div>

          {errors.password && (
            <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
              {errors.password}
            </p>
          )}

          {!errors.password && (
            <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500">
              En az 8 karakter kullanın.
            </p>
          )}

        </div>

        {/* CONFIRM */}

        <div>

          <label
            htmlFor="reset-password-confirm"
            className="
              mb-1.5
              block
              text-sm
              font-medium
              text-gray-700
              dark:text-slate-300
            "
          >
            Yeni Şifre Tekrar
          </label>

          <div className="relative">

            <LockKeyhole
              size={17}
              className="
                pointer-events-none
                absolute
                left-3.5
                top-1/2
                -translate-y-1/2
                text-gray-400
                dark:text-slate-500
              "
            />

            <input
              id="reset-password-confirm"
              type={
                showConfirmPassword
                  ? 'text'
                  : 'password'
              }
              name="confirmPassword"
              value={
                formData.confirmPassword
              }
              onChange={
                handleChange
              }
              autoComplete="new-password"
              disabled={
                mutation.isPending
              }
              placeholder="Yeni şifrenizi tekrar girin"
              aria-invalid={
                Boolean(
                  errors.confirmPassword
                )
              }
              className={`
                h-11
                w-full
                rounded-lg
                border
                bg-white
                pl-10
                pr-11
                text-sm
                text-gray-900
                shadow-sm
                outline-none
                transition-all
                placeholder:text-gray-400

                dark:bg-white/[0.035]
                dark:text-white
                dark:placeholder:text-slate-500

                ${
                  errors.confirmPassword
                    ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 dark:border-red-500/50'
                    : 'border-gray-200 hover:border-gray-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 dark:border-white/[0.08] dark:hover:border-white/[0.14] dark:focus:border-amber-400/60'
                }

                disabled:cursor-not-allowed
                disabled:opacity-60
              `}
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword(
                  (
                    current
                  ) =>
                    !current
                )
              }
              disabled={
                mutation.isPending
              }
              className="
                absolute
                right-2
                top-1/2
                inline-flex
                h-8
                w-8
                -translate-y-1/2
                items-center
                justify-center
                rounded-lg
                text-gray-400
                transition
                hover:bg-gray-100
                hover:text-gray-700
                dark:text-slate-500
                dark:hover:bg-white/[0.05]
                dark:hover:text-white
              "
              aria-label={
                showConfirmPassword
                  ? 'Şifreyi gizle'
                  : 'Şifreyi göster'
              }
            >
              {showConfirmPassword ? (
                <EyeOff size={17} />
              ) : (
                <Eye size={17} />
              )}
            </button>

          </div>

          {errors.confirmPassword && (
            <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
              {errors.confirmPassword}
            </p>
          )}

        </div>

        {/* SUBMIT */}

        <div className="pt-1">

          <Button
            type="submit"
            loading={
              mutation.isPending
            }
            disabled={
              mutation.isPending
            }
            className="w-full"
          >
            {mutation.isPending
              ? 'Şifre değiştiriliyor'
              : 'Şifreyi Güncelle'}
          </Button>

        </div>

      </form>

      {/* BACK */}

      <div
        className="
          mt-7
          border-t
          border-gray-200
          pt-5
          dark:border-white/[0.07]
        "
      >
        <Link
          to="/login"
          className="
            inline-flex
            items-center
            gap-1.5
            text-xs
            font-semibold
            text-gray-500
            transition
            hover:text-amber-600
            dark:text-slate-500
            dark:hover:text-amber-300
          "
        >
          <ArrowLeft size={14} />
          Giriş ekranına dön
        </Link>
      </div>

    </div>
  );
};

export default ResetPassword;