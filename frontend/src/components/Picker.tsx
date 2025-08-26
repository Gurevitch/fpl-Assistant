import { useMemo, useState } from 'react';
import type { ActiveSlot, Player, Team } from '../types/fpl';
import { scoreOf } from '../utils/fpl';

type Props = {
    active: ActiveSlot | null;
    pool: Player[];
    teams: Record<number, Team>;
    canAssign: (slot: ActiveSlot, p: Player) => boolean;
    onPick: (p: Player) => void;
};

export default function Picker({ active, pool, teams, canAssign, onPick }: Props) {
    // ---- filters / UI state ----
    const [query, setQuery] = useState('');
    const [teamId, setTeamId] = useState<number | 'all'>('all');
    const [maxPrice, setMaxPrice] = useState<number | ''>('');
    const [minForm, setMinForm] = useState<number | ''>('');
    const [sort, setSort] = useState<'xp' | 'form' | 'priceAsc' | 'priceDesc'>('xp');

    // show all players & show only eligible toggles
    const [allPositions, setAllPositions] = useState(false);
    const [eligibleOnly, setEligibleOnly] = useState(true);

    const resetFilters = () => {
        setQuery('');
        setTeamId('all');
        setMaxPrice('');
        setMinForm('');
        setSort('xp');
        setAllPositions(false);
        setEligibleOnly(true);
    };

    // ---- helpers ----
    const nameAndTeamMatch = (p: Player, q: string) => {
        if (!q) return true;
        const t = teams[p.teamId];
        const hay = [
            p.webName || p.lastName || '',
            p.firstName || '',
            p.lastName || '',
            t?.shortName || '',
            t?.name || '',
        ].join(' ').toLowerCase();
        return hay.includes(q.toLowerCase());
    };

    const matchesPositionForSlot = (p: Player): boolean => {
        if (!active) return false;
        if (active.type === 'GK' || active.type === 'BENCH_GK') return p.position === 'GK';
        if (active.type === 'DEF') return p.position === 'DEF';
        if (active.type === 'MID') return p.position === 'MID';
        if (active.type === 'FWD') return p.position === 'FWD';
        // bench out: any outfielder
        return p.position !== 'GK';
    };

    // build full team list (all known teams, alpha)
    const teamOptions = useMemo(() => {
        return Object.values(teams)
            .sort((a, b) => (a.shortName || a.name).localeCompare(b.shortName || b.name))
            .map(t => t.id);
    }, [teams]);

    // ---- compute candidates ----
    const candidates = useMemo(() => {
        if (!active) return [];

        const base = pool
            .filter(p => (allPositions ? true : matchesPositionForSlot(p)))
            .filter(p => (teamId === 'all' ? true : p.teamId === teamId))
            .filter(p => nameAndTeamMatch(p, query))
            .filter(p => (maxPrice === '' ? true : p.price <= maxPrice))
            .filter(p => (minForm === '' ? true : p.form >= minForm));

        base.sort((a, b) => {
            if (sort === 'xp') return scoreOf(b) - scoreOf(a);
            if (sort === 'form') return b.form - a.form;
            if (sort === 'priceAsc') return a.price - b.price;
            return b.price - a.price; // priceDesc
        });

        // If "eligible only", hide ineligible; otherwise keep them (disabled)
        if (eligibleOnly) {
            return base.filter(p => canAssign(active, p));
        }
        return base;
    }, [active, pool, allPositions, teamId, query, maxPrice, minForm, sort, eligibleOnly, teams]);

    if (!active) {
        return <div className="picker-hint"></div>;
    }

    return (
        <div className="picker">
            <div className="picker-title">
                <div>
                    Pick {active.type === 'BENCH_OUT' ? 'Outfield Sub' : active.type.replace('_', ' ')}
                </div>

                <div className="filters">
                    <input
                        placeholder="Search name or team…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />

                    <select
                        value={teamId}
                        onChange={e => setTeamId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        title="Filter by team"
                    >
                        <option value="all">All teams</option>
                        {teamOptions.map(id => (
                            <option key={id} value={id}>
                                {teams[id].shortName || teams[id].name}
                            </option>
                        ))}
                    </select>

                    <input
                        type="number"
                        step="0.1"
                        placeholder="Max £m"
                        value={maxPrice}
                        onChange={e => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        title="Maximum price"
                    />

                    <input
                        type="number"
                        step="0.1"
                        placeholder="Min form"
                        value={minForm}
                        onChange={e => setMinForm(e.target.value === '' ? '' : Number(e.target.value))}
                        title="Minimum recent form"
                    />

                    <select value={sort} onChange={e => setSort(e.target.value as any)}>
                        <option value="xp">Best (xP/Form)</option>
                        <option value="form">Form</option>
                        <option value="priceAsc">Cheapest</option>
                        <option value="priceDesc">Most Expensive</option>
                    </select>

                    <label className="toggle">
                        <input
                            type="checkbox"
                            checked={allPositions}
                            onChange={e => setAllPositions(e.target.checked)}
                        />
                        All positions
                    </label>

                    <label className="toggle">
                        <input
                            type="checkbox"
                            checked={eligibleOnly}
                            onChange={e => setEligibleOnly(e.target.checked)}
                        />
                        Eligible only
                    </label>

                    <button className="btn ghost" onClick={resetFilters}>Reset</button>
                </div>
            </div>

            <div className="available-grid">
                {candidates.map(p => {
                    const t = teams[p.teamId]?.shortName || teams[p.teamId]?.name || '';
                    // If eligibleOnly=false, still disable players that can’t be assigned
                    const disabled = !canAssign(active, p);
                    return (
                        <button
                            key={p.id}
                            className={`avail-card ${disabled ? 'disabled' : ''}`}
                            onClick={() => { if (!disabled) onPick(p); }}
                            disabled={disabled}
                            title={`${p.webName || p.lastName}${t ? ` • ${t}` : ''} • £${p.price.toFixed(1)}m`}
                        >
                            <div className="avail-name">{p.webName || p.lastName}</div>
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
        </div>
    );
}
