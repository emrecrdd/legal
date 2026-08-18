const Table = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className="
        w-full
        overflow-hidden
        rounded-2xl
        border
        border-gray-200/80
        bg-white
        shadow-[0_1px_2px_rgba(15,23,42,0.02),0_4px_16px_rgba(15,23,42,0.025)]

        dark:border-white/[0.07]
        dark:bg-[#0b1b33]
        dark:shadow-none
      "
    >
      <div className="overflow-x-auto">
        <table
          className={`
            min-w-full
            border-separate
            border-spacing-0
            text-left
            ${className}
          `}
          {...props}
        >
          {children}
        </table>
      </div>
    </div>
  );
};

Table.Head = ({
  children,
  className = '',
  ...props
}) => (
  <thead
    className={`
      bg-gray-50/80
      dark:bg-white/[0.025]
      ${className}
    `}
    {...props}
  >
    {children}
  </thead>
);

Table.Body = ({
  children,
  className = '',
  ...props
}) => (
  <tbody
    className={`
      bg-white
      dark:bg-transparent
      ${className}
    `}
    {...props}
  >
    {children}
  </tbody>
);

Table.Row = ({
  children,
  className = '',
  hover = true,
  ...props
}) => (
  <tr
    className={`
      group
      transition-colors
      duration-150

      ${
        hover
          ? `
            hover:bg-gray-50/80
            dark:hover:bg-white/[0.025]
          `
          : ''
      }

      ${className}
    `}
    {...props}
  >
    {children}
  </tr>
);

Table.HeadCell = ({
  children,
  className = '',
  ...props
}) => (
  <th
    className={`
      whitespace-nowrap
      border-b
      border-gray-200/80
      px-4
      py-3.5

      text-left
      text-[11px]
      font-semibold
      uppercase
      tracking-[0.07em]
      text-gray-500

      first:pl-5
      last:pr-5

      dark:border-white/[0.06]
      dark:text-slate-400

      md:px-5

      ${className}
    `}
    {...props}
  >
    {children}
  </th>
);

Table.Cell = ({
  children,
  className = '',
  ...props
}) => (
  <td
    className={`
      border-b
      border-gray-100
      px-4
      py-4

      align-middle
      text-sm
      text-gray-700

      first:pl-5
      last:pr-5

      dark:border-white/[0.05]
      dark:text-slate-300

      group-last:border-b-0

      md:px-5

      ${className}
    `}
    {...props}
  >
    {children}
  </td>
);

export default Table;