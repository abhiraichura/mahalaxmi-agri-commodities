import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../hooks/useAuthStore';
import type { Contract } from '../types';
import { onFontChange } from './fontStore';
import { applyOverrides, noteValuesFromContract, type Overrides } from './mapping';
import { composeNote, isBlocking, loadContext, noteTitle, renderNote, resetContext, type NoteContext } from './service';
import type { NoteIssue, NoteValues, Tag } from './types';

export interface ContractNoteState {
  /** font + templates still loading */
  loading: boolean;
  /** no Verdana uploaded yet (go to Settings) */
  fontMissing: boolean;
  error: string | null;
  fontProblems: string[];
  base: NoteValues | null; // from the contract itself
  values: NoteValues | null; // base + overrides
  issues: Record<Tag, NoteIssue[]>;
  blocking: Record<Tag, boolean>;
  pdfs: Partial<Record<Tag, Uint8Array>>;
  rendering: boolean;
  ctx: NoteContext | null;
}

const NONE: Record<Tag, NoteIssue[]> = { B: [], S: [] };

/**
 * Prepares both contract notes (buyer + seller) for a contract.
 * `overrides` are the user's edits on top of the contract data (the saved ones, or the draft being edited).
 * `plain` = the copies without header, footer and lotus, for printing on the printed letterhead.
 */
export function useContractNote(contract: Contract | undefined, overrides: Overrides | null | undefined, debounceMs = 0, plain = false): ContractNoteState {
  const gst = useAppStore(s => s.settings.defaultGstPercent);
  const [ctx, setCtx] = useState<NoteContext | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [fontTick, setFontTick] = useState(0);
  const [pdfs, setPdfs] = useState<Partial<Record<Tag, Uint8Array>>>({});
  const [rendering, setRendering] = useState(false);

  useEffect(() => onFontChange(() => { resetContext(); setCtx(undefined); setFontTick(t => t + 1); }), []);

  useEffect(() => {
    let live = true;
    setError(null);
    loadContext().then(
      c => { if (live) setCtx(c); },
      e => { if (live) { setCtx(null); setError(String(e?.message || e)); } },
    );
    return () => { live = false; };
  }, [fontTick]);

  const base = useMemo(() => (contract ? noteValuesFromContract(contract, { defaultGstPercent: gst }) : null), [contract, gst]);
  const values = useMemo(() => (base ? applyOverrides(base, overrides) : null), [base, overrides]);

  const composed = useMemo(() => {
    if (!ctx || !values) return null;
    return { B: composeNote(values, 'B', ctx), S: composeNote(values, 'S', ctx) };
  }, [ctx, values]);

  const issues = composed ? { B: composed.B.issues, S: composed.S.issues } : NONE;
  const blocking = { B: isBlocking(issues.B), S: isBlocking(issues.S) };
  const hasError = { B: issues.B.some(i => i.level === 'error'), S: issues.S.some(i => i.level === 'error') };

  // render the PDFs (debounced; stale runs are dropped)
  const run = useRef(0);
  const errKey = hasError.B + '|' + hasError.S;
  useEffect(() => {
    if (!ctx || !values) return;
    const my = ++run.current;
    setRendering(true);
    const timer = setTimeout(async () => {
      try {
        const out: Partial<Record<Tag, Uint8Array>> = {};
        for (const tag of ['B', 'S'] as Tag[]) {
          if (hasError[tag]) continue; // a character the font cannot draw: do not produce a wrong PDF
          const bytes = await renderNote(values, tag, ctx, noteTitle(values.no, tag, plain), plain);
          if (run.current !== my) return;
          out[tag] = bytes;
        }
        if (run.current === my) { setPdfs(out); setError(null); }
      } catch (e: any) {
        if (run.current === my) setError(String(e?.message || e));
      } finally {
        if (run.current === my) setRendering(false);
      }
    }, debounceMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, values, errKey, debounceMs, plain]);

  return {
    loading: ctx === undefined,
    fontMissing: ctx === null && !error,
    error,
    fontProblems: ctx?.fontProblems || [],
    base,
    values,
    issues,
    blocking,
    pdfs,
    rendering,
    ctx: ctx || null,
  };
}
