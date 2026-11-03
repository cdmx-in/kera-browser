import { describe, expect, it } from 'vitest';
import { alignedTable, typedBlockLanded } from '../eval-tasks';

const sheet = (rows: string[][], from = 1) =>
  Object.fromEntries(rows.flatMap((row, r) => row.map((v, c) => [`${'ABCDEFGHIJ'[c]}${from + r}`, v])));

describe('alignedTable', () => {
  const table = [
    ['ID', 'Name', 'Department'],
    ['1001', 'Alice Johnson', 'Sales'],
    ['1002', 'Bob Smith', 'Finance'],
    ['1003', 'Carol White', 'Support'],
  ];

  it('passes a header with aligned rows', () => {
    expect(alignedTable(sheet(table), 3, 3)).toBe(true);
    expect(alignedTable(sheet(table, 5), 3, 3)).toBe(true);
    // A total row with blanks under the table.
    expect(alignedTable({ ...sheet(table), A5: 'Total', C5: '3' }, 3, 3)).toBe(true);
  });

  it('fails a block typed into a selected two-column range (Tab and Enter wrap inside it)', () => {
    const flat = table.flat();
    const wrapped = Array.from({ length: Math.ceil(flat.length / 2) }, (_, i) => flat.slice(i * 2, i * 2 + 2));
    expect(alignedTable(sheet(wrapped), 3, 3)).toBe(false);
  });

  it('fails too few rows, a row spilling past the header, or an empty sheet', () => {
    expect(alignedTable(sheet(table.slice(0, 3)), 3, 3)).toBe(false);
    expect(alignedTable({ ...sheet(table), D3: 'extra' }, 3, 3)).toBe(false);
    expect(alignedTable({}, 3, 3)).toBe(false);
  });
});

describe('typedBlockLanded', () => {
  const rows = [
    ['ID', 'Name', 'Department', 'Status'],
    ['1001', 'Alice Johnson', 'Sales', 'Active'],
    ['1002', 'Bob Smith', 'Finance', 'Active'],
  ];
  const calls = [{ name: 'type', args: JSON.stringify({ text: rows.map(r => r.join('\t')).join('\n') + '\n' }) }];

  it('passes the block where it was typed', () => {
    expect(typedBlockLanded(calls, sheet(rows, 3))).toBe(true);
    expect(typedBlockLanded([], {})).toBe(true);
  });

  it('fails the block wrapped inside a three-column range, though every row is full', () => {
    const flat = rows.flat();
    const wrapped = Array.from({ length: 4 }, (_, i) => flat.slice(i * 3, i * 3 + 3));
    expect(alignedTable(sheet(wrapped), 3, 3)).toBe(true);
    expect(typedBlockLanded(calls, sheet(wrapped))).toBe(false);
  });
});
