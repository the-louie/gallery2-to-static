import { Link } from 'react-router-dom';
import type { Child } from '@/types';
import { getItemPath } from '@/utils/albumPath';
import { MATRIX_COLUMNS } from '@/utils/matrixPaging';

/**
 * Props for the MatrixThumbMatrix component
 */
export interface MatrixThumbMatrixProps {
  /** Path of the album the items are in (ends with /) */
  albumPath: string;
  /** The items of this page */
  items: Child[];
}

/**
 * Gallery 2's `gsThumbMatrix`: the page's items in rows of three.
 *
 * @example
 * ```tsx
 * <MatrixThumbMatrix albumPath="/dreamhack/" items={pageChildren} />
 * ```
 */
export function MatrixThumbMatrix({ albumPath, items }: MatrixThumbMatrixProps) {
  const rows: Child[][] = [];
  for (let i = 0; i < items.length; i += MATRIX_COLUMNS) rows.push(items.slice(i, i + MATRIX_COLUMNS));
  return (
    <div className="gbBlock">
      <table className="gsThumbMatrix">
        <tbody>
          {rows.map((row) => (
            <tr key={row[0].id}>
              {row.map((item) => (
                <td key={item.id} className="giItemCell">
                  <p className="giTitle">
                    <Link to={getItemPath(item, albumPath)}>{item.title}</Link>
                  </p>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
