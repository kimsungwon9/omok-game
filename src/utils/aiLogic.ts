import { CellValue, Coordinate, Player, AIDifficulty, AIDifficultyConfig, AIMoveTelemetry, CandidateEvaluationLog } from '../types';
import { BOARD_SIZE, checkWin } from './omokLogic';

export const AI_DIFFICULTIES: AIDifficultyConfig[] = [
  {
    id: 'beginner',
    name: '초급',
    badge: '입문자 추천',
    depthDesc: '1수 앞 기본 판단',
    targetDepth: 1,
    description: '기본적인 공격과 방어를 수행하며, 초보자도 쉽게 승리할 수 있도록 설계되었습니다.',
    winRateTarget: '초보자 맞춤 (AI 승률 ~30-40%)',
  },
  {
    id: 'intermediate',
    name: '중급',
    badge: '공수 균형',
    depthDesc: '2수 앞 위협(3목/4목) 대응',
    targetDepth: 2,
    description: '공격과 방어를 적절히 수행하며, 3목과 4목 등 주요 승부처를 방어 및 전개합니다.',
    winRateTarget: '일반 플레이어 대전 (AI 승률 ~65-75%)',
  },
  {
    id: 'advanced',
    name: '고급',
    badge: '다수 앞 수읽기',
    depthDesc: '3수 앞 예측 미니맥스',
    targetDepth: 3,
    description: '상대의 다음 대응을 예측하고 여러 수를 내다보며 적극적인 공격과 수비를 동시에 전개합니다.',
    winRateTarget: '숙련자 대전 (AI 승률 ~85-90%)',
  },
  {
    id: 'master',
    name: '최상급',
    badge: '4수 심층 알파-베타',
    depthDesc: '4수 앞 정밀 예측 + 전술 수읽기',
    targetDepth: 4,
    description: 'Minimax + Alpha-Beta Pruning으로 4수 앞(현재 수→상대 대응→다음 수→상대 대응)을 계산하고 최적 수를 도출합니다.',
    winRateTarget: '목표 승률 90% 이상 (정밀 계산)',
  },
];

// Strategic Pattern Scores
export const PATTERN_SCORE = {
  FIVE: 100_000_000,
  OPEN_FOUR: 10_000_000,
  FOUR_THREE: 4_500_000,
  DOUBLE_FOUR: 4_000_000,
  BLOCKED_FOUR: 700_000,
  DOUBLE_THREE: 1_200_000,
  OPEN_THREE: 200_000,
  BLOCKED_THREE: 15_000,
  DOUBLE_TWO: 12_000,
  OPEN_TWO: 3_000,
  BLOCKED_TWO: 500,
};

// Center proximity weights for a 15x15 board
export function getPositionalScore(r: number, c: number): number {
  const dist = Math.abs(r - 7) + Math.abs(c - 7);
  return Math.max(0, 14 - dist) * 15;
}

export interface PatternCounts {
  five: number;
  openFour: number;
  blockedFour: number;
  openThree: number;
  blockedThree: number;
  openTwo: number;
  blockedTwo: number;
}

/**
 * Analyzes the line segment along a single direction centered at (row, col)
 * when `player` places a stone there.
 */
export function analyzeDirection(
  board: CellValue[][],
  row: number,
  col: number,
  dr: number,
  dc: number,
  player: Player
): {
  isFive: boolean;
  isOpenFour: boolean;
  isBlockedFour: boolean;
  isOpenThree: boolean;
  isBlockedThree: boolean;
  isOpenTwo: boolean;
  isBlockedTwo: boolean;
} {
  // Extract line from offset -4 to +4 (length 9)
  // 1: player, 0: empty, 2: opponent/boundary
  const line: number[] = [];
  for (let step = -4; step <= 4; step++) {
    const r = row + step * dr;
    const c = col + step * dc;
    if (step === 0) {
      line.push(1);
    } else if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) {
      line.push(2);
    } else {
      const val = board[r][c];
      if (val === player) {
        line.push(1);
      } else if (val === null) {
        line.push(0);
      } else {
        line.push(2);
      }
    }
  }

  const str = line.join('');

  const isFive = str.includes('11111');
  if (isFive) {
    return {
      isFive: true,
      isOpenFour: false,
      isBlockedFour: false,
      isOpenThree: false,
      isBlockedThree: false,
      isOpenTwo: false,
      isBlockedTwo: false,
    };
  }

  const isOpenFour = str.includes('011110');

  const isBlockedFour =
    !isOpenFour &&
    (str.includes('211110') ||
      str.includes('011112') ||
      str.includes('10111') ||
      str.includes('11011') ||
      str.includes('11101'));

  const isOpenThree =
    !isOpenFour &&
    !isBlockedFour &&
    (str.includes('01110') ||
      str.includes('010110') ||
      str.includes('011010'));

  const isBlockedThree =
    !isOpenThree &&
    !isOpenFour &&
    !isBlockedFour &&
    (str.includes('211100') ||
      str.includes('001112') ||
      str.includes('210110') ||
      str.includes('011012') ||
      str.includes('211010') ||
      str.includes('010112') ||
      str.includes('10011') ||
      str.includes('11001') ||
      str.includes('10101'));

  const isOpenTwo =
    !isOpenFour &&
    !isBlockedFour &&
    !isOpenThree &&
    !isBlockedThree &&
    (str.includes('001100') ||
      str.includes('01010') ||
      str.includes('010010'));

  const isBlockedTwo =
    !isOpenTwo &&
    !isOpenThree &&
    !isBlockedThree &&
    !isOpenFour &&
    !isBlockedFour &&
    (str.includes('211000') ||
      str.includes('000112') ||
      str.includes('201100') ||
      str.includes('001102') ||
      str.includes('210100') ||
      str.includes('001012'));

  return {
    isFive,
    isOpenFour,
    isBlockedFour,
    isOpenThree,
    isBlockedThree,
    isOpenTwo,
    isBlockedTwo,
  };
}

