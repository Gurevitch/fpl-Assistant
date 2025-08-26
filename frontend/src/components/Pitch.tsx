import type { ActiveSlot, Player } from '../types/fpl';
import SlotCard from './SlotCard';

type Props = {
    defCount: number; midCount: number; fwdCount: number;
    // accessors
    occupantOf: (s: ActiveSlot) => Player | null;
    setActive: (s: ActiveSlot) => void;
    removeFromSlot: (s: ActiveSlot) => void;
    teamOf: (p: Player | null) => string;
    // captain/vice
    isStarter: (p: Player | null) => boolean;
    captainId: number | null;
    viceId: number | null;
    setCaptainId: (id: number) => void;
    setViceId: (id: number) => void;
    // drag & drop
    onDragStart: (s: ActiveSlot) => void;
    onDrop: (s: ActiveSlot) => void;
    onDragOver: (s: ActiveSlot, e: React.DragEvent) => void;
};

export default function Pitch({
    defCount, midCount, fwdCount,
    occupantOf, setActive, removeFromSlot, teamOf,
    isStarter, captainId, viceId, setCaptainId, setViceId,
    onDragStart, onDrop, onDragOver,
}: Props) {

    const render = (slot: ActiveSlot, tint: 'gk' | 'def' | 'mid' | 'fwd' | 'bench', label: string) => {
        const p = occupantOf(slot);
        const team = teamOf(p);
        const starter = isStarter(p);
        const isC = starter && !!p && p.id === captainId;
        const isV = starter && !!p && p.id === viceId;

        return (
            <SlotCard
                key={`${slot.type}-${slot.index}`}
                slot={slot}
                player={p}
                tint={tint}
                label={label}
                team={team}
                isCaptain={isC}
                isVice={isV}
                onClick={() => setActive(slot)}
                onRemove={() => removeFromSlot(slot)}
                onToggleCaptain={starter && p ? () => setCaptainId(p.id) : undefined}
                onToggleVice={starter && p ? () => setViceId(p.id) : undefined}
                onDragStart={onDragStart}
                onDrop={onDrop}
                onDragOver={onDragOver}
            />
        );
    };

    return (
        <div className="lineup">
            <div className="row one">
                {render({ type: 'GK', index: 0 }, 'gk', 'GK')}
            </div>

            <div className="row" style={{ gridTemplateColumns: `repeat(${defCount}, 1fr)` }}>
                {Array.from({ length: defCount }).map((_, i) =>
                    render({ type: 'DEF', index: i }, 'def', 'DEF')
                )}
            </div>

            <div className="row" style={{ gridTemplateColumns: `repeat(${midCount}, 1fr)` }}>
                {Array.from({ length: midCount }).map((_, i) =>
                    render({ type: 'MID', index: i }, 'mid', 'MID')
                )}
            </div>

            <div className="row" style={{ gridTemplateColumns: `repeat(${fwdCount}, 1fr)` }}>
                {Array.from({ length: fwdCount }).map((_, i) =>
                    render({ type: 'FWD', index: i }, 'fwd', 'FWD')
                )}
            </div>

            {/* Bench */}
            <div className="bench">
                <h3>Bench</h3>
                <div className="bench-strip">
                    {render({ type: 'BENCH_GK', index: 0 }, 'gk', 'GK')}
                    {Array.from({ length: 3 }).map((_, i) =>
                        render({ type: 'BENCH_OUT', index: i }, 'bench', 'SUB')
                    )}
                </div>
            </div>
        </div>
    );
}
