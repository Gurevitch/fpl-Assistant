import type { Team, Player } from '../types/fpl';
import { mapPos, normalizePrice, toNum } from '../utils/fpl';
import type { Fixture } from '../types/fpl';


export async function loadTeams(): Promise<Record<number, Team>> {
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
    return map;
}
export async function loadFixtures(): Promise<Fixture[]> {
    const res = await fetch('/v1/fixtures');
    if (!res.ok) return [];
    const rows: any[] = await res.json();
    return rows.map((f: any): Fixture => ({
        id: f.ID ?? f.id,
        event: f.Event ?? f.event ?? null,
        kickoff_time: (f.KickoffTime ?? f.kickoff_time ?? null),
        started: !!(f.Started ?? f.started),
        finished: !!(f.Finished ?? f.finished),
        team_a: f.TeamAID ?? f.team_a,
        team_h: f.TeamHID ?? f.team_h,
        team_a_difficulty: (f.TeamADifficulty ?? f.team_a_difficulty) as 1 | 2 | 3 | 4 | 5,
        team_h_difficulty: (f.TeamHDifficulty ?? f.team_h_difficulty) as 1 | 2 | 3 | 4 | 5,
    }));
}
export async function loadPlayers(): Promise<Player[]> {
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
        form: Number(p.Form ?? p.form ?? p.ValueForm ?? 0),
        selectedByPercent: toNum(p.SelectedByPercent ?? p.selectedByPercent),
        eventPoints: Number(p.event_points ?? p.eventPoints ?? 0),
    }));
    return list;
}

export async function importFPL(fullUrl = 'http://localhost:8080/v1/admin/import-fpl') {
    let res = await fetch(fullUrl, { method: 'POST' });
    if (!res.ok) res = await fetch(fullUrl); // GET fallback
    if (!res.ok) throw new Error(`Import failed: HTTP ${res.status}`);
}
