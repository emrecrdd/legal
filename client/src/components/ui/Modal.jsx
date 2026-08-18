import {
  useEffect,
  useId,
  useRef,
} from 'react';

import {
  X,
} from 'lucide-react';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className = '',
  closeOnBackdrop = true,
}) => {
  const modalRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    const previouslyFocusedElement =
      document.activeElement;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener(
      'keydown',
      handleEscape
    );

    document.body.style.overflow =
      'hidden';

    requestAnimationFrame(() => {
      modalRef.current?.focus();
    });

    return () => {
      document.removeEventListener(
        'keydown',
        handleEscape
      );

      document.body.style.overflow =
        previousOverflow;

      if (
        previouslyFocusedElement &&
        typeof previouslyFocusedElement.focus ===
          'function'
      ) {
        previouslyFocusedElement.focus();
      }
    };
  }, [
    isOpen,
    onClose,
  ]);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  if (!isOpen) {
    return null;
  }

  const handleBackdropMouseDown = (
    event
  ) => {
    if (!closeOnBackdrop) {
      return;
    }

    if (
      event.target ===
      event.currentTarget
    ) {
      onClose?.();
    }
  };

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        overflow-y-auto
      "
      aria-hidden={!isOpen}
    >
      {/* BACKDROP */}
      <div
        className="
          fixed
          inset-0
          bg-slate-950/60
          backdrop-blur-[3px]
        "
        aria-hidden="true"
      />

      {/* POSITIONER */}
      <div
        className="
          relative
          z-10
          flex
          min-h-full
          items-center
          justify-center
          p-4
          sm:p-6
        "
        onMouseDown={
          handleBackdropMouseDown
        }
      >
        {/* MODAL */}
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={
            title
              ? titleId
              : undefined
          }
          tabIndex={-1}
          className={`
            relative
            w-full
            ${sizes[size] || sizes.md}

            overflow-hidden
            rounded-2xl
            border
            border-gray-200/80
            bg-white

            shadow-[0_24px_80px_rgba(15,23,42,0.28)]

            outline-none

            dark:border-white/[0.08]
            dark:bg-[#0b1b33]
            dark:shadow-[0_28px_90px_rgba(0,0,0,0.45)]

            ${className}
          `}
          onMouseDown={(event) =>
            event.stopPropagation()
          }
        >
          {/* HEADER */}
          {(title || onClose) && (
            <div
              className="
                flex
                min-h-[64px]
                items-center
                justify-between
                gap-4

                border-b
                border-gray-100
                px-5
                py-4

                dark:border-white/[0.06]

                md:px-6
              "
            >
              <div className="min-w-0">
                {title && (
                  <h3
                    id={titleId}
                    className="
                      truncate
                      text-base
                      font-semibold
                      tracking-[-0.01em]
                      text-gray-900
                      dark:text-white
                    "
                  >
                    {title}
                  </h3>
                )}
              </div>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="
                    inline-flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center

                    rounded-lg
                    border
                    border-transparent

                    text-gray-400

                    transition-all
                    duration-150

                    hover:border-gray-200
                    hover:bg-gray-100
                    hover:text-gray-700

                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-blue-500/40

                    dark:text-slate-500
                    dark:hover:border-white/[0.08]
                    dark:hover:bg-white/[0.05]
                    dark:hover:text-white
                  "
                  aria-label="Kapat"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          )}

          {/* BODY */}
          <div
            className="
              max-h-[calc(100vh-12rem)]
              overflow-y-auto
              px-5
              py-5

              md:px-6
              md:py-6
            "
          >
            {children}
          </div>

          {/* FOOTER */}
          {footer && (
            <div
              className="
                flex
                flex-wrap
                items-center
                justify-end
                gap-2

                border-t
                border-gray-100
                bg-gray-50/60
                px-5
                py-4

                dark:border-white/[0.06]
                dark:bg-white/[0.015]

                md:px-6
              "
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;