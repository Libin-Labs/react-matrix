import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { createMatrixLookup, groupMatrixItems, setMatrixCell } from './matrix.js';
import type { MatrixChange, MatrixItem, MatrixRelation } from './matrix.js';

export interface RelationshipMatrixProps<R extends string = string, C extends string = string> {
  rows: readonly MatrixItem<R>[];
  columns: readonly MatrixItem<C>[];
  value: readonly MatrixRelation<R, C>[];
  onChange: (value: MatrixRelation<R, C>[], change: MatrixChange<R, C>) => void;
  isCellDisabled?: (row: MatrixItem<R>, column: MatrixItem<C>) => boolean;
  disabled?: boolean;
  readOnly?: boolean;
  groupRows?: boolean;
  emptyMessage?: string;
  className?: string;
  'aria-label'?: string;
}

export function RelationshipMatrix<R extends string = string, C extends string = string>({
  rows,
  columns,
  value,
  onChange,
  isCellDisabled,
  disabled = false,
  readOnly = false,
  groupRows = false,
  emptyMessage = 'No relationships to display',
  className = '',
  'aria-label': label = 'Relationship matrix',
}: RelationshipMatrixProps<R, C>) {
  const lookup = createMatrixLookup(rows, columns, value);
  const groups = groupRows ? groupMatrixItems(rows) : [{ group: null, items: [...rows] }];
  const orderedRows = groups.flatMap((group) => group.items);
  const tableRef = useRef<HTMLTableElement>(null);
  const [active, setActive] = useState<{ rowId: R; columnId: C } | null>(null);
  const id = useId();
  const activeRow = orderedRows.findIndex((row) => row.id === active?.rowId);
  const activeColumn = columns.findIndex((column) => column.id === active?.columnId);
  const focusRow = activeRow < 0 || activeColumn < 0 ? 0 : activeRow;
  const focusColumn = activeRow < 0 || activeColumn < 0 ? 0 : activeColumn;
  const navigate = (
    event: KeyboardEvent<HTMLButtonElement>,
    rowIndex: number,
    columnIndex: number,
  ) => {
    let nextRow = rowIndex;
    let nextColumn = columnIndex;
    switch (event.key) {
      case 'ArrowUp':
        nextRow--;
        break;
      case 'ArrowDown':
        nextRow++;
        break;
      case 'ArrowLeft':
        nextColumn--;
        break;
      case 'ArrowRight':
        nextColumn++;
        break;
      case 'Home':
        nextColumn = 0;
        if (event.ctrlKey) nextRow = 0;
        break;
      case 'End':
        nextColumn = columns.length - 1;
        if (event.ctrlKey) nextRow = orderedRows.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    nextRow = Math.max(0, Math.min(orderedRows.length - 1, nextRow));
    nextColumn = Math.max(0, Math.min(columns.length - 1, nextColumn));
    tableRef.current
      ?.querySelector<HTMLButtonElement>(`button[data-cell="${nextRow}:${nextColumn}"]`)
      ?.focus();
  };
  let rowOffset = 0;
  return (
    <div className={`lp-matrix ${className}`}>
      <p id={`${id}-help`} className="lp-matrix-help">
        Arrow keys move between cells. Home and End move within a row; Ctrl+Home and Ctrl+End move
        to corners. Space or Enter toggles a relationship.
      </p>
      <div className="lp-matrix-scroll">
        <table
          ref={tableRef}
          role="grid"
          aria-label={label}
          aria-describedby={`${id}-help`}
          aria-readonly={readOnly || undefined}
          aria-disabled={disabled || undefined}
          aria-rowcount={orderedRows.length + 1}
          aria-colcount={columns.length + 1}
        >
          <caption>{label}</caption>
          <thead role="rowgroup">
            <tr role="row" aria-rowindex={1}>
              <th role="columnheader" scope="col">
                Row / Column
              </th>
              {columns.map((column, index) => (
                <th id={`${id}-column-${index}`} role="columnheader" scope="col" key={column.id}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((group, groupIndex) => {
            const start = rowOffset;
            rowOffset += group.items.length;
            return (
              <tbody
                role="rowgroup"
                aria-label={groupRows ? (group.group ?? 'Ungrouped') : undefined}
                key={groupIndex}
              >
                {group.items.map((row, groupRowIndex) => {
                  const rowIndex = start + groupRowIndex;
                  return (
                    <tr role="row" aria-rowindex={rowIndex + 2} key={row.id}>
                      <th id={`${id}-row-${rowIndex}`} role="rowheader" scope="row">
                        {groupRows && groupRowIndex === 0 && (
                          <span className="lp-matrix-group">{group.group ?? 'Ungrouped'}</span>
                        )}
                        {row.label}
                      </th>
                      {columns.map((column, columnIndex) => {
                        const checked = lookup.has(row.id, column.id);
                        const blocked =
                          disabled ||
                          row.disabled ||
                          column.disabled ||
                          isCellDisabled?.(row, column) ||
                          false;
                        return (
                          <td
                            role="gridcell"
                            aria-colindex={columnIndex + 2}
                            aria-labelledby={`${id}-row-${rowIndex} ${id}-column-${columnIndex}`}
                            key={column.id}
                          >
                            <button
                              type="button"
                              aria-label={`${row.label}, ${column.label}`}
                              aria-pressed={checked}
                              aria-disabled={blocked || readOnly || undefined}
                              data-cell={`${rowIndex}:${columnIndex}`}
                              tabIndex={
                                rowIndex === focusRow && columnIndex === focusColumn ? 0 : -1
                              }
                              onFocus={() => setActive({ rowId: row.id, columnId: column.id })}
                              onKeyDown={(event) => navigate(event, rowIndex, columnIndex)}
                              onClick={() => {
                                if (blocked || readOnly) return;
                                const change = {
                                  rowId: row.id,
                                  columnId: column.id,
                                  checked: !checked,
                                };
                                onChange(setMatrixCell(value, row.id, column.id, !checked), change);
                              }}
                            >
                              <span aria-hidden="true">{checked ? 'Yes' : 'No'}</span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
        </table>
      </div>
      {(!rows.length || !columns.length) && <p role="status">{emptyMessage}</p>}
    </div>
  );
}
