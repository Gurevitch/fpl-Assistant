import type { Position, Team, Player } from '../types/fpl';

export const ALLOWED_FORMATIONS = [
    '4-5-1', '5-4-1', '3-5-2', '4-4-2', '5-3-2', '3-4-3', '4-3-3'
] as const;

export const mapPos = (v: any): Position => {
    const s = String(v || '').toUpperCase();
    if (s === 'GK' || s === 'GKP') return 'GK';
    if (s === 'DEF' || s === 'D') return 'DEF';
    if (s === 'MID' || s === 'M') return 'MID';
    return 'FWD';
};

export const normalizePrice = (raw: unknown): number => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    // If backend sends 55 for £5.5m, convert; else keep decimals
    return n >= 20 ? Math.round(n) / 10 : Math.round(n * 10) / 10;
};

export const toNum = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
};

export const teamLabel = (teams: Record<number, Team>, id: number): string =>
    (teams[id]?.shortName || teams[id]?.name) ?? '';

/** sort signal for candidate list: prefer xP, then form, then cheaper */
export const scoreOf = (p: Player) =>
    (p.expectedPoints ?? p.form ?? 0) * 100 - p.price;
