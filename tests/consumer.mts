import { createElement } from 'react';
import {
  RelationshipMatrix,
  createMatrixLookup,
  setMatrixCell,
  groupMatrixItems,
} from '@lp-labs/react-matrix';
import type { MatrixItem, MatrixRelation, RelationshipMatrixProps } from '@lp-labs/react-matrix';

type R = 'ada' | 'bob';
type C = 'read' | 'write';
const rows: MatrixItem<R>[] = [
  { id: 'ada', label: 'Ada' },
  { id: 'bob', label: 'Bob' },
];
const columns: MatrixItem<C>[] = [
  { id: 'read', label: 'Read' },
  { id: 'write', label: 'Write' },
];
const value: MatrixRelation<R, C>[] = [{ rowId: 'ada', columnId: 'read' }];
const lookup = createMatrixLookup(rows, columns, value);
lookup.has('bob', 'write');
setMatrixCell(value, 'bob', 'read', true);
groupMatrixItems(rows);
const props: RelationshipMatrixProps<R, C> = {
  rows,
  columns,
  value,
  onChange: (next, change) => {
    next.push({ rowId: change.rowId, columnId: change.columnId });
  },
};
createElement(RelationshipMatrix<R, C>, props);
// @ts-expect-error Selected IDs must match their axis types.
const invalid: MatrixRelation<R, C> = { rowId: 'unknown', columnId: 'read' };
// @ts-expect-error Explicit axis types reject unknown IDs.
setMatrixCell<R, C>(value, 'ada', 'unknown', true);
void invalid;
