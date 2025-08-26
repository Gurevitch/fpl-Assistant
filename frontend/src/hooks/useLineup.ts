// src/hooks/useLineup.ts
import { useMemo, useState } from 'react';
import type { ActiveSlot, Formation, Player } from '../types/fpl';

export function useLineup() {
    const [formation, setFormation] = useState<Formation>('4-3-3');
    const [active, setActive] = useState<ActiveSlot | null>(null);

    const [gk, setGK] = useState<(Player | null)[]>([null]);
    const [defs, setDefs] = useState<(Player | null)[]>([null, null, null, null, null]);
    const [mids, setMids] = useState<(Player | null)[]>([null, null, null, null, null]);
    const [fwds, setFwds] = useState<(Player | null)[]>([null, null, null]);
    const [benchGK, setBenchGK] = useState<Player | null>(null);
    const [benchOut, setBenchOut] = useState<(Player | null)[]>([null, null, null]);

    const [captainId, setCaptainId] = useState<number | null>(null);
    const [viceId, setViceId] = useState<number | null>(null);

    const [defCount, midCount, fwdCount] = useMemo(() => {
        const [d, m, f] = formation.split('-').map(n => parseInt(n, 10));
        return [d, m, f];
    }, [formation]);

    const ensureSize = (arr: (Player | null)[], size: number) =>
        arr.slice(0, size).concat(Array(Math.max(0, size - arr.length)).fill(null));

    const onFormationApplied = () => {
        setDefs(prev => ensureSize(prev, defCount));
        setMids(prev => ensureSize(prev, midCount));
        setFwds(prev => ensureSize(prev, fwdCount));
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

    const swapSlots = (a: ActiveSlot, b: ActiveSlot) => {
        const A = occupantOf(a);
        const B = occupantOf(b);
        setSlot(a, B ?? null);
        setSlot(b, A ?? null);
    };

    const assigned = useMemo(() => {
        const arr: (Player | null)[] = [
            ...gk, ...defs.slice(0, defCount), ...mids.slice(0, midCount), ...fwds.slice(0, fwdCount),
            benchGK, ...benchOut
        ];
        return arr.filter(Boolean) as Player[];
    }, [gk, defs, mids, fwds, benchGK, benchOut, defCount, midCount, fwdCount]);

    return {
        formation, setFormation,
        active, setActive,
        gk, defs, mids, fwds, benchGK, benchOut,
        captainId, setCaptainId, viceId, setViceId,
        defCount, midCount, fwdCount, onFormationApplied,
        occupantOf, setSlot, swapSlots,
        assigned,
    };
}

export function isCompatibleDrag(a: ActiveSlot, b: ActiveSlot) {
    const kind = (s: ActiveSlot) =>
        s.type === 'GK' || s.type === 'BENCH_GK' ? 'GK' :
            s.type === 'BENCH_OUT' ? 'OUT' : s.type;
    const ka = kind(a), kb = kind(b);
    if (ka === 'GK') return kb === 'GK';
    if (ka === 'OUT') return kb === 'OUT' || kb === 'DEF' || kb === 'MID' || kb === 'FWD';
    if (ka === 'DEF' || ka === 'MID' || ka === 'FWD') return kb === 'OUT' || ka === kb;
    return false;
}