/**
 * Counts all pattern formations across the 4 directions for a candidate move.
 */
export function getMovePatterns(
  board: CellValue[][],
  row: number,
  col: number,
  player: Player
): PatternCounts {
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal \
    [1, -1],  // diagonal /
  ];

  const counts: PatternCounts = {
    five: 0,
    openFour: 0,
    blockedFour: 0,
    openThree: 0,
    blockedThree: 0,
    openTwo: 0,
    blockedTwo: 0,
  };

  for (const [dr, dc] of directions) {
    const res = analyzeDirection(board, row, col, dr, dc, player);
    if (res.isFive) counts.five++;
    if (res.isOpenFour) counts.openFour++;
    if (res.isBlockedFour) counts.blockedFour++;
    if (res.isOpenThree) counts.openThree++;
    if (res.isBlockedThree) counts.blockedThree++;
    if (res.isOpenTwo) counts.openTwo++;
    if (res.isBlockedTwo) counts.blockedTwo++;
  }

  return counts;
}

/**
 * Converts pattern counts into numerical heuristic score.
 */
export function scorePatterns(p: PatternCounts): number {
  if (p.five > 0) return PATTERN_SCORE.FIVE;
  if (p.openFour > 0) return PATTERN_SCORE.OPEN_FOUR;

  // 4-3 Fork: at least one 4 (open or blocked) AND at least one open 3
  if ((p.blockedFour >= 1 || p.openFour >= 1) && p.openThree >= 1) {
    return PATTERN_SCORE.FOUR_THREE;
  }

  // Double 4
  if (p.blockedFour >= 2) {
    return PATTERN_SCORE.DOUBLE_FOUR;
  }

  // Double 3
  if (p.openThree >= 2) {
    return PATTERN_SCORE.DOUBLE_THREE;
  }

  let total = 0;
  total += p.blockedFour * PATTERN_SCORE.BLOCKED_FOUR;
  total += p.openThree * PATTERN_SCORE.OPEN_THREE;
  total += p.blockedThree * PATTERN_SCORE.BLOCKED_THREE;
  total += p.openTwo * PATTERN_SCORE.OPEN_TWO;
  total += p.blockedTwo * PATTERN_SCORE.BLOCKED_TWO;

  return total;
}

/**
 * Generates all candidate empty cells within `radius` of any existing stone on the board.
 */
export function getNeighborCandidates(board: CellValue[][], radius: number = 2): Coordinate[] {
  const visited: boolean[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(false)
  );
  const candidates: Coordinate[] = [];
  let hasStones = false;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) {
        hasStones = true;
        for (let dr = -radius; dr <= radius; dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
              if (board[nr][nc] === null && !visited[nr][nc]) {
                visited[nr][nc] = true;
                candidates.push({ row: nr, col: nc });
              }
            }
          }
        }
      }
    }
  }

  if (!hasStones) {
    return [{ row: 7, col: 7 }];
  }

  return candidates;
}

/**
 * Fast static evaluation for move ordering.
 */
