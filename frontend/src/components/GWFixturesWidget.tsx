import { useEffect, useMemo, useState } from 'react';
import type { Fixture, Team } from '../types/fpl';

type Props = {
    teams: Record<number, Team>;
    fixtures: Fixture[];
    side?: 'left' | 'right';       // default: right
    initialEvent?: number | 'auto'; // default: 'auto' (lowest upcoming)
};

export default function GWFixturesWidget({
    teams,
    fixtures,
    side = 'right',
    initialEvent = 'auto',
}: Props) {
    // All events we have, sorted
    const eventsSorted = useMemo(
        () => Array.from(new Set(fixtures.map(f => f.event).filter((x): x is number => x != null))).sort((a, b) => a - b),
        [fixtures]
    );

    // Choose default event:
    // - If initialEvent is a number, use it
    // - Else pick the lowest upcoming (not started/finished); fallback to lowest overall
    const defaultEvent = useMemo(() => {
        if (typeof initialEvent === 'number') return initialEvent;
        const upcoming = fixtures.filter(f => f.event != null && !f.finished && !f.started).map(f => f.event!) || [];
        if (upcoming.length) return Math.min(...upcoming);
        return eventsSorted.length ? eventsSorted[0] : null;
    }, [fixtures, eventsSorted, initialEvent]);

    const [event, setEvent] = useState<number | null>(defaultEvent);
    useEffect(() => setEvent(defaultEvent), [defaultEvent]);

    const fixturesOfEvent = useMemo(() => {
        if (event == null) return [];
        const time = (iso?: string | null) => (iso ? new Date(iso).getTime() : Number.MAX_SAFE_INTEGER);
        return fixtures
            .filter(f => f.event === event)
            .sort((a, b) => time(a.kickoff_time) - time(b.kickoff_time));
    }, [fixtures, event]);

    const idx = event == null ? -1 : eventsSorted.indexOf(event);
    const prevEvent = () => idx > 0 && setEvent(eventsSorted[idx - 1]);
    const nextEvent = () => idx >= 0 && idx < eventsSorted.length - 1 && setEvent(eventsSorted[idx + 1]);

    if (event == null) return null;

    const formatLocal = (iso?: string | null) =>
        iso
            ? new Date(iso).toLocaleString(undefined, {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
            })
            : 'TBD';

    return (
        <aside className={`gw-fixtures-widget ${side}`}>
            <div className="nfw-title-row">
                <div className="nfw-title">
                    Gameweek <strong>{event}</strong>
                </div>
                <div className="nfw-nav">
                    <button className="nfw-btn" onClick={prevEvent} disabled={idx <= 0} aria-label="Previous GW"><span>‹</span></button>
                    <span className="nfw-count">{idx + 1}/{eventsSorted.length}</span>
                    <button className="nfw-btn" onClick={nextEvent} disabled={idx === eventsSorted.length - 1} aria-label="Next GW"><span>›</span></button>
                </div>
            </div>

            <ul className="fixture-list">
                {fixturesOfEvent.map(f => {
                    const hn = teams[f.team_h]?.shortName || teams[f.team_h]?.name || `#${f.team_h}`;
                    const an = teams[f.team_a]?.shortName || teams[f.team_a]?.name || `#${f.team_a}`;
                    return (
                        <li key={f.id} className="fixture-row">
                            <div className="teams">
                                <span className={`team-chip fdr-${f.team_h_difficulty}`} >{hn}</span>
                                <span className="fixture-sep">—</span>
                                <span className={`team-chip fdr-${f.team_a_difficulty}`} >{an}</span>
                            </div>
                            <div className="kickoff">{formatLocal(f.kickoff_time)}</div>
                        </li>
                    );
                })}
                {fixturesOfEvent.length === 0 && <li className="muted">No fixtures for GW {event}</li>}
            </ul>
        </aside>
    );
}
