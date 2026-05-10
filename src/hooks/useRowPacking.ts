import { useMemo } from "react";
import { packIntoRows } from "../packing";

interface PackInput {
  id: string;
  label: string;
  start: number;
  end: number;
  isRange: boolean;
}

export function useRowPacking(
  packInput: PackInput[],
  packPxPerMs: number,
  measureLabel: (s: string) => number,
) {
  const rowOf = useMemo(() => {
    if (packPxPerMs <= 0) return new Map<string, number>();
    return packIntoRows(packInput, packPxPerMs, measureLabel);
  }, [packInput, packPxPerMs, measureLabel]);

  const totalRows = useMemo(() => {
    let max = 0;
    for (const r of rowOf.values()) max = Math.max(max, r);
    return rowOf.size === 0 ? 0 : max + 1;
  }, [rowOf]);

  return { rowOf, totalRows };
}