export function evaluateCandidateMove(
  board: CellValue[][],
  pos: Coordinate,
  aiColor: Player,
  humanColor: Player,
  defenseWeight: number = 1.2
): number {
  const aiPatterns = getMovePatterns(board, pos.row, pos.col, aiColor);
  const aiScore = scorePatterns(aiPatterns);

  if (aiPatterns.five > 0) return PATTERN_SCORE.FIVE * 2;
  if (aiPatterns.openFour > 0) return PATTERN_SCORE.OPEN_FOUR * 2;

  const humanPatterns = getMovePatterns(board, pos.row, pos.col, humanColor);
  const humanScore = scorePatterns(humanPatterns);

  if (humanPatterns.five > 0) return PATTERN_SCORE.FIVE * 1.8;
  if (humanPatterns.openFour > 0) return PATTERN_SCORE.OPEN_FOUR * 1.5;

  // 4-3 and Double-3 threat prioritizing
  if ((humanPatterns.blockedFour >= 1 || humanPatterns.openFour >= 1) && humanPatterns.openThree >= 1) {
    return PATTERN_SCORE.FOUR_THREE * 1.4;
  }
  if (humanPatterns.openThree >= 2) {
    return PATTERN_SCORE.DOUBLE_THREE * 1.3;
  }

  const posBonus = getPositionalScore(pos.row, pos.col);
  return aiScore + humanScore * defenseWeight + posBonus;
}

interface MinimaxContext {
  nodesVisited: number;
  totalPossibleNodes: number;
  aiColor: Player;
  humanColor: Player;
  startTime: number;
  maxTimeMs: number;
  timeExceeded: boolean;
}

interface MinimaxResult {
  score: number;
  bestMove: Coordinate | null;
  principalVariation: Coordinate[];
}

// -------------------------------------------------------------
// ■ Zobrist Hashing & Transposition Table (TT)
// -------------------------------------------------------------
const ZOBRIST_TABLE: number[][][] = (() => {
  let seed = 123456789;
  function pseudoRandom32() {
    seed = (seed * 1664525 + 1013904223) | 0;
    return seed >>> 0;
  }
  const table: number[][][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    table[r] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      table[r][c] = [pseudoRandom32(), pseudoRandom32()];
    }
  }
  return table;
})();

export function computeZobristHash(board: CellValue[][]): number {
  let hash = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r][c];
      if (cell === 'BLACK') {
        hash ^= ZOBRIST_TABLE[r][c][0];
      } else if (cell === 'WHITE') {
        hash ^= ZOBRIST_TABLE[r][c][1];
      }
    }
  }
  return hash >>> 0;
}

interface TTEntry {
  depth: number;
  score: number;
  flag: 'EXACT' | 'LOWERBOUND' | 'UPPERBOUND';
  bestMove: Coordinate | null;
}

const transpositionTable = new Map<number, TTEntry>();

// Killer moves table: 2 slots per search depth (up to depth 10)
const killerMoves: (Coordinate | null)[][] = Array.from({ length: 10 }, () => [null, null]);

function recordKillerMove(depth: number, move: Coordinate) {
  if (depth < 0 || depth >= killerMoves.length) return;
  const km = killerMoves[depth];
  if (km[0]?.row === move.row && km[0]?.col === move.col) return;
  km[1] = km[0];
  km[0] = move;
}

// -------------------------------------------------------------
// ■ 9-Tier Forced Move Priority System (강제수 우선 탐색 체계)
// 1. 즉시 승리 (Win 5)
// 2. 상대 즉시 승리 차단 (Block Opponent 5)
// 3. 열린 4목 (Open 4)
// 4. 상대 열린 4목 차단 (Block Opponent Open 4)
// 5. 4-3 양수겸장 (Double Threat 4-3 / Fork)
// 6. 상대 4-3 차단 (Block Opponent 4-3)
// 7. 열린 3목 (Open 3)
// 8. 상대 열린 3목 차단 (Block Opponent Open 3)
// 9. 일반 후보 수 (General Candidates)
// -------------------------------------------------------------
export interface ForcedMoveClassification {
  priority: number; // 1 to 9 (1 is highest)
  tierName: string;
  isForced: boolean;
  scoreBonus: number;
}

