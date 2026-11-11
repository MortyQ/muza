# Spec Delta

## Purpose

Defines how `@muzakit/ui`'s table types the rows a consumer hands it, so that a typed row flows
into column callbacks, cell slots and events, and an untyped table never falls back to `any`.

## ADDED Requirements

### Requirement: Row type flows from data to callbacks, slots and events
When a consumer passes rows of a declared type, the table SHALL expose that same type to every
column callback (`sortValue`, `cellClass`, `cellStyle`), to the row in `cell-*` slots and to the
row in `row-click`, `update:selected-rows` and `expand-click`. No cast SHALL be needed.

#### Scenario: Typed callback reads a declared field
- **WHEN** a consumer passes `data` of a row type with a `price: number` field, and a column with `sortValue: (row) => row.price`
- **THEN** the project type-checks, and `row.price` is typed `number`

#### Scenario: Typed callback reads a field the row does not have
- **WHEN** the same column's `sortValue` reads `row.missing`
- **THEN** type-check fails on that access

### Requirement: No `any` in the table's public types
The table's exported types SHALL NOT contain `any`. When no row type is given, columns and cell
contexts SHALL type the row as a record of `unknown` values.

#### Scenario: Untyped column
- **WHEN** a consumer declares `Column[]` with no type argument and a `cellClass` reading `row.status`
- **THEN** `row.status` is typed `unknown` and has to be narrowed before it is used as a string

#### Scenario: Reviewer check
- **WHEN** the reviewer runs over `libs/ui/src/components/table/types/`
- **THEN** it reports no R-TS-01 finding

### Requirement: Typed columns remain assignable to untyped column lists
A column declared for a specific row type SHALL be assignable wherever a column without a type
argument is accepted, so that typing columns never forces casts in consumer code.

#### Scenario: Typed column in an untyped list
- **WHEN** a `Column<Product>` with a `sortValue` callback is placed in a `Column[]`
- **THEN** the project type-checks

### Requirement: Undeclared fields on an expandable row are `unknown`
`ExpandableRow` SHALL keep its `id` and `children` fields typed. Every other field SHALL read as
`unknown` unless the consumer's row type declares it.

#### Scenario: Declared field through an extending interface
- **WHEN** a consumer declares `interface OrderRow extends ExpandableRow { total: number }` and reads `row.total`
- **THEN** `row.total` is typed `number`

#### Scenario: Undeclared field
- **WHEN** a consumer reads `row.total` on a plain `ExpandableRow`
- **THEN** `row.total` is typed `unknown`

### Requirement: Runtime behaviour is unchanged
Changing the types SHALL NOT change what the table renders, sorts, selects, expands or emits.

#### Scenario: Existing table suite
- **WHEN** the `@muzakit/ui` unit project and token contracts run after the change
- **THEN** every table test that passed before still passes, without editing any assertion
