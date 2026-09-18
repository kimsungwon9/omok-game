import { CellValue, Coordinate, Player, WinInfo } from '../types';

export const BOARD_SIZE = 15;

// Traditional Go/Omok star points (화점) on 15x15 board (0-indexed)
// (3,3), (3,11), (7,7), (11,3), (11,11)
export const STAR_POINTS: [number, number][] = [
  [3, 3],
  [3, 11],
  [7, 7],
  [11, 3],
  [11, 11],
];

export function isStarPoint(row: number, col: number): boolean {
  return STAR_POINTS.some(([r, c]) => r === row && c === col);
}

export function createEmptyBoard(): CellValue[][] {
  const board: CellValue[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: CellValue[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      row.push(null);
    }
    board.push(row);
  }
  return board;
}

export interface DirectionDefinition {
  name: 'horizontal' | 'vertical' | 'diagonal-main' | 'diagonal-anti';
  label: string;
  dr: number;
  dc: number;
}

export const DIRECTIONS: DirectionDefinition[] = [
  { name: 'horizontal', label: '가로', dr: 0, dc: 1 },
  { name: 'vertical', label: '세로', dr: 1, dc: 0 },
  { name: 'diagonal-main', label: '대각선 (좌상→우하)', dr: 1, dc: 1 },
  { name: 'diagonal-anti', label: '대각선 (우상→좌하)', dr: 1, dc: -1 },
];

/**
 * Checks whether placing a stone of `player` at (row, col) forms 5 in a row.
 * Returns WinInfo if 5 or more stones connect, null otherwise.
 */
export function checkWin(
  board: CellValue[][],
  row: number,
  col: number,
  player: Player
): WinInfo | null {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return null;
  }

  for (const dir of DIRECTIONS) {
    const winningLine: Coordinate[] = [{ row, col }];

    // Forward direction (+dr, +dc)
    let r = row + dir.dr;
    let c = col + dir.dc;
    while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
      winningLine.push({ row: r, col: c });
      r += dir.dr;
      c += dir.dc;
    }

    // Backward direction (-dr, -dc)
    r = row - dir.dr;
    c = col - dir.dc;
    while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
      winningLine.push({ row: r, col: c });
      r -= dir.dr;
      c -= dir.dc;
    }

    // Standard 5-in-a-row Gomoku victory condition
    if (winningLine.length >= 5) {
      // Sort coordinates logically
      winningLine.sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);
      return {
        winner: player,
        winningLine,
        direction: dir.name,
      };
    }
  }

  return null;
}
