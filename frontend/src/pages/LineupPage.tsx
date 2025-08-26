import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './LineupPage.css';
import type { ActiveSlot, Formation, Player, Team } from '../types/fpl';
import { ALLOWED_FORMATIONS, scoreOf } from '../utils/fpl';
import { importFPL, loadPlayers, loadTeams } from '../api/fpl';
import { isCompatibleDrag, useLineup } from '../hooks/useLineup';
import Pitch from '../components/Pitch';
import Picker from '../components/Picker';

export default function LineupPage() {
    const [teams, setTeams] = useState<Record<number, Team>>({});
    const [pool, setPool] = useState<Player[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<'idle' | 'ok' | 'error'>('idle');

    // lineup state (formation, slots, captain/vice, active slot)
    const L = useLineup();

    // load data
    const refresh = useCallback(async () => {
        const [t, p] = await Promise.all([loadTeams(), loadPlayers()]);
        p.sort((a, b) => scoreOf(b) - scoreOf(a));
        setTeams(t); setPool(p);
    }, []);
    useEffect(() => { refresh().catch(() => { }); }, [refresh]);

    // keep rows sized to formation
    useEffect(() => { L.onFormationApplied(); }, [L.defCount, L.midCount, L.fwdCount]); // eslint-disable-line

    // derived
    const assigned = L.assigned;
    const selectedIds = useMemo(() => new Set(assigned.map(p => p.id)), [assigned]);
    const clubCount = useMemo(() => {
        const cc: Record<number, number> = {};
        for (const p of assigned) cc[p.teamId] = (cc[p.teamId] || 0) + 1;
        return cc;
    }, [assigned]);
    const totalCost = assigned.reduce((s, p) => s + p.price, 0);
    const budgetLeft = Math.max(0, Math.round((100 - totalCost) * 10) / 10);

    // constraints
    const occupantOf = L.occupantOf;
    const canAssign = (slot: ActiveSlot, p: Player) => {
        // position check is implied by Picker, but keep it for safety:
        if (slot.type === 'GK' && p.position !== 'GK') return false;
        if (slot.type === 'DEF' && p.position !== 'DEF') return false;
        if (slot.type === 'MID' && p.position !== 'MID') return false;
        if (slot.type === 'FWD' && p.position !== 'FWD') return false;
        if (slot.type === 'BENCH_GK' && p.position !== 'GK') return false;
        if (slot.type === 'BENCH_OUT' && p.position === 'GK') return false;

        const occ = occupantOf(slot);
        if (selectedIds.has(p.id) && (!occ || occ.id !== p.id)) return false;

        const refund = occ ? occ.price : 0;
        if (totalCost - refund + p.price > 100.0 + 1e-9) return false;

        const countThisTeam = (clubCount[p.teamId] || 0) - (occ && occ.teamId === p.teamId ? 1 : 0);
        if (countThisTeam >= 3) return false;

        return true;
    };

    // pick handler from picker
    const onPick = (p: Player) => {
        if (!L.active) return;
        if (!canAssign(L.active, p)) return;
        L.setSlot(L.active, p);
        L.setActive(null);
    };

    // drag & drop (HTML5)
    const dragFrom = useRef<ActiveSlot | null>(null);
    const onDragStart = (s: ActiveSlot) => { dragFrom.current = s; };
    const onDragOver = (_slot: ActiveSlot, e: React.DragEvent) => {
        void _slot;           // mark as intentionally unused
        e.preventDefault();
    };
    const onDrop = (target: ActiveSlot) => {
        const src = dragFrom.current;
        dragFrom.current = null;
        if (!src) return;
        if (!isCompatibleDrag(src, target)) return;
        // if same type/pos we can swap; if moving into empty or replacing, ensure constraints for both ends
        const srcP = L.occupantOf(src);
        const tgtP = L.occupantOf(target);
        if (!srcP) return;
        // if replacing target with srcP, ensure allowed
        if (!canAssign(target, srcP)) return;
        // if swapping and target has player, ensure src slot can take tgtP
        if (tgtP && !canAssign(src, tgtP)) return;
        L.swapSlots(src, target);
    };

    // update button
    const runUpdate = useCallback(async () => {
        try {
            setIsUpdating(true); setUpdateStatus('idle');
            await importFPL();          // http://localhost:8080/v1/admin/import-fpl
            await refresh();
            setUpdateStatus('ok');
        } catch {
            setUpdateStatus('error');
        } finally {
            setIsUpdating(false);
        }
    }, [refresh]);

    const teamOf = (p: Player | null) => (p ? (teams[p.teamId]?.shortName || teams[p.teamId]?.name || '') : '');
    const isStarter = (p: Player | null) => {
        if (!p) return false;
        const starters = new Set([
            ...L.gk, ...L.defs.slice(0, L.defCount), ...L.mids.slice(0, L.midCount), ...L.fwds.slice(0, L.fwdCount)
        ].filter(Boolean).map((x: any) => x.id));
        return starters.has(p.id);
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
                    <select value={L.formation} onChange={e => L.setFormation(e.target.value as Formation)}>
                        {ALLOWED_FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>

                    <button className="btn" onClick={runUpdate} disabled={isUpdating}>
                        {isUpdating ? 'Updating…' : 'Update'}
                    </button>
                    {updateStatus === 'ok' && <span className="chip" title="Latest data loaded">Updated</span>}
                    {updateStatus === 'error' && <span className="chip" title="Import failed">Update failed</span>}
                </div>
            </div>

            <Pitch
                defCount={L.defCount} midCount={L.midCount} fwdCount={L.fwdCount}
                occupantOf={L.occupantOf}
                setActive={L.setActive}
                removeFromSlot={(s) => L.setSlot(s, null)}
                teamOf={teamOf}
                isStarter={isStarter}
                captainId={L.captainId}
                viceId={L.viceId}
                setCaptainId={L.setCaptainId}
                setViceId={L.setViceId}
                onDragStart={onDragStart}
                onDrop={onDrop}
                onDragOver={onDragOver}
            />

            <Picker
                active={L.active}
                pool={pool}
                teams={teams}
                canAssign={canAssign}
                onPick={onPick}
            />
        </div>
    );
}
