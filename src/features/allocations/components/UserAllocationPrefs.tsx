import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatAmountWithSymbol } from "../../../utils/formatAmount";
import type { SymbolPosition } from "../../../utils/formatAmount";

interface UserAllocationPrefsProps {
  boardId: string | null;
  userId: string | null;
  allocationTotal: number;
  minAllocation: number;
  maxAllocation: number;
  unit: string;
  symbol: string;
  symbolPosition: SymbolPosition;
}

export function UserAllocationPrefs({
  boardId,
  userId,
  allocationTotal,
  minAllocation,
  maxAllocation,
  unit,
  symbol,
  symbolPosition,
}: UserAllocationPrefsProps) {
  const [draftValue, setDraftValue] = useState<string>(String(allocationTotal));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateUserPrefs = useMutation(
    ((api as unknown as { boards: { updateUserPrefs: unknown } }).boards
      .updateUserPrefs as never)
  ) as unknown as (args: {
    boardId: Id<"boards">;
    userId: Id<"users">;
    allocationTotal: number;
  }) => Promise<null>;

  useEffect(() => {
    setDraftValue(String(allocationTotal));
  }, [allocationTotal]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const rangeLabel = useMemo(() => {
    if (minAllocation > 0 && maxAllocation > 0) {
      return `Allowed range: ${formatAmountWithSymbol(minAllocation, symbol, symbolPosition)} - ${formatAmountWithSymbol(maxAllocation, symbol, symbolPosition)} ${unit}`;
    }
    if (minAllocation > 0) {
      return `Allowed minimum: ${formatAmountWithSymbol(minAllocation, symbol, symbolPosition)} ${unit}`;
    }
    if (maxAllocation > 0) {
      return `Allowed maximum: ${formatAmountWithSymbol(maxAllocation, symbol, symbolPosition)} ${unit}`;
    }
    return "No allocation range limits are currently set for this board.";
  }, [maxAllocation, minAllocation, symbol, symbolPosition, unit]);

  useEffect(() => {
    if (!boardId || !userId) return;

    const trimmed = draftValue.trim();
    if (!trimmed) {
      setError("Allocation total is required");
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setError("Enter a valid number");
      return;
    }

    if (parsed < 0) {
      setError("Allocation total must be non-negative");
      return;
    }

    if (minAllocation > 0 && parsed < minAllocation) {
      setError(`Minimum allocation is ${formatAmountWithSymbol(minAllocation, symbol, symbolPosition)}`);
      return;
    }

    if (maxAllocation > 0 && parsed > maxAllocation) {
      setError(`Maximum allocation is ${formatAmountWithSymbol(maxAllocation, symbol, symbolPosition)}`);
      return;
    }

    setError(null);

    if (Math.abs(parsed - allocationTotal) < 0.0001) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsSaving(true);
      void updateUserPrefs({
        boardId: boardId as Id<"boards">,
        userId: userId as Id<"users">,
        allocationTotal: parsed,
      })
        .catch((err) => {
          const message = err instanceof Error ? err.message : "Failed to save allocation total";
          setError(message);
        })
        .finally(() => {
          setIsSaving(false);
        });
    }, 300);
  }, [
    allocationTotal,
    boardId,
    draftValue,
    maxAllocation,
    minAllocation,
    symbol,
    symbolPosition,
    updateUserPrefs,
    userId,
  ]);

  return (
    <details className="board-settings-card" open>
      <summary className="board-settings-summary">
        <h3>My allocation total</h3>
      </summary>
      <div className="board-settings-content user-allocation-prefs">
        <label>
          How much will you allocate?
          <input
            type="number"
            min={0}
            step="0.01"
            value={draftValue}
            onChange={(event) => setDraftValue(event.target.value)}
            placeholder="100"
          />
        </label>
        <p className="board-membership-note">{rangeLabel}</p>
        <p className="board-membership-note">
          Current total: {formatAmountWithSymbol(allocationTotal, symbol, symbolPosition)} {unit}
          {isSaving ? " (saving...)" : ""}
        </p>
        {error && <div className="auth-error">{error}</div>}
      </div>
    </details>
  );
}

export type { UserAllocationPrefsProps };
