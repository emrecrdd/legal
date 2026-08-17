const Card = ({
  children,
  className = '',
  hover = false,
  ...props
}) => {
  return (
    <div
      className={`
        rounded-2xl
        border
        border-gray-200/80
        bg-white
        shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_rgba(15,23,42,0.04)]
        dark:border-white/[0.07]
        dark:bg-[#0b1b33]
        dark:shadow-none
        ${
          hover
            ? 'transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)] dark:hover:border-white/[0.12] dark:hover:bg-[#0d203b]'
            : ''
        }
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

Card.Header = ({
  children,
  className = '',
}) => (
  <div
    className={`
      border-b
      border-gray-100
      px-5
      py-4
      dark:border-white/[0.06]
      md:px-6
      ${className}
    `}
  >
    {children}
  </div>
);

Card.Body = ({
  children,
  className = '',
}) => (
  <div
    className={`
      px-5
      py-5
      md:px-6
      ${className}
    `}
  >
    {children}
  </div>
);

Card.Footer = ({
  children,
  className = '',
}) => (
  <div
    className={`
      border-t
      border-gray-100
      bg-gray-50/50
      px-5
      py-4
      dark:border-white/[0.06]
      dark:bg-white/[0.015]
      md:px-6
      ${className}
    `}
  >
    {children}
  </div>
);

export default Card;