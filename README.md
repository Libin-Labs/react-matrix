# @lp-labs/react-matrix

Package version: `0.1.0`.

An original, standalone controlled React row/column relationship matrix.
Typed string IDs, constant-time selected-cell lookup, optional row grouping,
and keyboard grid navigation. Zero runtime dependencies; React is a peer.
ESM and CommonJS include matching declarations.

## Install

```sh
npm install @lp-labs/react-matrix react
```

Use React `^18.2.0 || ^19.0.0` and a compatible renderer. CSS is opt-in.

```tsx
import { useState } from "react";
import { RelationshipMatrix, createMatrixLookup } from "@lp-labs/react-matrix";
import type { MatrixItem, MatrixRelation } from "@lp-labs/react-matrix";
import "@lp-labs/react-matrix/styles.css";

type PersonId = "ada" | "bob" | "guest";
type PermissionId = "read" | "write";
const people: MatrixItem<PersonId>[] = [
  { id: "ada", label: "Ada", group: "Staff" },
  { id: "guest", label: "Guest", group: "Guests", disabled: true },
  { id: "bob", label: "Bob", group: "Staff" },
];
const permissions: MatrixItem<PermissionId>[] = [
  { id: "read", label: "Read" },
  { id: "write", label: "Write" },
];

export function Permissions() {
  const [value, setValue] = useState<MatrixRelation<PersonId, PermissionId>[]>([
    { rowId: "ada", columnId: "read" },
  ]);
  return (
    <RelationshipMatrix<PersonId, PermissionId>
      rows={people}
      columns={permissions}
      value={value}
      onChange={(next, change) => {
        setValue(next);
        console.log(change.rowId, change.columnId, change.checked);
      }}
      groupRows
      isCellDisabled={(person, permission) =>
        person.id === "bob" && permission.id === "write"}
      aria-label="People and permissions"
    />
  );
}

const selected = createMatrixLookup(people, permissions, [
  { rowId: "ada", columnId: "read" },
]);
console.log(selected.has("ada", "read")); // true
console.log(selected.size); // 1
```

Always persist `onChange` into `value`; without a parent update the UI remains
unchanged. Client-side disabled states are presentation, not authorization.

## Exported types

All ID type parameters extend `string` and default to `string`.

```ts
interface MatrixItem<Id extends string = string> {
  id: Id;
  label: string;
  group?: string;
  disabled?: boolean;
}
interface MatrixRelation<R extends string = string, C extends string = string> {
  rowId: R;
  columnId: C;
}
interface MatrixChange<R extends string = string, C extends string = string>
  extends MatrixRelation<R, C> {
  checked: boolean;
}
interface MatrixLookup<R extends string = string, C extends string = string> {
  readonly size: number;
  has: (rowId: R, columnId: C) => boolean;
}
interface MatrixGroup<Id extends string = string> {
  group: string | null;
  items: MatrixItem<Id>[];
}
```

`RelationshipMatrixProps<R, C>` is also exported and is described below.
Labels are plain strings, so React escapes them normally.

## Pure helpers

### createMatrixLookup

`createMatrixLookup<R, C>(rows: readonly MatrixItem<R>[], columns: readonly MatrixItem<C>[], value: readonly MatrixRelation<R, C>[]): MatrixLookup<R, C>`

Validates axes and references, then creates a private Map-of-Sets snapshot.
`has` is approximately `O(1)` and returns false for unselected/unknown pairs.
Duplicate selected pairs count once. Compound strings, delimiters, and
prototype names in IDs do not collide. Construction is
`O(rows + columns + relationships)` in time/storage.

Axis IDs must be nonempty strings and unique within each axis; the row and
column axes may share an ID. Labels and optional groups must be strings.
Duplicate/invalid IDs, invalid labels/groups, or relationships referencing
unknown axes throw `TypeError`. The helper does not mutate input.

### setMatrixCell

`setMatrixCell<R, C>(value: readonly MatrixRelation<R, C>[], rowId: R, columnId: C, checked: boolean): MatrixRelation<R, C>[]`

