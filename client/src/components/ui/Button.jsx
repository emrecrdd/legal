const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  ...props
}) => {
  const variants = {
    primary:
      'border border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/15 hover:border-blue-700 hover:bg-blue-700 active:bg-blue-800 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-600',

    secondary:
      'border border-gray-200 bg-white text-gray-700 shadow-sm hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.07] dark:hover:text-white dark:active:bg-white/[0.1]',

    success:
      'border border-emerald-600 bg-emerald-600 text-white shadow-sm shadow-emerald-600/10 hover:border-emerald-700 hover:bg-emerald-700 active:bg-emerald-800 dark:border-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500',

    danger:
      'border border-red-600 bg-red-600 text-white shadow-sm shadow-red-600/10 hover:border-red-700 hover:bg-red-700 active:bg-red-800 dark:border-red-500 dark:bg-red-600 dark:hover:bg-red-500',

    warning:
      'border border-amber-500 bg-amber-500 text-white shadow-sm shadow-amber-500/10 hover:border-amber-600 hover:bg-amber-600 active:bg-amber-700 dark:border-amber-400 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950',

    outline:
      'border border-gray-200 bg-white text-gray-700 shadow-sm hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100 dark:border-white/[0.08] dark:bg-transparent dark:text-slate-300 dark:hover:border-white/[0.14] dark:hover:bg-white/[0.04] dark:hover:text-white',

    ghost:
      'border border-transparent bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-white dark:active:bg-white/[0.08]',
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-sm',
  };

  const spinnerSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-4 w-4',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`
        inline-flex
        shrink-0
        items-center
        justify-center
        gap-2
        whitespace-nowrap
        rounded-lg
        font-semibold
        transition-all
        duration-150
        active:scale-[0.98]
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-blue-500/40
        focus-visible:ring-offset-2
        dark:focus-visible:ring-offset-[#08162b]
        disabled:pointer-events-none
        disabled:opacity-50
        disabled:active:scale-100
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <svg
          className={`animate-spin ${spinnerSizes[size] || spinnerSizes.md}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />

          <path
            className="opacity-80"
            fill="currentColor"
            d="M12 2a10 10 0 0 1 10 10h-3a7 7 0 0 0-7-7V2Z"
          />
        </svg>
      )}

      <span className={loading ? 'opacity-90' : ''}>
        {children}
      </span>
    </button>
  );
};

export default Button;