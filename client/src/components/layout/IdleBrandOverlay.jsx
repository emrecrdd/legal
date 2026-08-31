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

  const [
    clock,
    setClock,
  ] = useState(() => new Date());

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

  useEffect(() => {
    const interval =
      setInterval(() => {
        setClock(new Date());
      }, 30 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (!isLocked) {
    return null;
  }

  const formattedTime =
    new Intl.DateTimeFormat(
      'tr-TR',
      {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }
    ).format(clock);

  const formattedDate =
    new Intl.DateTimeFormat(
      'tr-TR',
      {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      }
    ).format(clock);

  const inputClassName = `
    h-14
    w-full
    rounded-2xl
    border
    bg-[#071426]/80
    px-4
    text-center
    text-2xl
    font-semibold
    tracking-[0.65em]
    text-white
    outline-none
    transition-all
    duration-300
    placeholder:text-sm
    placeholder:font-medium
    placeholder:tracking-normal
    placeholder:text-slate-600
    focus:-translate-y-0.5
    focus:border-amber-300/60
    focus:bg-[#091a31]/95
    focus:shadow-[0_0_0_4px_rgba(251,191,36,0.08),0_12px_35px_rgba(0,0,0,0.28)]
    ${
      error
        ? 'border-red-400/50 shadow-[0_0_0_4px_rgba(248,113,113,0.06)]'
        : 'border-white/10'
    }
  `;

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
        bg-[#041020]
        px-4
        py-8
      "
    >
      <style>{`
        @keyframes derkenarFloatOne {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(35px, -28px, 0) scale(1.08); }
        }

        @keyframes derkenarFloatTwo {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-42px, 34px, 0) scale(1.12); }
        }

        @keyframes derkenarPulseRing {
          0%, 100% { opacity: .18; transform: scale(.94); }
          50% { opacity: .42; transform: scale(1.08); }
        }

        @keyframes derkenarLogoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }

        @keyframes derkenarShine {
          0% { transform: translateX(-140%) skewX(-18deg); }
          55%, 100% { transform: translateX(240%) skewX(-18deg); }
        }

        @keyframes derkenarShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-7px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(3px); }
        }

        @keyframes derkenarGridDrift {
          0% { transform: translateY(0); }
          100% { transform: translateY(34px); }
        }

        @keyframes derkenarEnter {
          0% { opacity: 0; transform: translateY(10px) scale(.985); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes derkenarStatusPulse {
          0%, 100% { opacity: .55; box-shadow: 0 0 0 0 rgba(52,211,153,.12); }
          50% { opacity: 1; box-shadow: 0 0 0 5px rgba(52,211,153,0); }
        }

        @keyframes derkenarLineSweep {
          0% { transform: translateX(-120%); opacity: 0; }
          18% { opacity: .7; }
          55% { opacity: .32; }
          100% { transform: translateX(220%); opacity: 0; }
        }

        .derkenar-float-one { animation: derkenarFloatOne 15s ease-in-out infinite; }
        .derkenar-float-two { animation: derkenarFloatTwo 18s ease-in-out infinite; }
        .derkenar-pulse-ring { animation: derkenarPulseRing 4s ease-in-out infinite; }
        .derkenar-logo-float { animation: derkenarLogoFloat 5s ease-in-out infinite; }
        .derkenar-button-shine { animation: derkenarShine 4.8s ease-in-out infinite; }
        .derkenar-shake { animation: derkenarShake .36s ease-in-out; }
        .derkenar-grid-drift { animation: derkenarGridDrift 10s linear infinite; }
        .derkenar-enter { animation: derkenarEnter .55s cubic-bezier(.16,1,.3,1) both; }
        .derkenar-status-dot { animation: derkenarStatusPulse 3s ease-in-out infinite; }
        .derkenar-line-sweep { animation: derkenarLineSweep 8s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .derkenar-float-one,
          .derkenar-float-two,
          .derkenar-pulse-ring,
          .derkenar-logo-float,
          .derkenar-button-shine,
          .derkenar-grid-drift,
          .derkenar-status-dot,
          .derkenar-line-sweep,
          .derkenar-enter {
            animation: none !important;
          }
        }
      `}</style>

      {/* DEEP BACKGROUND */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[radial-gradient(circle_at_50%_18%,rgba(30,64,175,0.20),transparent_34%),radial-gradient(circle_at_50%_85%,rgba(245,158,11,0.08),transparent_28%),linear-gradient(145deg,#020817_0%,#06152e_50%,#020b18_100%)]
        "
      />

      {/* MOVING LIGHT ORBS */}
      <div
        className="
          derkenar-float-one
          pointer-events-none
          absolute
          -left-24
          top-[8%]
          h-72
          w-72
          rounded-full
          bg-blue-500/10
          blur-3xl
        "
      />

      <div
        className="
          derkenar-float-two
          pointer-events-none
          absolute
          -right-24
          bottom-[5%]
          h-80
          w-80
          rounded-full
          bg-amber-400/[0.08]
          blur-3xl
        "
      />

      {/* SUBTLE MOVING GRID */}
      <div
        className="
          derkenar-grid-drift
          pointer-events-none
          absolute
          -inset-y-10
          inset-x-0
          opacity-[0.055]
          [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)]
          [background-size:34px_34px]
          [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]
        "
      />

      {/* TOP LEFT TIME / DATE */}
      <div
        className="
          pointer-events-none
          absolute
          left-5
          top-5
          hidden
          rounded-2xl
          border
          border-white/[0.06]
          bg-white/[0.025]
          px-4
          py-3
          text-left
          backdrop-blur-md
          sm:block
        "
      >
        <div className="text-xl font-semibold tabular-nums tracking-tight text-white/90">
          {formattedTime}
        </div>
        <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {formattedDate}
        </div>
      </div>

      {/* TOP SECURITY STATUS */}
      <div
        className="
          pointer-events-none
          absolute
          right-5
          top-5
          hidden
          items-center
          gap-2
          rounded-full
          border
          border-white/[0.07]
          bg-white/[0.035]
          px-3
          py-2
          text-[10px]
          font-medium
          tracking-[0.08em]
          text-slate-400
          backdrop-blur-md
          sm:flex
        "
      >
        <span className="derkenar-status-dot relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        OTURUM KORUMASI AKTİF
      </div>

      {/* CONTENT */}
      <div
        className="
          derkenar-enter
          relative
          flex
          w-full
          max-w-[420px]
          flex-col
          items-center
          text-center
        "
      >
        {/* LOGO */}
        <div
          className="
            derkenar-logo-float
            relative
            flex
            h-28
            w-28
            items-center
            justify-center
          "
        >
          <div
            className="
              derkenar-pulse-ring
              absolute
              inset-1
              rounded-full
              border
              border-amber-300/20
              bg-amber-300/[0.035]
              shadow-[0_0_60px_rgba(245,158,11,0.12)]
            "
          />

          <div
            className="
              absolute
              inset-5
              rounded-full
              bg-blue-400/10
              blur-xl
            "
          />

          <img
            src="/favicon.svg"
            alt="Derkenar"
            className="
              relative
              h-24
              w-24
              opacity-95
              drop-shadow-[0_18px_35px_rgba(0,0,0,0.4)]
            "
          />
        </div>

        <h1
          className="
            mt-3
            bg-gradient-to-b
            from-white
            via-white
            to-slate-300
            bg-clip-text
            text-3xl
            font-extrabold
            uppercase
            tracking-[0.18em]
            text-transparent
            drop-shadow-[0_10px_25px_rgba(0,0,0,0.28)]
          "
        >
          Derkenar
        </h1>

        <div className="mt-3 flex items-center gap-3">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-amber-300/60" />
          <p
            className="
              text-[9px]
              font-bold
              uppercase
              tracking-[0.30em]
              text-amber-300/75
            "
          >
            Hukuk Büro Yönetim Sistemi
          </p>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-amber-300/60" />
        </div>

        {/* LOCK CARD */}
        <div
          className={`
            relative
            mt-7
            w-full
            overflow-hidden
            rounded-[28px]
            border
            border-white/[0.09]
            bg-[#071426]/70
            p-1
            shadow-[0_32px_90px_rgba(0,0,0,0.42)]
            backdrop-blur-2xl
            ${error ? 'derkenar-shake' : ''}
          `}
        >
          <div
            className="
              pointer-events-none
              absolute
              inset-x-12
              top-0
              h-px
              overflow-hidden
              bg-white/[0.035]
            "
          >
            <span
              className="
                derkenar-line-sweep
                absolute
                inset-y-0
                left-0
                w-28
                bg-gradient-to-r
                from-transparent
                via-amber-200/80
                to-transparent
              "
            />
          </div>

          <div
            className="
              pointer-events-none
              absolute
              -right-16
              -top-20
              h-44
              w-44
              rounded-full
              bg-blue-400/[0.07]
              blur-3xl
            "
          />

          <div
            className="
              relative
              rounded-[24px]
              bg-gradient-to-b
              from-white/[0.045]
              to-white/[0.018]
              px-6
              py-6
              sm:px-7
            "
          >
            <div
              className="
                mx-auto
                mb-4
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-2xl
                border
                border-amber-300/15
                bg-amber-300/[0.06]
                text-amber-200
                shadow-[0_12px_35px_rgba(245,158,11,0.07)]
              "
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10M6.5 10h11A1.5 1.5 0 0 1 19 11.5v7A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5v-7A1.5 1.5 0 0 1 6.5 10Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 14v2.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {!hasPin ? (
              <>
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  Ekran Kilidi PIN&apos;i Oluştur
                </h2>

                <p className="mx-auto mt-2 max-w-[280px] text-xs leading-5 text-slate-400">
                  Bu tarayıcı için 4 haneli kişisel ekran kilidinizi belirleyin.
                </p>

                <form
                  onSubmit={handleCreatePin}
                  className="mt-6"
                >
                  <input
                    ref={inputRef}
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    value={pin}
                    onChange={handlePinChange}
                    placeholder="Yeni PIN"
                    maxLength={4}
                    className={inputClassName}
                    aria-label="Yeni PIN"
                  />

                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    value={confirmPin}
                    onChange={handleConfirmChange}
                    placeholder="PIN Tekrar"
                    maxLength={4}
                    className={`mt-3 ${inputClassName}`}
                    aria-label="PIN tekrar"
                  />

                  {error && (
                    <div
                      className="
                        mt-3
                        flex
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        border
                        border-red-400/10
                        bg-red-400/[0.055]
                        px-3
                        py-2.5
                        text-xs
                        font-medium
                        text-red-300
                      "
                      role="alert"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="
                      group
                      relative
                      mt-4
                      h-12
                      w-full
                      overflow-hidden
                      rounded-2xl
                      bg-gradient-to-r
                      from-amber-400
                      via-amber-300
                      to-yellow-300
                      text-sm
                      font-extrabold
                      text-[#06152e]
                      shadow-[0_14px_35px_rgba(245,158,11,0.16)]
                      transition-all
                      duration-300
                      hover:-translate-y-0.5
                      hover:shadow-[0_18px_45px_rgba(245,158,11,0.24)]
                      active:translate-y-0
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  >
                    <span
                      className="
                        derkenar-button-shine
                        pointer-events-none
                        absolute
                        inset-y-0
                        left-0
                        w-20
                        bg-gradient-to-r
                        from-transparent
                        via-white/40
                        to-transparent
                      "
                    />

                    <span className="relative flex items-center justify-center gap-2">
                      {loading && (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#06152e]/25 border-t-[#06152e]" />
                      )}
                      {loading ? 'Kaydediliyor...' : 'PIN Oluştur'}
                    </span>
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  Ekran Kilitli
                </h2>

                <p className="mx-auto mt-2 max-w-[290px] text-xs leading-5 text-slate-400">
                  Devam etmek için ekran kilidi PIN&apos;inizi girin.
                </p>

                <div
                  className="
                    mx-auto
                    mt-4
                    flex
                    w-fit
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-white/[0.055]
                    bg-white/[0.025]
                    px-3
                    py-1.5
                    text-[9px]
                    font-semibold
                    uppercase
                    tracking-[0.11em]
                    text-slate-500
                  "
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 text-amber-300/70" aria-hidden="true">
                    <path d="M12 3.5 19 6v5.2c0 4.4-2.9 7.6-7 9.3-4.1-1.7-7-4.9-7-9.3V6l7-2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  </svg>
                  Otomatik güvenlik kilidi
                </div>

                <form
                  onSubmit={handleUnlock}
                  className="mt-6"
                >
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      value={pin}
                      onChange={handlePinChange}
                      placeholder="••••"
                      maxLength={4}
                      className={inputClassName}
                      aria-label="Ekran kilidi PIN"
                    />

                    <div
                      className="
                        pointer-events-none
                        absolute
                        inset-x-5
                        -bottom-px
                        h-px
                        bg-gradient-to-r
                        from-transparent
                        via-amber-300/25
                        to-transparent
                      "
                    />
                  </div>

                  <div
                    className="mt-3 flex items-center justify-center gap-2"
                    aria-hidden="true"
                  >
                    {[0, 1, 2, 3].map((index) => (
                      <span
                        key={index}
                        className={`
                          h-1.5
                          rounded-full
                          transition-all
                          duration-200
                          ${
                            pin.length > index
                              ? 'w-5 bg-amber-300/75 shadow-[0_0_10px_rgba(252,211,77,.16)]'
                              : 'w-1.5 bg-white/10'
                          }
                        `}
                      />
                    ))}
                  </div>

                  {error && (
                    <div
                      className="
                        mt-3
                        flex
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        border
                        border-red-400/10
                        bg-red-400/[0.055]
                        px-3
                        py-2.5
                        text-xs
                        font-medium
                        text-red-300
                      "
                      role="alert"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="
                      group
                      relative
                      mt-4
                      h-12
                      w-full
                      overflow-hidden
                      rounded-2xl
                      bg-gradient-to-r
                      from-amber-400
                      via-amber-300
                      to-yellow-300
                      text-sm
                      font-extrabold
                      text-[#06152e]
                      shadow-[0_14px_35px_rgba(245,158,11,0.16)]
                      transition-all
                      duration-300
                      hover:-translate-y-0.5
                      hover:shadow-[0_18px_45px_rgba(245,158,11,0.24)]
                      active:translate-y-0
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  >
                    <span
                      className="
                        derkenar-button-shine
                        pointer-events-none
                        absolute
                        inset-y-0
                        left-0
                        w-20
                        bg-gradient-to-r
                        from-transparent
                        via-white/40
                        to-transparent
                      "
                    />

                    <span className="relative flex items-center justify-center gap-2">
                      {loading && (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#06152e]/25 border-t-[#06152e]" />
                      )}
                      {loading ? 'Kontrol Ediliyor...' : 'Kilidi Aç'}
                    </span>
                  </button>
                </form>
              </>
            )}

            <div
              className="
                mt-5
                flex
                items-center
                justify-center
                gap-2
                border-t
                border-white/[0.055]
                pt-4
                text-[10px]
                font-medium
                tracking-[0.05em]
                text-slate-500
              "
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path
                  d="M12 3.5 19 6v5.2c0 4.4-2.9 7.6-7 9.3-4.1-1.7-7-4.9-7-9.3V6l7-2.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="m9.3 12.1 1.7 1.7 3.7-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Oturumunuz güvenle korunmaktadır</span>
              <span className="hidden text-slate-700 sm:inline">•</span>
              <span className="hidden sm:inline">ENTER ile devam</span>
            </div>
          </div>
        </div>

        <p
          className="
            mt-5
            text-[9px]
            font-semibold
            uppercase
            tracking-[0.18em]
            text-slate-600
          "
        >
          Derkenar • Güvenli Çalışma Alanı
        </p>
      </div>
    </div>
  );
};

export default IdleBrandOverlay;
