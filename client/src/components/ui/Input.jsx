import { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';

const Input = forwardRef(
  (
    {
      label,
      error,
      icon,
      helperText,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    const hasIcon = Boolean(icon);
    const hasError = Boolean(error);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="
              mb-1.5
              block
              text-sm
              font-medium
              text-gray-700
              dark:text-slate-300
            "
          >
            {label}
          </label>
        )}

        <div className="relative">
          {hasIcon && (
            <div
              className="
                pointer-events-none
                absolute
                inset-y-0
                left-0
                flex
                w-10
                items-center
                justify-center
                text-gray-400
                dark:text-slate-500
                [&>svg]:h-4
                [&>svg]:w-4
              "
            >
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            aria-invalid={hasError || undefined}
            aria-describedby={
              hasError
                ? `${inputId}-error`
                : helperText
                  ? `${inputId}-helper`
                  : undefined
            }
            className={`
              h-10
              w-full
              rounded-lg
              border
              border-gray-200
              bg-white
              px-3.5
              text-sm
              text-gray-900
              shadow-sm
              outline-none
              transition-all
              duration-150

              placeholder:text-gray-400

              hover:border-gray-300

              focus:border-blue-500
              focus:ring-2
              focus:ring-blue-500/10

              dark:border-white/[0.08]
              dark:bg-white/[0.035]
              dark:text-white
              dark:placeholder:text-slate-500
              dark:hover:border-white/[0.14]
              dark:focus:border-blue-500/60
              dark:focus:bg-white/[0.05]
              dark:focus:ring-blue-500/10

              disabled:cursor-not-allowed
              disabled:bg-gray-50
              disabled:text-gray-400
              disabled:opacity-70

              dark:disabled:bg-white/[0.02]
              dark:disabled:text-slate-600

              ${hasIcon ? 'pl-10' : ''}
              ${hasError ? 'pr-10' : ''}

              ${
                hasError
                  ? `
                    border-red-400
                    focus:border-red-500
                    focus:ring-red-500/10
                    dark:border-red-500/50
                    dark:focus:border-red-500
                  `
                  : ''
              }

              ${className}
            `}
            {...props}
          />

          {hasError && (
            <div
              className="
                pointer-events-none
                absolute
                inset-y-0
                right-0
                flex
                w-10
                items-center
                justify-center
              "
            >
              <AlertCircle
                size={16}
                className="text-red-500"
              />
            </div>
          )}
        </div>

        {hasError && (
          <p
            id={`${inputId}-error`}
            className="
              mt-1.5
              flex
              items-center
              gap-1
              text-xs
              font-medium
              text-red-600
              dark:text-red-400
            "
          >
            {error}
          </p>
        )}

        {!hasError && helperText && (
          <p
            id={`${inputId}-helper`}
            className="
              mt-1.5
              text-xs
              leading-5
              text-gray-500
              dark:text-slate-500
            "
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;