import {
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  Eye,
  EyeOff,
  LoaderCircle,
  MailCheck,
  ShieldCheck,
} from 'lucide-react';

import {
  useClaimSetupInvite,
  useResendSetupVerification,
  useSetupInvite,
} from '../../features/setup/setup.hook.js';

const InitialSetup = () => {
  const {
    token = '',
  } =
    useParams();

  const invite =
    useSetupInvite(
      token
    );

  const claim =
    useClaimSetupInvite();

  const resend =
    useResendSetupVerification();

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    completedEmail,
    setCompletedEmail,
  ] =
    useState('');

  const [
    form,
    setForm,
  ] =
    useState({
      first_name:
        '',
      last_name:
        '',
      email:
        '',
      password:
        '',
      password_confirm:
        '',
    });

  const [
    error,
    setError,
  ] =
    useState('');

  const expiresText =
    useMemo(
      () => {
        const value =
          invite.data
            ?.expires_at;

        if (
          !value
        ) {
          return '';
        }

        const date =
          new Date(
            value
          );

        if (
          Number.isNaN(
            date.getTime()
          )
        ) {
          return '';
        }

        return date.toLocaleString(
          'tr-TR'
        );
      },
      [
        invite.data
          ?.expires_at,
      ]
    );

  const update = (
    event
  ) => {
    const {
      name,
      value,
    } =
      event.target;

    setForm(
      (
        current
      ) => ({
        ...current,
        [name]:
          value,
      })
    );

    setError('');
  };

  const submit =
    async (
      event
    ) => {
      event.preventDefault();

      if (
        claim.isPending
      ) {
        return;
      }

      const firstName =
        form.first_name.trim();

      const lastName =
        form.last_name.trim();

      const email =
        form.email
          .trim()
          .toLowerCase();

      if (
        !firstName ||
        !lastName ||
        !email ||
        !form.password
      ) {
        setError(
          'Tüm alanları doldurun.'
        );
        return;
      }

      if (
        form.password.length <
        12
      ) {
        setError(
          'Şifre en az 12 karakter olmalıdır.'
        );
        return;
      }

      if (
        form.password !==
        form.password_confirm
      ) {
        setError(
          'Şifreler eşleşmiyor.'
        );
        return;
      }

      try {
        await claim.mutateAsync({
          token,

          data: {
            first_name:
              firstName,
            last_name:
              lastName,
            email,
            password:
              form.password,
          },
        });

        setCompletedEmail(
          email
        );
      } catch (
        apiError
      ) {
        /*
         * Mail servisi başarısız olmuş olsa bile backend hesabı
         * oluşturmuş olabilir. Bu durumda resend ekranı açılır.
         */
        if (
          apiError?.response?.data
            ?.data
            ?.user_created ===
          true
        ) {
          setCompletedEmail(
            apiError.response
              .data.data
              .email ||
              email
          );
          return;
        }

        setError(
          String(
            apiError?.response
              ?.data?.message ||
              'Kurulum tamamlanamadı.'
          )
        );
      }
    };

  if (
    invite.isLoading
  ) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <LoaderCircle className="h-7 w-7 animate-spin text-blue-500" />
      </div>
    );
  }

  if (
    invite.isError
  ) {
    return (
      <div className="mx-auto w-full max-w-lg py-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
          <ShieldCheck size={28} />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">
          Kurulum bağlantısı kullanılamıyor
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
          {invite.error?.response?.data?.message ||
            'Bağlantı geçersiz, kullanılmış veya süresi dolmuş olabilir.'}
        </p>
      </div>
    );
  }

  if (
    completedEmail
  ) {
    return (
      <div className="mx-auto w-full max-w-lg py-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
          <MailCheck size={28} />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">
          E-postanızı doğrulayın
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
          <strong className="text-gray-700 dark:text-gray-200">
            {completedEmail}
          </strong>{' '}
          adresine doğrulama bağlantısı gönderdik. Hesabınıza giriş yapmadan önce bağlantıyı açın.
        </p>

        <button
          type="button"
          disabled={
            resend.isPending
          }
          onClick={() =>
            resend.mutate(
              completedEmail
            )
          }
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/[0.04]"
        >
          {resend.isPending
            ? 'Gönderiliyor...'
            : 'Doğrulama e-postasını yeniden gönder'}
        </button>

        <div className="mt-4">
          <Link
            to="/login"
            className="text-sm font-semibold text-blue-600 hover:text-blue-500"
          >
            Giriş ekranına dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg py-6">
      <div className="mb-7 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600">
          <ShieldCheck size={28} />
        </div>

        <h1 className="mt-5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Derkenar ilk kurulumu
        </h1>

        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
          Yönetici hesabınızın e-posta adresini ve şifresini yalnızca siz belirleyin.
        </p>

        {expiresText && (
          <p className="mt-2 text-xs text-gray-400">
            Kurulum bağlantısı son geçerlilik: {expiresText}
          </p>
        )}
      </div>

      <form
        onSubmit={
          submit
        }
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            name="first_name"
            value={
              form.first_name
            }
            onChange={
              update
            }
            autoComplete="given-name"
            placeholder="Ad"
            className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
          />

          <input
            name="last_name"
            value={
              form.last_name
            }
            onChange={
              update
            }
            autoComplete="family-name"
            placeholder="Soyad"
            className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
          />
        </div>

        <input
          name="email"
          type="email"
          value={
            form.email
          }
          onChange={
            update
          }
          autoComplete="email"
          placeholder="E-posta adresi"
          className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
        />

        <div className="relative">
          <input
            name="password"
            type={
              showPassword
                ? 'text'
                : 'password'
            }
            value={
              form.password
            }
            onChange={
              update
            }
            autoComplete="new-password"
            placeholder="Şifre (en az 12 karakter)"
            className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 pr-12 text-sm outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(
                (
                  value
                ) =>
                  !value
              )
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-label="Şifreyi göster veya gizle"
          >
            {showPassword
              ? <EyeOff size={18} />
              : <Eye size={18} />}
          </button>
        </div>

        <input
          name="password_confirm"
          type={
            showPassword
              ? 'text'
              : 'password'
          }
          value={
            form.password_confirm
          }
          onChange={
            update
          }
          autoComplete="new-password"
          placeholder="Şifre tekrar"
          className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
        />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            claim.isPending
          }
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {claim.isPending
            ? 'Hesap oluşturuluyor...'
            : 'Yönetici Hesabını Oluştur'}
        </button>
      </form>

      <p className="mt-5 text-center text-xs leading-5 text-gray-400">
        Bu bağlantı tek kullanımlıktır. Kurulum tamamlandıktan sonra tekrar kullanılamaz.
      </p>
    </div>
  );
};

export default InitialSetup;