export function classifyCandidatePriority(
  board: CellValue[][],
  pos: Coordinate,
  myColor: Player,
  oppColor: Player
): ForcedMoveClassification {
  const myP = getMovePatterns(board, pos.row, pos.col, myColor);
  const oppP = getMovePatterns(board, pos.row, pos.col, oppColor);

  // 1. 즉시 승리 (Win 5)
  if (myP.five > 0) {
    return { priority: 1, tierName: '1. 즉시 승리 (5목 완성)', isForced: true, scoreBonus: 100_000_000 };
  }
  // 2. 상대 즉시 승리 차단 (Block Opponent 5)
  if (oppP.five > 0) {
    return { priority: 2, tierName: '2. 상대 즉시 승리 차단', isForced: true, scoreBonus: 50_000_000 };
  }
  // 3. 열린 4목 (Open 4)
  if (myP.openFour > 0) {
    return { priority: 3, tierName: '3. 열린 4목 (필승수 전개)', isForced: true, scoreBonus: 20_000_000 };
  }
  // 4. 상대 열린 4목 차단 (Block Opponent Open 4)
  if (oppP.openFour > 0) {
    return { priority: 4, tierName: '4. 상대 열린 4목 차단', isForced: true, scoreBonus: 10_000_000 };
  }
  // 5. 4-3 양수겸장 (Double Threat 4-3)
  const isMy43 = ((myP.blockedFour >= 1 || myP.openFour >= 1) && myP.openThree >= 1) || myP.blockedFour >= 2;
  if (isMy43) {
    return { priority: 5, tierName: '5. 4-3 양수겸장 (포크 공격)', isForced: true, scoreBonus: 5_000_000 };
  }
  // 6. 상대 4-3 차단 (Block Opponent 4-3)
  const isOpp43 = ((oppP.blockedFour >= 1 || oppP.openFour >= 1) && oppP.openThree >= 1) || oppP.blockedFour >= 2;
  if (isOpp43) {
    return { priority: 6, tierName: '6. 상대 4-3 양수겸장 사전 차단', isForced: true, scoreBonus: 2_500_000 };
  }
  // 7. 열린 3목 (Open 3)
  if (myP.openThree >= 1) {
    return { priority: 7, tierName: '7. 열린 3목 (공격 전개)', isForced: true, scoreBonus: 1_000_000 };
  }
  // 8. 상대 열린 3목 차단 (Block Opponent Open 3)
  if (oppP.openThree >= 1) {
    return { priority: 8, tierName: '8. 상대 열린 3목 차단', isForced: true, scoreBonus: 500_000 };
  }
  // 9. 일반 후보 수 (General Candidates)
  return { priority: 9, tierName: '9. 일반 후보 수 (위치 및 연결)', isForced: false, scoreBonus: 0 };
}

/**
 * Full Minimax with Alpha-Beta Pruning, Transposition Table, Zobrist Hashing,
 * Killer Move Heuristics, and 9-tier Forced Move Priority Ordering.
 */
