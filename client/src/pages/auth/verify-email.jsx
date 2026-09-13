import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useSearchParams,
} from 'react-router-dom';

import {
  CircleCheck,
  CircleX,
  LoaderCircle,
} from 'lucide-react';

import {
  useVerifySetupEmail,
} from '../../features/setup/setup.hook.js';

const VerifyEmail = () => {
  const [
    searchParams,
  ] =
    useSearchParams();

  const token =
    searchParams.get(
      'token'
    ) || '';

  const verify =
    useVerifySetupEmail();

  const startedRef =
    useRef(false);

  const [
    status,
    setStatus,
  ] =
    useState(
      'loading'
    );

  const [
    message,
    setMessage,
  ] =
    useState(
      'E-posta adresiniz doğrulanıyor...'
    );

  useEffect(
    () => {
      if (
        startedRef.current
      ) {
        return;
      }

      startedRef.current =
        true;

      if (
        !token
      ) {
        setStatus(
          'error'
        );

        setMessage(
          'Doğrulama bağlantısı geçersiz.'
        );

        return;
      }

      verify
        .mutateAsync(
          token
        )
        .then(
          (
            result
          ) => {
            setStatus(
              'success'
            );

            setMessage(
              result?.message ||
                'E-posta adresiniz başarıyla doğrulandı.'
            );
          }
        )
        .catch(
          (
            error
          ) => {
            setStatus(
              'error'
            );

            setMessage(
              error?.response?.data
                ?.message ||
                'Doğrulama bağlantısı geçersiz veya süresi dolmuş.'
            );
          }
        );
    },
    [
      token,
    ]
  );

  return (
    <div className="mx-auto w-full max-w-lg py-10 text-center">
      {status ===
        'loading' && (
        <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-blue-600" />
      )}

      {status ===
        'success' && (
        <CircleCheck className="mx-auto h-12 w-12 text-emerald-500" />
      )}

      {status ===
        'error' && (
        <CircleX className="mx-auto h-12 w-12 text-red-500" />
      )}

      <h1 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">
        {status ===
        'success'
          ? 'Hesabınız hazır'
          : status ===
              'error'
            ? 'Doğrulama tamamlanamadı'
            : 'E-posta doğrulanıyor'}
      </h1>

      <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
        {message}
      </p>

      {status !==
        'loading' && (
        <Link
          to="/login"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-bold text-white transition hover:bg-blue-500"
        >
          Giriş Yap
        </Link>
      )}
    </div>
  );
};

export default VerifyEmail;
