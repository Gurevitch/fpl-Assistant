import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './LineupPage';

type Position = 'GK' | 'DEF' | 'MID' | 'FWD';
type Formation = '4-5-1' | '5-4-1' | '3-5-2' | '4-4-2' | '5-3-2' | '3-4-3' | '4-3-3';

interface Team {
    id: number;
    name: string;
    shortName: string;
    code: string;
}

interface Player {
    id: number;
    firstName: string;
    lastName: string;
    webName: string;       // display name
    position: Position;    // Player.Position
    teamId: number;        // Player.TeamID
    price: number;         // Player.CurrentPrice (in £m)
    expectedPoints?: number;
    form: number;          // Player.Form (required, parsed to number)
    selectedByPercent?: number;
}

type ActiveSlot =
    | { type: 'GK'; index: 0 }
    | { type: 'DEF'; index: number }
    | { type: 'MID'; index: number }
    | { type: 'FWD'; index: number }
    | { type: 'BENCH_GK'; index: 0 }
    | { type: 'BENCH_OUT'; index: number };

const ALLOWED_FORMATIONS: Formation[] = [
    '4-5-1', '5-4-1',
    '3-5-2', '4-4-2', '5-3-2',
    '3-4-3', '4-3-3',
];

const UPDATE_URL = 'http://localhost:8080/v1/admin/import-fpl';

const mapPos = (v: any): Position => {
    const s = String(v || '').toUpperCase();
    if (s === 'GK' || s === 'GKP') return 'GK';
    if (s === 'DEF' || s === 'D') return 'DEF';
    if (s === 'MID' || s === 'M') return 'MID';
    return 'FWD';
};
const normalizePrice = (raw: unknown): number => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    // If backend sends 55 for £5.5m, convert; else keep decimals
    return n >= 20 ? Math.round(n) / 10 : Math.round(n * 10) / 10;
};
const toNum = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
};
// Sort signal for the picker: prefer expectedPoints, then form, then cheaper price
const scoreOf = (p: Player) => (p.expectedPoints ?? p.form ?? 0) * 100 - p.price;