Returns copied, deduplicated relationships in existing first-seen order.
Selecting an absent pair appends it; selecting an existing pair is
idempotent. Deselecting removes every copy of that pair. Empty IDs throw
`TypeError`. This helper does not receive axes, so it cannot validate dangling
references or enforce disabled policies; use `createMatrixLookup` and your
application's policy when those checks are needed. It scans relationships
once and never mutates them.

### groupMatrixItems

`groupMatrixItems<Id>(items: readonly MatrixItem<Id>[]): MatrixGroup<Id>[]`

Validates items and coalesces equal `group` strings in first-seen group order,
preserving each group's member order. Missing `group` becomes `null`; an
empty string is a distinct valid group. Returned arrays are new, but item
objects retain their original references. This helper can group either axis;
the component itself only offers row grouping.

## RelationshipMatrixProps&lt;R, C&gt;

| Prop | Default | Contract |
| --- | --- | --- |
| `rows` | required | Readonly row items |
| `columns` | required | Readonly column items |
| `value` | required | Readonly selected row/column pairs |
| `onChange(next, change)` | required | Replacement relationships and `MatrixChange<R, C>` |
| `isCellDisabled(row, column)` | absent | Additional per-cell block predicate |
| `disabled` | `false` | Blocks all toggles |
| `readOnly` | `false` | Blocks all toggles and sets grid `aria-readonly` |
| `groupRows` | `false` | Coalesces rows by group and shows group labels |
| `emptyMessage` | `"No relationships to display"` | Status text when either axis is empty |
| `className` | `""` | Extra root class |
| `aria-label` | `"Relationship matrix"` | Grid label and table caption |

`rows[i].disabled`, `columns[j].disabled`, `disabled`, and
`isCellDisabled` are combined. They do not remove existing relationships or
prevent external controlled changes. Blocked/read-only cells remain focusable
for exploration and announce `aria-disabled`; clicks do not call `onChange`.
Checked state is announced using `aria-pressed` on native buttons.
Errors from invalid input, the cell predicate, or callbacks propagate.

Ungrouped rows retain input order. With `groupRows`, first-seen groups
coalesce: `Staff/Ada, Guests/Guest, Staff/Bob` becomes
`Staff/Ada, Staff/Bob, Guests/Guest`. Missing groups display `Ungrouped`.
Column order never changes; column `group` metadata is not rendered.

## Keyboard and accessibility

The table uses `grid`, `rowgroup`, `row`, `rowheader`, `columnheader`, and
`gridcell` roles, row/column counts, a caption, cell header associations,
and visible instructions.

- Tab enters at one roving cell button, initially the top-left data cell.
- Arrow keys move one row/column, clamped to edges; disabled cells are included.
- Home / End move to the first / last column in the current row.
- Ctrl+Home / Ctrl+End move to the first / last data cell.
- Space / Enter use native button activation to toggle an enabled cell.
- Tab leaves the grid normally. Navigation never traps focus.

Grouping uses rendered row order for navigation. Focus position is stored
by IDs and survives ordinary rerenders/reordering. If the active row/column
is removed, the next Tab entry falls back to top-left; the component does
not forcibly restore browser focus. There is no mouse drag selection,
range selection, or automatic focus transfer on axis removal. Empty axes
contain no tabbable cell buttons. Test the final composition with your
target browser and screen reader; these semantics are not certification.

## Styling

Import `@lp-labs/react-matrix/styles.css` or style `.lp-matrix`,
`.lp-matrix-scroll`, `.lp-matrix-help`, and `.lp-matrix-group`.
CSS variables are `--lp-matrix-border`, `--lp-matrix-accent`, and
`--lp-matrix-selected`:

```css
.permission-matrix {
  --lp-matrix-accent: #6d28d9;
  --lp-matrix-selected: #ede9fe;
}
```

Pass `className="permission-matrix"`. Preserve visible focus, readable
checked/disabled states, adequate contrast, and touch target sizes.

## Bounds

Rendering is `O(rows * columns)` and synchronous. Selection lookup avoids
scanning every relationship for each cell, but there is no virtualization,
remote data loading, pagination, column grouping UI, persistence, or
authorization enforcement. Toggle proposals copy/deduplicate relationships
in `O(relationships)`. Keep axes reasonably sized or paginate externally.
No production certification is claimed.

## License

[MIT](./LICENSE).

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
