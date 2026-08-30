import {
  useEffect,
  useRef,
  useState,
} from 'react';

const IDLE_TIME = 60 * 1000;

const IdleBrandOverlay = () => {
  const [isIdle, setIsIdle] =
    useState(false);

  const timerRef =
    useRef(null);

  useEffect(() => {
    const resetTimer = () => {
      setIsIdle(false);

      if (timerRef.current) {
        clearTimeout(
          timerRef.current
        );
      }

      timerRef.current =
        setTimeout(() => {
          setIsIdle(true);
        }, IDLE_TIME);
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
          resetTimer,
          { passive: true }
        );
      }
    );

    resetTimer();

    return () => {
      events.forEach(
        (eventName) => {
          window.removeEventListener(
            eventName,
            resetTimer
          );
        }
      );

      if (timerRef.current) {
        clearTimeout(
          timerRef.current
        );
      }
    };
  }, []);

  if (!isIdle) {
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
      "
    >
      <div
        className="
          absolute
          inset-0
          bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.08),transparent_45%)]
        "
      />

      <div
        className="
          relative
          flex
          flex-col
          items-center
          text-center
        "
      >
        <img
          src="/favicon.svg"
          alt=""
          className="
            h-28
            w-28
            opacity-90
            drop-shadow-[0_20px_50px_rgba(0,0,0,0.35)]
          "
        />

        <h1
          className="
            mt-6
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

        <p
          className="
            mt-10
            text-xs
            text-slate-500
          "
        >
          Devam etmek için fareyi hareket ettirin
        </p>
      </div>
    </div>
  );
};

export default IdleBrandOverlay;