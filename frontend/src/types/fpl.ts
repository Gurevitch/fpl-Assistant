export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';
export type Formation = '4-5-1' | '5-4-1' | '3-5-2' | '4-4-2' | '5-3-2' | '3-4-3' | '4-3-3';

export interface Team {
    id: number;
    name: string;
    shortName: string;
    code: string;
}

export interface Player {
    id: number;
    firstName: string;
    lastName: string;
    webName: string;
    position: Position;
    teamId: number;
    price: number;                // £m
    expectedPoints?: number;
    form: number;                 // required (we parse from backend)
    selectedByPercent?: number;
    eventPoints: number;
}

export type ActiveSlot =
    | { type: 'GK'; index: 0 }
    | { type: 'DEF'; index: number }
    | { type: 'MID'; index: number }
    | { type: 'FWD'; index: number }
    | { type: 'BENCH_GK'; index: 0 }
    | { type: 'BENCH_OUT'; index: number };
