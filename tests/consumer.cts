import matrix = require('@lp-labs/react-matrix');
import { createElement } from 'react';

const rows: matrix.MatrixItem<'ada'>[] = [{ id: 'ada', label: 'Ada' }];
const columns: matrix.MatrixItem<'read'>[] = [{ id: 'read', label: 'Read' }];
const value: matrix.MatrixRelation<'ada', 'read'>[] = matrix.setMatrixCell([], 'ada', 'read', true);
matrix.createMatrixLookup(rows, columns, value).has('ada', 'read');
matrix.groupMatrixItems(rows);
const props: matrix.RelationshipMatrixProps<'ada', 'read'> = {
  rows,
  columns,
  value,
  onChange: () => undefined,
};
createElement(matrix.RelationshipMatrix<'ada', 'read'>, props);