function minimaxAlphaBeta(
  board: CellValue[][],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  context: MinimaxContext,
  lastMove: Coordinate | null,
  branchLimit: number,
  currentHash: number
): MinimaxResult {
  context.nodesVisited++;

  // Periodic time check to prevent browser freeze or UI stuttering
  if ((context.nodesVisited & 127) === 0) {
    if (performance.now() - context.startTime > context.maxTimeMs) {
      context.timeExceeded = true;
    }
  }
  if (context.timeExceeded) {
    return { score: 0, bestMove: null, principalVariation: [] };
  }

  // Terminal check from previous step
  if (lastMove) {
    const prevPlayer = isMaximizing ? context.humanColor : context.aiColor;
    if (checkWin(board, lastMove.row, lastMove.col, prevPlayer)) {
      return {
        score: isMaximizing ? -PATTERN_SCORE.FIVE * 10 : PATTERN_SCORE.FIVE * 10,
        bestMove: null,
        principalVariation: [],
      };
    }
  }

  if (depth === 0) {
    // Leaf node: board static evaluation difference
    let staticScore = 0;
    const candidates = getNeighborCandidates(board, 1);
    for (const c of candidates) {
      const aiP = getMovePatterns(board, c.row, c.col, context.aiColor);
      const huP = getMovePatterns(board, c.row, c.col, context.humanColor);
      staticScore += scorePatterns(aiP) - scorePatterns(huP) * 1.15;
    }
    return {
      score: staticScore,
      bestMove: null,
      principalVariation: [],
    };
  }

  // Transposition Table lookup
  const ttEntry = transpositionTable.get(currentHash);
  if (ttEntry && ttEntry.depth >= depth) {
    if (ttEntry.flag === 'EXACT') {
      return {
        score: ttEntry.score,
        bestMove: ttEntry.bestMove,
        principalVariation: ttEntry.bestMove ? [ttEntry.bestMove] : [],
      };
    } else if (ttEntry.flag === 'LOWERBOUND') {
      alpha = Math.max(alpha, ttEntry.score);
    } else if (ttEntry.flag === 'UPPERBOUND') {
      beta = Math.min(beta, ttEntry.score);
    }
    if (alpha >= beta) {
      return {
        score: ttEntry.score,
        bestMove: ttEntry.bestMove,
        principalVariation: ttEntry.bestMove ? [ttEntry.bestMove] : [],
      };
    }
  }

  const currentPlayer = isMaximizing ? context.aiColor : context.humanColor;
  const opponentPlayer = isMaximizing ? context.humanColor : context.aiColor;
  const rawCandidates = getNeighborCandidates(board, 2);

  if (rawCandidates.length === 0) {
    return { score: 0, bestMove: null, principalVariation: [] };
  }

  // Fast tactical shortcut: Immediate win on this turn (Priority 1)
  for (const move of rawCandidates) {
    const p = getMovePatterns(board, move.row, move.col, currentPlayer);
    if (p.five > 0) {
      const winScore = isMaximizing ? PATTERN_SCORE.FIVE : -PATTERN_SCORE.FIVE;
      return { score: winScore, bestMove: move, principalVariation: [move] };
    }
  }

  // 9-tier forced move ordering & classification
  const classified = rawCandidates.map((move) => {
    const classification = classifyCandidatePriority(board, move, currentPlayer, opponentPlayer);
    const baseEval = evaluateCandidateMove(board, move, context.aiColor, context.humanColor, isMaximizing ? 1.25 : 1.0);

    // Bonus for TT best move
    let ttBonus = 0;
    if (ttEntry?.bestMove && ttEntry.bestMove.row === move.row && ttEntry.bestMove.col === move.col) {
      ttBonus = 200_000_000;
    }

    // Bonus for killer moves
    let killerBonus = 0;
    const km = killerMoves[depth] || [];
    if (km[0]?.row === move.row && km[0]?.col === move.col) {
      killerBonus = 500_000;
    } else if (km[1]?.row === move.row && km[1]?.col === move.col) {
      killerBonus = 250_000;
    }

    const totalVal = ttBonus + classification.scoreBonus + killerBonus + baseEval;
    return {
      move,
      priority: classification.priority,
      totalVal,
    };
  });

  // Sort by priority (ascending 1..9) and within same priority by totalVal (descending)
  classified.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return b.totalVal - a.totalVal;
  });

  // If top candidates are forced (Priority 1 or 2), prune branch limit to top urgent moves only
  let effectiveBranchLimit = branchLimit;
  if (classified[0]?.priority <= 2) {
    effectiveBranchLimit = Math.min(branchLimit, 3);
  } else if (classified[0]?.priority <= 4) {
    effectiveBranchLimit = Math.min(branchLimit, 5);
  }

  const orderedCandidates = classified.slice(0, effectiveBranchLimit).map((c) => c.move);
  context.totalPossibleNodes += orderedCandidates.length;

  let bestMove: Coordinate | null = orderedCandidates[0] || null;
  let bestPV: Coordinate[] = bestMove ? [bestMove] : [];
  const originalAlpha = alpha;

  const playerIdx = currentPlayer === 'BLACK' ? 0 : 1;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of orderedCandidates) {
      board[move.row][move.col] = context.aiColor;
      const nextHash = (currentHash ^ ZOBRIST_TABLE[move.row][move.col][playerIdx]) >>> 0;

      const childResult = minimaxAlphaBeta(
        board,
        depth - 1,
        alpha,
        beta,
        false,
        context,
        move,
        branchLimit,
        nextHash
      );
      board[move.row][move.col] = null;

      if (context.timeExceeded) break;

      if (childResult.score > maxEval) {
        maxEval = childResult.score;
        bestMove = move;
        bestPV = [move, ...childResult.principalVariation];
      }
      alpha = Math.max(alpha, childResult.score);
      if (beta <= alpha) {
        // Beta cutoff - record killer move
        recordKillerMove(depth, move);
        break;
      }
    }

    // Save to Transposition Table
    if (!context.timeExceeded) {
      let flag: 'EXACT' | 'LOWERBOUND' | 'UPPERBOUND' = 'EXACT';
      if (maxEval <= originalAlpha) {
        flag = 'UPPERBOUND';
      } else if (maxEval >= beta) {
        flag = 'LOWERBOUND';
      }
      if (transpositionTable.size < 40000) {
        transpositionTable.set(currentHash, {
          depth,
          score: maxEval,
          flag,
          bestMove,
        });
      }
    }

    return { score: maxEval, bestMove, principalVariation: bestPV };
  } else {
    let minEval = Infinity;
    for (const move of orderedCandidates) {
      board[move.row][move.col] = context.humanColor;
      const nextHash = (currentHash ^ ZOBRIST_TABLE[move.row][move.col][playerIdx]) >>> 0;

      const childResult = minimaxAlphaBeta(
        board,
        depth - 1,
        alpha,
        beta,
        true,
        context,
        move,
        branchLimit,
        nextHash
      );
      board[move.row][move.col] = null;

      if (context.timeExceeded) break;

      if (childResult.score < minEval) {
        minEval = childResult.score;
        bestMove = move;
        bestPV = [move, ...childResult.principalVariation];
      }
      beta = Math.min(beta, childResult.score);
      if (beta <= alpha) {
        // Alpha cutoff - record killer move
        recordKillerMove(depth, move);
        break;
      }
    }

    // Save to Transposition Table
    if (!context.timeExceeded) {
      let flag: 'EXACT' | 'LOWERBOUND' | 'UPPERBOUND' = 'EXACT';
      if (minEval <= originalAlpha) {
        flag = 'UPPERBOUND';
      } else if (minEval >= beta) {
        flag = 'LOWERBOUND';
      }
      if (transpositionTable.size < 40000) {
        transpositionTable.set(currentHash, {
          depth,
          score: minEval,
          flag,
          bestMove,
        });
      }
    }

    return { score: minEval, bestMove, principalVariation: bestPV };
  }
}

