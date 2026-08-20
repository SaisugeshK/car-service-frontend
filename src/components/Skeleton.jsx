export function SkeletonRow({ columns = 4 }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i}>
          <span
            className="placeholder col-8 placeholder-glow d-block"
            style={{ height: 14, borderRadius: 4 }}
          />
        </td>
      ))}
    </tr>
  );
}

export default function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} columns={columns} />
      ))}
    </>
  );
}
