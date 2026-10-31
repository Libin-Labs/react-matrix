export interface MatrixItem<Id extends string = string> {
  id: Id;
  label: string;
  group?: string;
  disabled?: boolean;
}

export interface MatrixRelation<RowId extends string = string, ColumnId extends string = string> {
  rowId: RowId;
  columnId: ColumnId;
}

export interface MatrixChange<
  RowId extends string = string,
  ColumnId extends string = string,
> extends MatrixRelation<RowId, ColumnId> {
  checked: boolean;
}

export interface MatrixLookup<RowId extends string = string, ColumnId extends string = string> {
  readonly size: number;
  has: (rowId: RowId, columnId: ColumnId) => boolean;
}

export interface MatrixGroup<Id extends string = string> {
  group: string | null;
  items: MatrixItem<Id>[];
}

function assertId(id: string): void {
  if (typeof id !== 'string' || !id.trim())
    throw new TypeError('Matrix IDs must be nonempty strings.');
}

function axisIds<Id extends string>(items: readonly MatrixItem<Id>[]): Set<Id> {
  const ids = new Set<Id>();
  for (const item of items) {
    assertId(item.id);
    if (ids.has(item.id)) throw new TypeError(`Duplicate matrix axis ID: ${item.id}.`);
    if (
      typeof item.label !== 'string' ||
      (item.group !== undefined && typeof item.group !== 'string')
    ) {
      throw new TypeError('Matrix labels and groups must be strings.');
    }
    ids.add(item.id);
  }
  return ids;
}

export function createMatrixLookup<R extends string, C extends string>(
  rows: readonly MatrixItem<R>[],
  columns: readonly MatrixItem<C>[],
  value: readonly MatrixRelation<R, C>[],
): MatrixLookup<R, C> {
  const rowIds = axisIds(rows);
  const columnIds = axisIds(columns);
  const lookup = new Map<R, Set<C>>();
  let size = 0;
  for (const relation of value) {
    if (!rowIds.has(relation.rowId) || !columnIds.has(relation.columnId)) {
      throw new TypeError('Relationship references an unknown row or column.');
    }
    let selected = lookup.get(relation.rowId);
    if (!selected) {
      selected = new Set<C>();
      lookup.set(relation.rowId, selected);
    }
    if (!selected.has(relation.columnId)) {
      selected.add(relation.columnId);
      size++;
    }
  }
  return { size, has: (rowId, columnId) => lookup.get(rowId)?.has(columnId) ?? false };
}

export function setMatrixCell<R extends string, C extends string>(
  value: readonly MatrixRelation<R, C>[],
  rowId: R,
  columnId: C,
  checked: boolean,
): MatrixRelation<R, C>[] {
  assertId(rowId);
  assertId(columnId);
  const seen = new Map<R, Set<C>>();
  const result: MatrixRelation<R, C>[] = [];
  for (const relation of value) {
    assertId(relation.rowId);
    assertId(relation.columnId);
    if (!checked && relation.rowId === rowId && relation.columnId === columnId) continue;
    let columns = seen.get(relation.rowId);
    if (!columns) {
      columns = new Set<C>();
      seen.set(relation.rowId, columns);
    }
    if (!columns.has(relation.columnId)) {
      columns.add(relation.columnId);
      result.push({ rowId: relation.rowId, columnId: relation.columnId });
    }
  }
  if (checked && !seen.get(rowId)?.has(columnId)) result.push({ rowId, columnId });
  return result;
}

export function groupMatrixItems<Id extends string>(
  items: readonly MatrixItem<Id>[],
): MatrixGroup<Id>[] {
  axisIds(items);
  const groups = new Map<string | null, MatrixItem<Id>[]>();
  for (const item of items) {
    const key = item.group ?? null;
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return [...groups].map(([group, entries]) => ({ group, items: [...entries] }));
}