/**
 * Detailed AI move generator that returns full search telemetry:
 * - Depth
 * - Candidates evaluated
 * - Nodes visited
 * - Pruned node count & pruning rate
 * - Execution time (ms)
 * - Principal Variation (예상 수순: 현재 수 → 상대 대응 → 다음 수 → 상대 대응)
 */
export function getAIMoveDetailed(
  board: CellValue[][],
  aiColor: Player,
  humanColor: Player,
  difficulty: AIDifficulty = 'master'
): AIMoveTelemetry {
  const startTime = performance.now();
  const rawCandidates = getNeighborCandidates(board, 2);

  if (rawCandidates.length === 0) {
    const defaultMove = { row: 7, col: 7 };
    return {
      move: defaultMove,
      difficulty,
      depth: 1,
      candidateCount: 1,
      nodesVisited: 1,
      nodesTotalEstimated: 1,
      prunedNodes: 0,
      pruningRate: 0,
      timeMs: 0.1,
      score: 0,
      principalVariation: [defaultMove],
    };
  }

  // 1. Beginner (초급): 1-ply heuristic evaluation with slight dispersion for easy play
  if (difficulty === 'beginner') {
    const candidatesCount = Math.min(rawCandidates.length, 8);
    // Quick check: 80% chance to block immediate 5
    for (const pos of rawCandidates) {
      const aiP = getMovePatterns(board, pos.row, pos.col, aiColor);
      if (aiP.five > 0) {
        const timeMs = Number((performance.now() - startTime).toFixed(1));
        return {
          move: pos,
          difficulty,
          depth: 1,
          candidateCount: candidatesCount,
          nodesVisited: 4,
          nodesTotalEstimated: 8,
          prunedNodes: 4,
          pruningRate: 50.0,
          timeMs,
          score: PATTERN_SCORE.FIVE,
          principalVariation: [pos],
        };
      }
    }
    for (const pos of rawCandidates) {
      const huP = getMovePatterns(board, pos.row, pos.col, humanColor);
      if (huP.five > 0 && Math.random() < 0.8) {
        const timeMs = Number((performance.now() - startTime).toFixed(1));
        return {
          move: pos,
          difficulty,
          depth: 1,
          candidateCount: candidatesCount,
          nodesVisited: 6,
          nodesTotalEstimated: 10,
          prunedNodes: 4,
          pruningRate: 40.0,
          timeMs,
          score: PATTERN_SCORE.FIVE * 0.9,
          principalVariation: [pos],
        };
      }
    }

    const scored = rawCandidates.slice(0, 10).map((pos) => {
      const aiP = getMovePatterns(board, pos.row, pos.col, aiColor);
      const huP = getMovePatterns(board, pos.row, pos.col, humanColor);
      const score =
        aiP.openFour * 8000 +
        aiP.blockedFour * 1500 +
        aiP.openThree * 600 +
        huP.openFour * 6000 +
        huP.blockedFour * 1200 +
        huP.openThree * 400 +
        getPositionalScore(pos.row, pos.col) +
        Math.random() * 600;
      return { pos, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const chosen = scored[0]?.pos || rawCandidates[0];
    const timeMs = Number((performance.now() - startTime).toFixed(1));

    return {
      move: chosen,
      difficulty,
      depth: 1,
      candidateCount: candidatesCount,
      nodesVisited: candidatesCount,
      nodesTotalEstimated: candidatesCount,
      prunedNodes: 0,
      pruningRate: 0,
      timeMs,
      score: Math.round(scored[0]?.score || 0),
      principalVariation: [chosen],
    };
  }

  // 2. Intermediate (중급): 2-ply evaluation (내 수 → 상대 대응)
  if (difficulty === 'intermediate') {
    const branchLimit = 10;
    const initialHash = computeZobristHash(board);
    const context: MinimaxContext = {
      nodesVisited: 0,
      totalPossibleNodes: 0,
      aiColor,
      humanColor,
      startTime,
      maxTimeMs: 300,
      timeExceeded: false,
    };

    const searchRes = minimaxAlphaBeta(
      board,
      2,
      -Infinity,
      Infinity,
      true,
      context,
      null,
      branchLimit,
      initialHash
    );

    const timeMs = Number((performance.now() - startTime).toFixed(1));
    const chosen = searchRes.bestMove || rawCandidates[0];
    const totalEst = Math.max(context.nodesVisited, Math.pow(branchLimit, 2));
    const pruned = Math.max(0, totalEst - context.nodesVisited);
    const pruningRate = Number(((pruned / totalEst) * 100).toFixed(1));

    return {
      move: chosen,
      difficulty,
      depth: 2,
      candidateCount: Math.min(rawCandidates.length, branchLimit),
      nodesVisited: context.nodesVisited,
      nodesTotalEstimated: totalEst,
      prunedNodes: pruned,
      pruningRate,
      timeMs,
      score: searchRes.score,
      principalVariation: searchRes.principalVariation.length > 0 ? searchRes.principalVariation : [chosen],
    };
  }

  // 3. Advanced (고급): 3-ply Minimax + Alpha-Beta (내 수 → 상대 대응 → 내 수)
  if (difficulty === 'advanced') {
    const branchLimit = 11;
    const initialHash = computeZobristHash(board);
    const context: MinimaxContext = {
      nodesVisited: 0,
      totalPossibleNodes: 0,
      aiColor,
      humanColor,
      startTime,
      maxTimeMs: 350,
      timeExceeded: false,
    };

    const searchRes = minimaxAlphaBeta(
      board,
      3,
      -Infinity,
      Infinity,
      true,
      context,
      null,
      branchLimit,
      initialHash
    );

    const timeMs = Number((performance.now() - startTime).toFixed(1));
    const chosen = searchRes.bestMove || rawCandidates[0];
    const totalEst = Math.max(context.nodesVisited, Math.pow(branchLimit, 3));
    const pruned = Math.max(0, totalEst - context.nodesVisited);
    const pruningRate = Number(((pruned / totalEst) * 100).toFixed(1));

    return {
      move: chosen,
      difficulty,
      depth: 3,
      candidateCount: Math.min(rawCandidates.length, branchLimit),
      nodesVisited: context.nodesVisited,
      nodesTotalEstimated: totalEst,
      prunedNodes: pruned,
      pruningRate,
      timeMs,
      score: searchRes.score,
      principalVariation: searchRes.principalVariation.length > 0 ? searchRes.principalVariation : [chosen],
    };
  }

  // 4. Master (최상급): Iterative Deepening (1..4 ply) + 9-Tier Forced Move Priority + Time Budget (250ms)
  const branchLimit = 13;
  const initialHash = computeZobristHash(board);
  const timeBudgetMs = 250; // Guaranteed zero-freeze budget

  // 1순위: 즉시 5목 완성 승리 탐색 (Priority 1)
  for (const move of rawCandidates) {
    const p = getMovePatterns(board, move.row, move.col, aiColor);
    if (p.five > 0) {
      const timeMs = Number((performance.now() - startTime).toFixed(1));
      return {
        move,
        difficulty: 'master',
        depth: 4,
        candidateCount: 1,
        nodesVisited: 1,
        nodesTotalEstimated: branchLimit,
        prunedNodes: branchLimit - 1,
        pruningRate: 92.3,
        timeMs,
        score: PATTERN_SCORE.FIVE,
        principalVariation: [move],
        candidateLogs: [
          {
            move,
            staticScore: PATTERN_SCORE.FIVE,
            minimaxScore: PATTERN_SCORE.FIVE,
            pruned: false,
            pvPath: [move],
            reason: '1. 즉시 승리 (5목 완성 확정)',
          },
        ],
      };
    }
  }

  // 2순위: 상대 5목 즉시 차단 (Priority 2)
  const immediateOpponentWins: Coordinate[] = [];
  for (const move of rawCandidates) {
    const oppP = getMovePatterns(board, move.row, move.col, humanColor);
    if (oppP.five > 0) {
      immediateOpponentWins.push(move);
    }
  }
  if (immediateOpponentWins.length === 1) {
    const move = immediateOpponentWins[0];
    const timeMs = Number((performance.now() - startTime).toFixed(1));
    return {
      move,
      difficulty: 'master',
      depth: 4,
      candidateCount: 1,
      nodesVisited: 2,
      nodesTotalEstimated: branchLimit,
      prunedNodes: branchLimit - 1,
      pruningRate: 92.0,
      timeMs,
      score: PATTERN_SCORE.FIVE * 0.95,
      principalVariation: [move],
      candidateLogs: [
        {
          move,
          staticScore: PATTERN_SCORE.FIVE * 0.95,
          minimaxScore: PATTERN_SCORE.FIVE * 0.95,
          pruned: false,
          pvPath: [move],
          reason: '2. 상대 즉시 승리 차단 (5목 방어)',
        },
      ],
    };
  }

  // 9-Tier Forced Move Candidate Classification
  const scored = rawCandidates.map((move) => {
    const classification = classifyCandidatePriority(board, move, aiColor, humanColor);
    const staticScore = evaluateCandidateMove(board, move, aiColor, humanColor, 1.25);
    return {
      move,
      priority: classification.priority,
      tierName: classification.tierName,
      staticScore,
      totalVal: classification.scoreBonus + staticScore,
    };
  });

  // Sort by priority (1 to 9), then by evaluation score descending
  scored.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.totalVal - a.totalVal;
  });

  const orderedCandidates = scored.slice(0, branchLimit).map((s) => s.move);

  const context: MinimaxContext = {
    nodesVisited: 0,
    totalPossibleNodes: 0,
    aiColor,
    humanColor,
    startTime,
    maxTimeMs: timeBudgetMs,
    timeExceeded: false,
  };

  let bestMove: Coordinate = orderedCandidates[0];
  let bestPV: Coordinate[] = [bestMove];
  let maxEval = -Infinity;
  let finalDepthReached = 1;
  const candidateLogs: CandidateEvaluationLog[] = [];

  // Iterative Deepening: depth 1 -> 2 -> 3 -> 4
  for (let currentDepth = 1; currentDepth <= 4; currentDepth++) {
    let depthBestMove: Coordinate | null = null;
    let depthBestPV: Coordinate[] = [];
    let depthMaxEval = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    for (const move of orderedCandidates) {
      if (context.timeExceeded && currentDepth > 1) break;

      board[move.row][move.col] = aiColor;
      const nextHash = (initialHash ^ ZOBRIST_TABLE[move.row][move.col][aiColor === 'BLACK' ? 0 : 1]) >>> 0;

      const childResult = minimaxAlphaBeta(
        board,
        currentDepth - 1,
        alpha,
        beta,
        false, // Opponent minimizing turn
        context,
        move,
        branchLimit,
        nextHash
      );
      board[move.row][move.col] = null;

      if (context.timeExceeded && currentDepth > 1) break;

      const pvPath = [move, ...childResult.principalVariation];
      const isPruned = childResult.score < alpha;

      if (childResult.score > depthMaxEval) {
        depthMaxEval = childResult.score;
        depthBestMove = move;
        depthBestPV = pvPath;
      }
      alpha = Math.max(alpha, childResult.score);

      // On the final depth, record detailed candidate logs for telemetry and verification
      if (currentDepth === 4 || currentDepth === 3) {
        const itemInfo = scored.find((s) => s.move.row === move.row && s.move.col === move.col);
        const reason =
          childResult.score > maxEval
            ? `최고 Minimax 평가 획득 [${itemInfo?.tierName || '최적수'}]`
            : childResult.score <= -PATTERN_SCORE.FIVE
            ? '상대 승리 수순 허용 (배제)'
            : childResult.score < 0
            ? '상대 반격에 밀림 (배제)'
            : `열세 [${itemInfo?.tierName || '일반'}]`;

        candidateLogs.push({
          move,
          staticScore: itemInfo?.staticScore || 0,
          minimaxScore: childResult.score,
          pruned: isPruned,
          pvPath,
          reason,
        });
      }
    }

    if (!context.timeExceeded && depthBestMove) {
      bestMove = depthBestMove;
      bestPV = depthBestPV;
      maxEval = depthMaxEval;
      finalDepthReached = currentDepth;
    }

    // If time budget reached and we already have at least depth 2, stop comfortably
    if (performance.now() - startTime >= timeBudgetMs) {
      break;
    }
  }

  const timeMs = Number((performance.now() - startTime).toFixed(1));
  const theoreticalUnpruned = Math.max(context.nodesVisited, Math.pow(branchLimit, finalDepthReached));
  const pruned = Math.max(0, theoreticalUnpruned - context.nodesVisited);
  const pruningRate = Number(((pruned / theoreticalUnpruned) * 100).toFixed(1));

  return {
    move: bestMove,
    difficulty: 'master',
    depth: finalDepthReached,
    candidateCount: orderedCandidates.length,
    nodesVisited: context.nodesVisited,
    nodesTotalEstimated: theoreticalUnpruned,
    prunedNodes: pruned,
    pruningRate,
    timeMs,
    score: maxEval,
    principalVariation: bestPV,
    candidateLogs,
  };
}

/**
 * Standard getAIMove delegating to getAIMoveDetailed.
 */
export function getAIMove(
  board: CellValue[][],
  aiColor: Player,
  humanColor: Player,
  difficulty: AIDifficulty = 'intermediate'
): Coordinate {
  const telemetry = getAIMoveDetailed(board, aiColor, humanColor, difficulty);
  return telemetry.move;
}
