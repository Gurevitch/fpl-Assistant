// src/hooks/useLineup.ts
import { useMemo, useState } from 'react';
import type { ActiveSlot, Formation, Player } from '../types/fpl';

export function useLineup() {
    const [formation, setFormation] = useState<Formation>('4-3-3');
    const [active, setActive] = useState<ActiveSlot | null>(null);

    // XI + bench
    const [gk, setGK] = useState<(Player | null)[]>([null]);
    const [defs, setDefs] = useState<(Player | null)[]>([null, null, null, null, null]);
    const [mids, setMids] = useState<(Player | null)[]>([null, null, null, null, null]);
    const [fwds, setFwds] = useState<(Player | null)[]>([null, null, null]);
    const [benchGK, setBenchGK] = useState<Player | null>(null);
    const [benchOut, setBenchOut] = useState<(Player | null)[]>([null, null, null]);

    // Captain / Vice (mutually exclusive, starters only)
    const [captainId, _setCaptainId] = useState<number | null>(null);
    const [viceId, _setViceId] = useState<number | null>(null);

    // formation counts
    const [defCount, midCount, fwdCount] = useMemo(() => {
        const [d, m, f] = formation.split('-').map(n => parseInt(n, 10));
        return [d, m, f];
    }, [formation]);

    // ensure row sizes match formation
    const ensureSize = (arr: (Player | null)[], size: number) =>
        arr.slice(0, size).concat(Array(Math.max(0, size - arr.length)).fill(null));

    const onFormationApplied = () => {
        setDefs(prev => ensureSize(prev, defCount));
        setMids(prev => ensureSize(prev, midCount));
        setFwds(prev => ensureSize(prev, fwdCount));
    };

    // starters / bench helpers
    const starters = useMemo(() => {
        const list: (Player | null)[] = [
            ...gk,
            ...defs.slice(0, defCount),
            ...mids.slice(0, midCount),
            ...fwds.slice(0, fwdCount),
        ];
        return list.filter(Boolean) as Player[];
    }, [gk, defs, mids, fwds, defCount, midCount, fwdCount]);

    const bench = useMemo(() => {
        const list: (Player | null)[] = [benchGK, ...benchOut];
        return list.filter(Boolean) as Player[];
    }, [benchGK, benchOut]);

    const isStarter = (p: Player | null) =>
        !!p && starters.some(s => s.id === p.id);

    // slot accessors
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

        // after any change, if captain/vice are no longer starters, clear them
        // (use a microtask to evaluate after state batching)
        queueMicrotask(() => {
            const starterIds = new Set(
                ([
                    ...gk,
                    ...defs.slice(0, defCount),
                    ...mids.slice(0, midCount),
                    ...fwds.slice(0, fwdCount),
                ]
                    .filter(Boolean) as Player[])
                    .map(p0 => p0.id)
            );
            _setCaptainId(id => (id && starterIds.has(id) ? id : null));
            _setViceId(id => (id && starterIds.has(id) ? id : null));
        });
    };

    const swapSlots = (a: ActiveSlot, b: ActiveSlot) => {
        const A = occupantOf(a);
        const B = occupantOf(b);
        setSlot(a, B ?? null);
        setSlot(b, A ?? null);
    };

    // SAFE setters that enforce:
    // - Captain cannot equal Vice
    // - Only starters can be Captain/Vice
    const setCaptainId = (id: number | null) => {
        if (id !== null) {
            // must be a starter
            if (!starters.some(s => s.id === id)) return;
            // if same as vice → clear vice first
            _setViceId(v => (v === id ? null : v));
        }
        _setCaptainId(id);
    };

    const setViceId = (id: number | null) => {
        if (id !== null) {
            // must be a starter
            if (!starters.some(s => s.id === id)) return;
            // if same as captain → clear captain first
            _setCaptainId(c => (c === id ? null : c));
        }
        _setViceId(id);
    };

    // exposed assigned list (XI + bench)
    const assigned = useMemo(() => [...starters, ...bench], [starters, bench]);

    return {
        // state
        formation, setFormation,
        active, setActive,

        gk, defs, mids, fwds, benchGK, benchOut,

        captainId, setCaptainId,
        viceId, setViceId,

        // helpers
        defCount, midCount, fwdCount,
        onFormationApplied,
        occupantOf, setSlot, swapSlots,
        isStarter,
        starters, bench,          // handy to have
        assigned,
    };
}

// Drag compatibility helper (unchanged API)
export function isCompatibleDrag(a: ActiveSlot, b: ActiveSlot) {
    type Kind = 'GK' | 'OUT' | 'DEF' | 'MID' | 'FWD';
    const kind = (s: ActiveSlot): Kind =>
        s.type === 'GK' || s.type === 'BENCH_GK' ? 'GK' :
            s.type === 'BENCH_OUT' ? 'OUT' : s.type;

    const ka = kind(a), kb = kind(b);
    if (ka === 'GK') return kb === 'GK';
    if (ka === 'OUT') return kb === 'OUT' || kb === 'DEF' || kb === 'MID' || kb === 'FWD';
    if (ka === 'DEF' || ka === 'MID' || ka === 'FWD') return kb === 'OUT' || ka === kb;
    return false;
}
