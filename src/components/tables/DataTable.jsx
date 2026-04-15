function DataTable({
  columns,
  rows,
  emptyMessage = "No records available yet.",
}) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-theme-border-soft bg-theme-surface p-6 text-sm text-theme-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-theme-border bg-theme-surface-soft shadow-panel">
      <div className="border-b border-theme-border-soft px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-theme-subtle sm:hidden">
        Swipe to view more
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-theme-border">
          <thead className="bg-theme-surface">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide text-theme-subtle"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border">
            {rows.map((row, rowIndex) => (
              <tr
                key={row.id ?? rowIndex}
                className="hover:bg-theme-surface-hover"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-4 py-3 text-base text-theme-muted"
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
