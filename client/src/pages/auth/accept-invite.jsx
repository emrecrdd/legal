import {
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useSearchParams,
} from 'react-router-dom';

import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';

import axios from '../../app/config/axios.js';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';

const MIN_PASSWORD_LENGTH = 12;

const AcceptInvite = () => {
  const [searchParams] =
    useSearchParams();

  const token =
    searchParams.get('token') || '';

  const [password, setPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [completed, setCompleted] =
    useState(false);

  const tokenMissing =
    useMemo(
      () => !token.trim(),
      [token]
    );

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();
    setError('');

    if (tokenMissing) {
      setError(
        'Davet bağlantısı geçersiz.'
      );
      return;
    }

    if (
      password.length <
      MIN_PASSWORD_LENGTH
    ) {
      setError(
        `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır.`
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        'Şifreler eşleşmiyor.'
      );
      return;
    }

    setLoading(true);

    try {
      await axios.post(
        '/auth/accept-invite',
        {
          token,
          password,
        }
      );

      setCompleted(true);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          'Davet kabul edilemedi.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <Card>
        <div className="space-y-5 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Hesabınız hazır
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
              İlk şifreniz kaydedildi. Artık Derkenar'a giriş yapabilirsiniz.
            </p>
          </div>

          <Link
            to="/login"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
          >
            Giriş Yap
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <form
        onSubmit={handleSubmit}
        className="space-y-5 p-6"
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <KeyRound className="h-6 w-6" />
          </div>

          <h1 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
            Daveti Kabul Et
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            Hesabınızı etkinleştirmek için ilk şifrenizi belirleyin.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
            Şifre *
          </label>

          <div className="relative">
            <input
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              disabled={loading || tokenMissing}
              autoComplete="new-password"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3.5 pr-11 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-white"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (current) =>
                    !current
                )
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400"
              aria-label={
                showPassword
                  ? 'Şifreyi gizle'
                  : 'Şifreyi göster'
              }
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          <p className="mt-1.5 text-xs text-gray-500 dark:text-slate-400">
            En az 12 karakter kullanın.
          </p>
        </div>

        <Input
          label="Şifre Tekrar *"
          type={
            showPassword
              ? 'text'
              : 'password'
          }
          value={confirmPassword}
          onChange={(event) =>
            setConfirmPassword(
              event.target.value
            )
          }
          disabled={loading || tokenMissing}
          autoComplete="new-password"
        />

        <Button
          type="submit"
          loading={loading}
          disabled={loading || tokenMissing}
          className="w-full"
        >
          Hesabımı Etkinleştir
        </Button>

        {tokenMissing && (
          <p className="text-center text-sm text-red-600 dark:text-red-400">
            Davet tokenı bulunamadı.
          </p>
        )}
      </form>
    </Card>
  );
};

export default AcceptInvite;
