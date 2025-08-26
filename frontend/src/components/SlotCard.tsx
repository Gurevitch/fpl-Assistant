import type { ActiveSlot, Player } from '../types/fpl';

type Props = {
    slot: ActiveSlot;
    player: Player | null;
    tint: 'gk' | 'def' | 'mid' | 'fwd' | 'bench';
    label: string;
    team: string;
    isCaptain?: boolean;
    isVice?: boolean;
    onClick: () => void;
    onRemove: () => void;
    onToggleCaptain?: () => void;
    onToggleVice?: () => void;
    // drag & drop
    onDragStart?: (slot: ActiveSlot) => void;
    onDrop?: (slot: ActiveSlot) => void;
    onDragOver?: (slot: ActiveSlot, e: React.DragEvent) => void;
};

export default function SlotCard({
    slot, player, tint, label, team,
    isCaptain, isVice, onClick, onRemove,
    onToggleCaptain, onToggleVice,
    onDragStart, onDrop, onDragOver,
}: Props) {
    const displayName = player
        ? (player.webName || player.lastName || `${player.firstName} ${player.lastName}`)
        : '';

    // NEW: tooltip that includes GW points
    const title = player
        ? `${displayName}${team ? ` • ${team}` : ''} • £${player.price.toFixed(1)}m • Pts ${player.eventPoints}`
        : '';

    return (
        <div
            className={`player-card ${tint}`}
            onClick={onClick}
            title={title}                            // ← use the computed title
            draggable={!!player}                     // ← only draggable when there’s a player
            onDragStart={() => onDragStart?.(slot)}
            onDrop={() => onDrop?.(slot)}
            onDragOver={(e) => onDragOver?.(slot, e)}
        >
            {player ? (
                <>
                    {isCaptain && <span className="cap-badge">C</span>}
                    {!isCaptain && isVice && <span className="vice-badge">V</span>}

                    <div className="name">{displayName}</div>

                    <div className="meta">
                        <span className="meta-item">£{player.price.toFixed(1)}m</span>
                        {team && <span className="meta-item">{team}</span>}
                        <span className="chip">GW {player.eventPoints}</span>
                        {Number.isFinite(player.form as number) && (
                            <span className="chip">Form {player.form.toFixed(1)}</span>
                        )}
                        {Number.isFinite(player.selectedByPercent as number) && (
                            <span className="chip">Sel {player.selectedByPercent!.toFixed(1)}%</span>
                        )}
                    </div>

                    {(onToggleCaptain || onToggleVice) && (    // ← show only for starters
                        <div className="cap-row" onClick={(e) => e.stopPropagation()}>
                            <button
                                className={`cap-btn ${isCaptain ? 'active' : ''}`}
                                disabled={!onToggleCaptain}
                                onClick={() => onToggleCaptain?.()}
                                title="Set as Captain"
                            >
                                C
                            </button>
                            <button
                                className={`cap-btn ${isVice ? 'active' : ''}`}
                                disabled={!onToggleVice}
                                onClick={() => onToggleVice?.()}
                                title="Set as Vice-Captain"
                            >
                                V
                            </button>
                        </div>
                    )}

                    <button
                        className="x"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove?.();
                        }}
                        title="Remove"
                    >
                        ×
                    </button>
                </>
            ) : (
                <div className="placeholder">{label}</div>
            )}
        </div>
    );


}