export default function LineupPage() {
    const [teams, setTeams] = useState<Record<number, Team>>({});
    const [pool, setPool] = useState<Player[]>([]);
    const [formation, setFormation] = useState<Formation>('4-3-3');
    const [active, setActive] = useState<ActiveSlot | null>(null);

    // Update button state
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<'idle' | 'ok' | 'error'>('idle');

    // XI + Bench
    const [gk, setGK] = useState<(Player | null)[]>([null]);
    const [defs, setDefs] = useState<(Player | null)[]>([null, null, null, null, null]);
    const [mids, setMids] = useState<(Player | null)[]>([null, null, null, null, null]);
    const [fwds, setFwds] = useState<(Player | null)[]>([null, null, null]);
    const [benchGK, setBenchGK] = useState<Player | null>(null);
    const [benchOut, setBenchOut] = useState<(Player | null)[]>([null, null, null]);

    // ========= fetchers =========
    const loadTeams = useCallback(async () => {
        const r = await fetch('/v1/teams');
        const rows = await r.json();
        const map: Record<number, Team> = {};
        (rows || []).forEach((t: any) => {
            const id = Number(t.id ?? t.ID);
            map[id] = {
                id,
                name: String(t.name ?? t.Name ?? ''),
                shortName: String(t.shortName ?? t.ShortName ?? ''),
                code: String(t.code ?? t.Code ?? ''),
            };
        });
        setTeams(map);
    }, []);

    const loadPlayers = useCallback(async () => {
        const r = await fetch('/v1/players');
        const rows = await r.json();
        const list: Player[] = (rows || []).map((p: any) => ({
            id: Number(p.id ?? p.ID),
            firstName: String(p.firstName ?? p.FirstName ?? ''),
            lastName: String(p.lastName ?? p.LastName ?? ''),
            webName: String(p.webName ?? p.WebName ?? p.lastName ?? p.LastName ?? ''),
            position: mapPos(p.position ?? p.Position),
            teamId: Number(p.teamId ?? p.TeamID ?? 0),
            price: normalizePrice(p.currentPrice ?? p.CurrentPrice ?? p.price),
            expectedPoints: toNum(p.expectedPoints) ?? toNum(p.predictedPoints),
            form: Number(p.Form ?? p.form ?? p.ValueForm ?? 0), // backend Form is string -> number
            selectedByPercent: toNum(p.SelectedByPercent ?? p.selectedByPercent),
        }));
        list.sort((a, b) => scoreOf(b) - scoreOf(a));
        setPool(list);
    }, []);

    useEffect(() => { loadTeams().catch(() => setTeams({})); }, [loadTeams]);
    useEffect(() => { loadPlayers().catch(() => setPool([])); }, [loadPlayers]);

    // Formation slots
    const [defCount, midCount, fwdCount] = useMemo(() => {
        const [d, m, f] = formation.split('-').map(n => parseInt(n, 10));
        return [d, m, f];
    }, [formation]);

    useEffect(() => {
        setDefs(prev => prev.slice(0, defCount).concat(Array(Math.max(0, defCount - prev.length)).fill(null)));
        setMids(prev => prev.slice(0, midCount).concat(Array(Math.max(0, midCount - prev.length)).fill(null)));
        setFwds(prev => prev.slice(0, fwdCount).concat(Array(Math.max(0, fwdCount - prev.length)).fill(null)));
    }, [defCount, midCount, fwdCount]);

    // Assigned 15
    const assigned = useMemo(() => {
        const arr: (Player | null)[] = [
            ...gk,
            ...defs.slice(0, defCount),
            ...mids.slice(0, midCount),
            ...fwds.slice(0, fwdCount),
            benchGK,
            ...benchOut,
        ];
        return arr.filter(Boolean) as Player[];
    }, [gk, defs, mids, fwds, benchGK, benchOut, defCount, midCount, fwdCount]);

    const selectedIds = useMemo(() => new Set(assigned.map(p => p.id)), [assigned]);
    const clubCount = useMemo(() => {
        const cc: Record<number, number> = {};
        for (const p of assigned) cc[p.teamId] = (cc[p.teamId] || 0) + 1;
        return cc;
    }, [assigned]);

    const totalCost = assigned.reduce((s, p) => s + p.price, 0);
    const budgetLeft = Math.max(0, Math.round((100 - totalCost) * 10) / 10);

    // Helpers
    const teamLabel = (id: number): string => {
        const t = teams[id];
        return (t?.shortName || t?.name) ?? ''; // no "Team N" fallback
    };

    const occupantOf = (slot: ActiveSlot): Player | null => {
        if (slot.type === 'GK') return gk[0];
        if (slot.type === 'DEF') return defs[slot.index] ?? null;
        if (slot.type === 'MID') return mids[slot.index] ?? null;
        if (slot.type === 'FWD') return fwds[slot.index] ?? null;
        if (slot.type === 'BENCH_GK') return benchGK;
        return benchOut[slot.index] ?? null;
    };
    const setSlot = (slot: ActiveSlot, p: Player | null) => {
        if (slot.type === 'GK') setGK([p]);
        else if (slot.type === 'DEF') setDefs(prev => { const c = prev.slice(); c[slot.index] = p; return c; });
        else if (slot.type === 'MID') setMids(prev => { const c = prev.slice(); c[slot.index] = p; return c; });
        else if (slot.type === 'FWD') setFwds(prev => { const c = prev.slice(); c[slot.index] = p; return c; });
        else if (slot.type === 'BENCH_GK') setBenchGK(p);
        else setBenchOut(prev => { const c = prev.slice(); c[slot.index] = p; return c; });
    };
    const removeFromSlot = (slot: ActiveSlot) => setSlot(slot, null);

    // Assign gate: position, duplicate, budget, ≤3 per team (with replacement refund)
    const canAssign = (slot: ActiveSlot, p: Player) => {
        // position
        if (slot.type === 'GK' && p.position !== 'GK') return false;
        if (slot.type === 'DEF' && p.position !== 'DEF') return false;
        if (slot.type === 'MID' && p.position !== 'MID') return false;
        if (slot.type === 'FWD' && p.position !== 'FWD') return false;
        if (slot.type === 'BENCH_GK' && p.position !== 'GK') return false;
        if (slot.type === 'BENCH_OUT' && p.position === 'GK') return false;

        // duplicate (allow replacing the same occupant)
        const occ = occupantOf(slot);
        if (selectedIds.has(p.id) && (!occ || occ.id !== p.id)) return false;

        // budget
        const refund = occ ? occ.price : 0;
        if (totalCost - refund + p.price > 100.0 + 1e-9) return false;

        // club cap (≤3) — account for replacing same-team
        const countThisTeam = (clubCount[p.teamId] || 0) - (occ && occ.teamId === p.teamId ? 1 : 0);
        if (countThisTeam >= 3) return false;

        return true;
    };

    // Candidates for the active slot
    const candidates = useMemo(() => {
        if (!active) return [];
        const byPos = pool.filter(p => {
            if (active.type === 'GK' || active.type === 'BENCH_GK') return p.position === 'GK';
            if (active.type === 'DEF') return p.position === 'DEF';
            if (active.type === 'MID') return p.position === 'MID';
            if (active.type === 'FWD') return p.position === 'FWD';
            return p.position !== 'GK'; // bench outfield
        });
        return byPos.slice().sort((a, b) => {
            const sa = scoreOf(a), sb = scoreOf(b);
            if (sb !== sa) return sb - sa;
            return a.price - b.price;
        });
    }, [active, pool]);

    // Update button
    const runUpdate = useCallback(async () => {
        try {
            setIsUpdating(true);
            setUpdateStatus('idle');
            // Try POST first, then GET
            let res = await fetch(UPDATE_URL, { method: 'POST' });
            if (!res.ok) res = await fetch(UPDATE_URL);
            if (!res.ok) throw new Error(`Import failed: HTTP ${res.status}`);
            await Promise.all([loadTeams(), loadPlayers()]);
            setUpdateStatus('ok');
        } catch (e) {
            console.error(e);
            setUpdateStatus('error');
        } finally {
            setIsUpdating(false);
        }
    }, [loadTeams, loadPlayers]);

    // Slot card
    const SlotCard: React.FC<{ slot: ActiveSlot; label: string; tint: string }> = ({ slot, label, tint }) => {
        const occ = occupantOf(slot);
        const team = occ ? teamLabel(occ.teamId) : '';
        const displayName = occ ? (occ.webName || occ.lastName || `${occ.firstName} ${occ.lastName}`) : '';
        return (
            <div
                className={`player-card ${tint}`}
                onClick={() => setActive(slot)}
                title={
                    occ
                        ? `${displayName}${team ? ` • ${team} ` : ''} • £${occ.price.toFixed(1)}m `
                        : ''
                }
            >
                {occ ? (
                    <>
                        <div className="name">{displayName}</div>
                        <div className="meta">
                            <span className="meta-item">£{occ.price.toFixed(1)}m</span>
                            {team && <span className="meta-item">{team}</span>}
                            <span className="chip">Form {occ.form.toFixed(1)}</span>
                            {Number.isFinite(occ.selectedByPercent as number) && (
                                <span className="chip">Sel {occ.selectedByPercent!.toFixed(1)}%</span>
                            )}
                        </div>

                        <button className="x" onClick={(e) => { e.stopPropagation(); removeFromSlot(slot); }}>×</button>
                    </>
                ) : (
                    <div className="placeholder">{label}</div>
                )}
            </div>
        );
    };

    return (
        <div className="pitch">
            <div className="pitch-lines" />

            <div className="top-bar">
                <h1>⚽️ Your FPL Lineup</h1>
                <div className="controls-row">
                    <div className="badge-box">Budget: <strong>£{budgetLeft.toFixed(1)}m</strong></div>
                    <div className="badge-box">{assigned.length}/15 selected</div>

                    <label>Formation</label>
                    <select value={formation} onChange={e => setFormation(e.target.value as Formation)}>
                        {ALLOWED_FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>

                    <button className="btn" onClick={runUpdate} disabled={isUpdating}>
                        {isUpdating ? 'Updating…' : 'Update'}
                    </button>
                    {updateStatus === 'ok' && <span className="chip" title="Latest data loaded">Updated</span>}
                    {updateStatus === 'error' && <span className="chip" title="Import failed">Update failed</span>}
                </div>
            </div>

            <div className="lineup">
                {/* GK */}
                <div className="row one">
                    <SlotCard slot={{ type: 'GK', index: 0 }} label="GK" tint="gk" />
                </div>

                {/* DEF */}
                <div className="row" style={{ gridTemplateColumns: `repeat(${defCount}, 1fr)` }}>
                    {Array.from({ length: defCount }).map((_, i) => (
                        <SlotCard key={`d-${i}`} slot={{ type: 'DEF', index: i }} label="DEF" tint="def" />
                    ))}
                </div>

                {/* MID */}
                <div className="row" style={{ gridTemplateColumns: `repeat(${midCount}, 1fr)` }}>
                    {Array.from({ length: midCount }).map((_, i) => (
                        <SlotCard key={`m-${i}`} slot={{ type: 'MID', index: i }} label="MID" tint="mid" />
                    ))}
                </div>

                {/* FWD */}
                <div className="row" style={{ gridTemplateColumns: `repeat(${fwdCount}, 1fr)` }}>
                    {Array.from({ length: fwdCount }).map((_, i) => (
                        <SlotCard key={`f-${i}`} slot={{ type: 'FWD', index: i }} label="FWD" tint="fwd" />
                    ))}
                </div>
            </div>

            {/* Bench */}
            <div className="bench">
                <h3>Bench</h3>
                <div className="bench-strip">
                    <SlotCard slot={{ type: 'BENCH_GK', index: 0 }} label="GK" tint="gk" />
                    {Array.from({ length: 3 }).map((_, i) => (
                        <SlotCard key={`bo-${i}`} slot={{ type: 'BENCH_OUT', index: i }} label="SUB" tint="bench" />
                    ))}
                </div>
            </div>

            {/* Picker */}
            <div className="picker">
                {!active ? (
                    <div className="picker-hint">Select a slot to pick a player.</div>
                ) : (
                    <>
                        <div className="picker-title">
                            Pick {active.type === 'BENCH_OUT' ? 'Outfield Sub' : active.type.replace('_', ' ')}
                            <button className="btn ghost" onClick={() => setActive(null)}>Close</button>
                        </div>
                        <div className="available-grid">
                            {candidates.map(p => {
                                const disabled = !canAssign(active, p);
                                const t = teamLabel(p.teamId);
                                const name = p.webName || p.lastName || `${p.firstName} ${p.lastName}`;
                                return (
                                    <button
                                        key={p.id}
                                        className={`avail-card ${disabled ? 'disabled' : ''}`}
                                        onClick={() => { if (!disabled) { setSlot(active, p); setActive(null); } }}
                                        disabled={disabled}
                                        title={`${name}${t ? ` • ${t}` : ''} • £${p.price.toFixed(1)}m`}
                                    >
                                        <div className="avail-name">{name}</div>
                                        <div className="avail-meta">
                                            {t && <span>{t}</span>}
                                            <span>£{p.price.toFixed(1)}m</span>
                                            <span className="chip">Form {p.form.toFixed(1)}</span>
                                            {typeof p.selectedByPercent === 'number' && !Number.isNaN(p.selectedByPercent) && (
                                                <span className="chip">{`Sel ${p.selectedByPercent.toFixed(1)}%`}</span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
