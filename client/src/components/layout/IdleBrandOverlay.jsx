import {
  useEffect,
  useRef,
  useState,
} from 'react';

import useAuth from '../../hooks/useAuth.js';

const IDLE_TIME = 60 * 1000;

const hashPin = async (
  value
) => {
  const data =
    new TextEncoder().encode(
      value
    );

  const hash =
    await window.crypto.subtle.digest(
      'SHA-256',
      data
    );

  return Array.from(
    new Uint8Array(hash)
  )
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, '0')
    )
    .join('');
};

const IdleBrandOverlay = () => {
  const { user } = useAuth();

  const pinStorageKey =
    user?.id
      ? `derkenar_screen_lock_pin_${user.id}`
      : null;

  const [
    isLocked,
    setIsLocked,
  ] = useState(false);

  const [
    hasPin,
    setHasPin,
  ] = useState(false);

  const [
    pin,
    setPin,
  ] = useState('');

  const [
    confirmPin,
    setConfirmPin,
  ] = useState('');

  const [
    error,
    setError,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(false);

  const timerRef =
    useRef(null);

  const lockedRef =
    useRef(false);

  const inputRef =
    useRef(null);

  const startTimer = () => {
    if (
      timerRef.current
    ) {
      clearTimeout(
        timerRef.current
      );
    }

    timerRef.current =
      setTimeout(() => {
        lockedRef.current =
          true;

        setIsLocked(
          true
        );
      }, IDLE_TIME);
  };

  const unlockScreen =
    () => {
      lockedRef.current =
        false;

      setIsLocked(false);
      setPin('');
      setConfirmPin('');
      setError('');

      startTimer();
    };

  useEffect(() => {
    const handleActivity =
      () => {
        // Ekran kilitliyken
        // mouse/klavye kilidi açmaz.
        if (
          lockedRef.current
        ) {
          return;
        }

        startTimer();
      };

    const events = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
    ];

    events.forEach(
      (eventName) => {
        window.addEventListener(
          eventName,
          handleActivity,
          {
            passive: true,
          }
        );
      }
    );

    startTimer();

    return () => {
      events.forEach(
        (eventName) => {
          window.removeEventListener(
            eventName,
            handleActivity
          );
        }
      );

      if (
        timerRef.current
      ) {
        clearTimeout(
          timerRef.current
        );
      }
    };
  }, []);

  useEffect(() => {
    if (!pinStorageKey) {
      setHasPin(false);
      setPin('');
      setConfirmPin('');
      setError('');
      return;
    }

    setHasPin(
      Boolean(
        localStorage.getItem(
          pinStorageKey
        )
      )
    );

    setPin('');
    setConfirmPin('');
    setError('');
  }, [pinStorageKey]);

  useEffect(() => {
    if (
      isLocked
    ) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [
    isLocked,
    hasPin,
  ]);

  const handlePinChange = (
    event
  ) => {
    const value =
      event.target.value
        .replace(/\D/g, '')
        .slice(0, 4);

    setPin(value);
    setError('');
  };

  const handleConfirmChange =
    (event) => {
      const value =
        event.target.value
          .replace(/\D/g, '')
          .slice(0, 4);

      setConfirmPin(value);
      setError('');
    };

  const handleCreatePin =
    async (event) => {
      event.preventDefault();

      if (
        pin.length !== 4
      ) {
        setError(
          'PIN 4 haneli olmalıdır.'
        );
        return;
      }

      if (
        pin !== confirmPin
      ) {
        setError(
          'PIN kodları eşleşmiyor.'
        );
        return;
      }

      try {
        setLoading(true);

        const hashed =
          await hashPin(pin);

        if (!pinStorageKey) {
          setError(
            'Kullanıcı bilgisi alınamadı.'
          );
          return;
        }

        localStorage.setItem(
          pinStorageKey,
          hashed
        );

        setHasPin(true);
        unlockScreen();
      } catch {
        setError(
          'PIN oluşturulamadı.'
        );
      } finally {
        setLoading(false);
      }
    };

  const handleUnlock =
    async (event) => {
      event.preventDefault();

      if (
        pin.length !== 4
      ) {
        setError(
          '4 haneli PIN kodunu girin.'
        );
        return;
      }

      try {
        setLoading(true);

        const hashed =
          await hashPin(pin);

        if (!pinStorageKey) {
          setError(
            'Kullanıcı bilgisi alınamadı.'
          );
          return;
        }

        const savedHash =
          localStorage.getItem(
            pinStorageKey
          );

        if (
          hashed !==
          savedHash
        ) {
          setError(
            'PIN kodu hatalı.'
          );

          setPin('');

          setTimeout(() => {
            inputRef.current?.focus();
          }, 50);

          return;
        }

        unlockScreen();
      } catch {
        setError(
          'PIN doğrulanamadı.'
        );
      } finally {
        setLoading(false);
      }
    };

  if (!isLocked) {
    return null;
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-[9999]
        flex
        items-center
        justify-center
        overflow-hidden
        bg-[#06152e]
        px-4
      "
    >
      {/* BACKGROUND */}
      <div
        className="
          absolute
          inset-0
          bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.08),transparent_45%)]
        "
      />

      {/* CONTENT */}
      <div
        className="
          relative
          flex
          w-full
          max-w-sm
          flex-col
          items-center
          text-center
        "
      >
        <img
          src="/favicon.svg"
          alt=""
          className="
            h-24
            w-24
            opacity-95
            drop-shadow-[0_20px_50px_rgba(0,0,0,0.35)]
          "
        />

        <h1
          className="
            mt-5
            text-3xl
            font-bold
            uppercase
            tracking-[0.16em]
            text-white
          "
        >
          Derkenar
        </h1>

        <p
          className="
            mt-2
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.28em]
            text-amber-300/80
          "
        >
          Hukuk Büro Yönetim Sistemi
        </p>

        <div
          className="
            mt-8
            w-full
            rounded-2xl
            border
            border-white/[0.08]
            bg-white/[0.04]
            p-5
            shadow-2xl
            backdrop-blur-sm
          "
        >
          {!hasPin ? (
            <>
              <h2
                className="
                  text-base
                  font-semibold
                  text-white
                "
              >
                Ekran Kilidi PIN'i Oluştur
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  leading-5
                  text-slate-400
                "
              >
                Bu tarayıcı için
                4 haneli bir ekran
                kilidi belirleyin.
              </p>

              <form
                onSubmit={
                  handleCreatePin
                }
                className="mt-5"
              >
                <input
                  ref={
                    inputRef
                  }
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={pin}
                  onChange={
                    handlePinChange
                  }
                  placeholder="Yeni PIN"
                  maxLength={4}
                  className="
                    h-12
                    w-full
                    rounded-xl
                    border
                    border-white/10
                    bg-[#071426]
                    px-4
                    text-center
                    text-xl
                    font-semibold
                    tracking-[0.5em]
                    text-white
                    outline-none
                    transition
                    placeholder:text-sm
                    placeholder:tracking-normal
                    placeholder:text-slate-600
                    focus:border-amber-400/50
                    focus:ring-4
                    focus:ring-amber-400/5
                  "
                />

                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={
                    confirmPin
                  }
                  onChange={
                    handleConfirmChange
                  }
                  placeholder="PIN Tekrar"
                  maxLength={4}
                  className="
                    mt-3
                    h-12
                    w-full
                    rounded-xl
                    border
                    border-white/10
                    bg-[#071426]
                    px-4
                    text-center
                    text-xl
                    font-semibold
                    tracking-[0.5em]
                    text-white
                    outline-none
                    transition
                    placeholder:text-sm
                    placeholder:tracking-normal
                    placeholder:text-slate-600
                    focus:border-amber-400/50
                    focus:ring-4
                    focus:ring-amber-400/5
                  "
                />

                {error && (
                  <p
                    className="
                      mt-3
                      text-xs
                      font-medium
                      text-red-400
                    "
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={
                    loading
                  }
                  className="
                    mt-4
                    h-11
                    w-full
                    rounded-xl
                    bg-amber-400
                    text-sm
                    font-bold
                    text-[#06152e]
                    transition
                    hover:bg-amber-300
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  {loading
                    ? 'Kaydediliyor...'
                    : 'PIN Oluştur'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2
                className="
                  text-base
                  font-semibold
                  text-white
                "
              >
                Ekran Kilitli
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  leading-5
                  text-slate-400
                "
              >
                Devam etmek için
                ekran kilidi PIN'inizi
                girin.
              </p>

              <form
                onSubmit={
                  handleUnlock
                }
                className="mt-5"
              >
                <input
                  ref={
                    inputRef
                  }
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={pin}
                  onChange={
                    handlePinChange
                  }
                  placeholder="••••"
                  maxLength={4}
                  className="
                    h-12
                    w-full
                    rounded-xl
                    border
                    border-white/10
                    bg-[#071426]
                    px-4
                    text-center
                    text-xl
                    font-semibold
                    tracking-[0.5em]
                    text-white
                    outline-none
                    transition
                    placeholder:text-slate-600
                    focus:border-amber-400/50
                    focus:ring-4
                    focus:ring-amber-400/5
                  "
                />

                {error && (
                  <p
                    className="
                      mt-3
                      text-xs
                      font-medium
                      text-red-400
                    "
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={
                    loading
                  }
                  className="
                    mt-4
                    h-11
                    w-full
                    rounded-xl
                    bg-amber-400
                    text-sm
                    font-bold
                    text-[#06152e]
                    transition
                    hover:bg-amber-300
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  {loading
                    ? 'Kontrol Ediliyor...'
                    : 'Kilidi Aç'}
                </button>
              </form>
            </>
          )}
        </div>

        <p
          className="
            mt-5
            text-[10px]
            uppercase
            tracking-[0.14em]
            text-slate-600
          "
        >
          Derkenar Güvenli Çalışma Alanı
        </p>
      </div>
    </div>
  );
};

export default IdleBrandOverlay;