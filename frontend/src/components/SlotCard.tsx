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

    const displayName = player ? (player.webName || player.lastName || `${player.firstName} ${player.lastName}`) : '';

    return (
        <div
            className={`player-card ${tint}`}
            onClick={onClick}
            draggable={!!player}
            onDragStart={() => onDragStart?.(slot)}
            onDragOver={(e) => onDragOver?.(slot, e)}
            onDrop={() => onDrop?.(slot)}
            title={player ? `${displayName}${team ? ` • ${team}` : ''} • £${player.price.toFixed(1)}m` : ''}
        >
            {player ? (
                <>
                    <div className="name">{displayName}</div>
                    <div className="meta">
                        <span className="meta-item">£{player.price.toFixed(1)}m</span>
                        {team && <span className="meta-item">{team}</span>}
                        <span className="chip">Form {player.form.toFixed(1)}</span>
                        {typeof player.selectedByPercent === 'number' && !Number.isNaN(player.selectedByPercent) && (
                            <span className="chip">{`Sel ${player.selectedByPercent.toFixed(1)}%`}</span>
                        )}
                    </div>

                    {/* Captain / Vice badges on starters only */}
                    {(isCaptain || isVice) && (
                        <div className="badge-cv">
                            {isCaptain && <span className="badge badge-c">C</span>}
                            {isVice && <span className="badge badge-v">V</span>}
                        </div>
                    )}

                    {(onToggleCaptain || onToggleVice) && (
                        <div className="cv-controls">
                            {onToggleCaptain && <button className="cv-btn" onClick={(e) => { e.stopPropagation(); onToggleCaptain(); }}>C</button>}
                            {onToggleVice && <button className="cv-btn" onClick={(e) => { e.stopPropagation(); onToggleVice(); }}>V</button>}
                        </div>
                    )}

                    <button className="x" onClick={(e) => { e.stopPropagation(); onRemove(); }}>×</button>
                </>
            ) : (
                <div className="placeholder">{label}</div>
            )}
        </div>
    );
}
