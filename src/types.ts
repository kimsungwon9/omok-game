export type Player = 'BLACK' | 'WHITE';

export type GameMode = 'human-vs-ai' | 'human-vs-human';

export type AIDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'master';

export interface CandidateEvaluationLog {
  move: Coordinate;
  staticScore: number;
  minimaxScore: number;
  pruned: boolean;
  pvPath: Coordinate[];
  reason: string;
}

export interface AIMoveTelemetry {
  move: Coordinate;
  difficulty: AIDifficulty;
  depth: number;
  candidateCount: number;
  nodesVisited: number;
  nodesTotalEstimated: number;
  prunedNodes: number;
  pruningRate: number; // percentage e.g. 89.2%
  timeMs: number;
  score: number;
  principalVariation: Coordinate[];
  candidateLogs?: CandidateEvaluationLog[];
}

export interface HumanMatchRecord {
  id: string;
  timestamp: number;
  difficulty: AIDifficulty;
  humanColor: Player;
  winner: Player | 'DRAW';
  movesCount: number;
  durationMs: number;
  avgAiNodes: number;
  avgAiTimeMs: number;
  maxAiTimeMs: number;
}

export interface AIDifficultyConfig {
  id: AIDifficulty;
  name: string;
  badge: string;
  depthDesc: string;
  targetDepth: number;
  description: string;
  winRateTarget: string;
}

export type CellValue = Player | null;

export interface Coordinate {
  row: number;
  col: number;
}

export interface MoveRecord {
  step: number;
  row: number;
  col: number;
  player: Player;
  timestamp: number;
}

export interface WinInfo {
  winner: Player;
  winningLine: Coordinate[];
  direction: 'horizontal' | 'vertical' | 'diagonal-main' | 'diagonal-anti';
}

export interface GameState {
  board: CellValue[][];
  currentPlayer: Player;
  winner: Player | null;
  winInfo: WinInfo | null;
  moveHistory: MoveRecord[];
  isGameOver: boolean;
}

export interface TestItem {
  id: string;
  step: number;
  stepTitle: string;
  description: string;
  expected: string;
  status: 'PASS' | 'FAIL' | 'PENDING';
  detail?: string;
}
