import React, { useRef, useState } from 'react';
import { CellValue, Coordinate, Player, WinInfo } from '../types';
import { BOARD_SIZE, isStarPoint } from '../utils/omokLogic';

interface OmokBoardProps {
  board: CellValue[][];
  currentPlayer: Player;
  isGameOver: boolean;
  winner: Player | null;
  winInfo: WinInfo | null;
  lastMove: { row: number; col: number } | null;
  isAiThinking?: boolean;
  onCellClick: (row: number, col: number) => void;
  onRestart?: () => void;
}

const COL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];

export const OmokBoard: React.FC<OmokBoardProps> = ({
  board,
  currentPlayer,
  isGameOver,
  winner,
  winInfo,
  lastMove,
  isAiThinking = false,
  onCellClick,
  onRestart,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const lastTouchEndTimeRef = useRef<number>(0);

  // Real-time touch aiming state for mobile smartphones
  const [touchAim, setTouchAim] = useState<{
    row: number;
    col: number;
    clientX: number;
    clientY: number;
  } | null>(null);

  const isWinningCoord = (r: number, c: number): boolean => {
    if (!winInfo) return false;
    return winInfo.winningLine.some((coord: Coordinate) => coord.row === r && coord.col === c);
  };

  const getDirectionText = (dir?: string) => {
    switch (dir) {
      case 'horizontal': return '가로 5목 (HORIZONTAL)';
      case 'vertical': return '세로 5목 (VERTICAL)';
      case 'diagonal-main': return '대각선 5목 (DIAGONAL ↘)';
      case 'diagonal-anti': return '반대 대각선 5목 (DIAGONAL ↗)';
      default: return '5 IN A ROW';
    }
  };

  // Convert mobile touch position into 15x15 board coordinates
  const getTouchCoord = (e: React.TouchEvent): { row: number; col: number; clientX: number; clientY: number } | null => {
    if (!gridRef.current || e.touches.length === 0) return null;
    const touch = e.touches[0];
    const rect = gridRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // Tolerance zone around board (15px padding tolerance)
    if (x < -15 || x > rect.width + 15 || y < -15 || y > rect.height + 15) {
      return null;
    }

    const clampedX = Math.max(0, Math.min(rect.width - 1, x));
    const clampedY = Math.max(0, Math.min(rect.height - 1, y));

    const col = Math.floor((clampedX / rect.width) * BOARD_SIZE);
    const row = Math.floor((clampedY / rect.height) * BOARD_SIZE);

    return { row, col, clientX: touch.clientX, clientY: touch.clientY };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isGameOver || isAiThinking) return;
    const coord = getTouchCoord(e);
    if (coord) {
      setTouchAim(coord);
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(8); } catch (_) {}
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isGameOver || isAiThinking) return;
    const coord = getTouchCoord(e);
    setTouchAim(coord);
  };

  const handleTouchEnd = () => {
    lastTouchEndTimeRef.current = Date.now();
    if (touchAim && !isGameOver && !isAiThinking) {
      const { row, col } = touchAim;
      if (board[row][col] === null) {
        onCellClick(row, col);
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate(15); } catch (_) {}
        }
      }
    }
    setTouchAim(null);
  };

  const handleTouchCancel = () => {
    setTouchAim(null);
  };

  return (
    <div
      id="omok-board-container"
      className="relative flex flex-col items-center select-none w-full max-w-full touch-manipulation"
    >
      {/* Mobile Touch Instruction Pill */}
      <div className="flex sm:hidden items-center justify-between w-full max-w-[min(calc(100vw-36px),390px)] px-1 mb-2 text-[11px] font-medium text-[var(--ink-secondary,#71717a)]">
        <span className="flex items-center gap-1.5 font-sans">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          스마트폰 터치/드래그 조준 지원
        </span>
        <span className="font-mono text-[10px] bg-stone-200/80 px-2 py-0.5 rounded text-stone-700">
          15×15 바둑판
        </span>
      </div>

      {/* Top Column Labels (A-O) */}
      <div className="flex justify-between w-[min(calc(100vw-54px),380px)] sm:w-[460px] md:w-[510px] px-1 sm:px-3 mb-1 text-[9px] sm:text-[11px] font-mono font-bold text-[#71717a]">
        {COL_LETTERS.map((letter, idx) => (
          <span
            key={`col-label-${idx}`}
            className={`w-full text-center transition-colors ${
              touchAim?.col === idx ? 'text-[#c2410c] font-black scale-110' : ''
            }`}
          >
            {letter}
          </span>
        ))}
      </div>

      <div className="flex items-center">
        {/* Left Row Labels (15-1) */}
        <div className="flex flex-col justify-between h-[min(calc(100vw-54px),380px)] sm:h-[460px] md:h-[510px] py-1 sm:py-3 mr-1 text-[9px] sm:text-[11px] font-mono font-bold text-[#71717a]">
          {Array.from({ length: BOARD_SIZE }, (_, i) => 15 - i).map((rowNum, rIdx) => (
            <span
              key={`row-label-${rowNum}`}
              className={`h-full flex items-center justify-center w-3 sm:w-4 text-right transition-colors ${
                touchAim?.row === rIdx ? 'text-[#c2410c] font-black scale-110' : ''
              }`}
            >
              {rowNum}
            </span>
          ))}
        </div>

        {/* High Density Wooden Board Surface */}
        <div
          id="omok-wood-board"
          className="relative bg-[#dcb35c] p-1.5 sm:p-3 md:p-4 rounded-md border-2 border-[#5d4037] shadow-[0_10px_30px_rgba(0,0,0,0.15)] transition-all overflow-hidden touch-none"
          style={{
            backgroundColor: 'var(--bg-board, #dcb35c)',
          }}
        >
          {/* Floating Mobile Touch Aim HUD */}
          {touchAim && !isGameOver && !isAiThinking && (
            <div
              id="mobile-touch-aim-hud"
              className="absolute top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none bg-[#18181b]/95 backdrop-blur-xs text-white px-3 py-1 rounded-full shadow-xl border border-stone-600 flex items-center gap-2 text-xs font-mono font-bold animate-in fade-in duration-75"
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  currentPlayer === 'BLACK' ? 'bg-black border border-white' : 'bg-white'
                }`}
              />
              <span className="text-amber-300">
                {COL_LETTERS[touchAim.col]}{15 - touchAim.row}
              </span>
              <span
                className={`text-[10px] font-sans font-semibold px-1.5 py-0.2 rounded ${
                  board[touchAim.row][touchAim.col] === null
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {board[touchAim.row][touchAim.col] === null ? '손 떼면 착수' : '착수 불가'}
              </span>
            </div>
          )}

          {/* 15x15 Grid Container with Touch Listeners */}
          <div
            ref={gridRef}
            id="omok-grid"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            className="w-[min(calc(100vw-54px),380px)] h-[min(calc(100vw-54px),380px)] sm:w-[460px] sm:h-[460px] md:w-[510px] md:h-[510px] relative touch-none select-none"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
            }}
          >
            {board.map((rowArr, r) =>
              rowArr.map((cellValue, c) => {
                const isStar = isStarPoint(r, c);
                const isLast = lastMove?.row === r && lastMove?.col === c;
                const isWin = isWinningCoord(r, c);
                const isEmpty = cellValue === null;
                const isTouchTarget = touchAim?.row === r && touchAim?.col === c;
                const isTouchCrosshair = touchAim && (touchAim.row === r || touchAim.col === c);

                return (
                  <div
                    key={`cell-${r}-${c}`}
                    id={`cell-${r}-${c}`}
                    onClick={() => {
                      // Prevent duplicate move if synthetic click fires right after touchEnd
                      if (Date.now() - lastTouchEndTimeRef.current < 450) {
                        return;
                      }
                      onCellClick(r, c);
                    }}
                    className={`relative flex items-center justify-center transition-colors active:bg-black/10 ${
                      isAiThinking || isGameOver
                        ? 'cursor-default'
                        : 'cursor-pointer group hover:bg-white/10'
                    } ${isTouchCrosshair && !cellValue ? 'bg-amber-700/10' : ''}`}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {/* Grid Cross Lines */}
                    {/* Horizontal Line */}
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 bg-[#5d4037]/75 h-[1px] pointer-events-none ${
                        c === 0 ? 'left-1/2 right-0' : c === BOARD_SIZE - 1 ? 'left-0 right-1/2' : 'left-0 right-0'
                      }`}
                    />
                    {/* Vertical Line */}
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 bg-[#5d4037]/75 w-[1px] pointer-events-none ${
                        r === 0 ? 'top-1/2 bottom-0' : r === BOARD_SIZE - 1 ? 'top-0 bottom-1/2' : 'top-0 bottom-0'
                      }`}
                    />

                    {/* Star Point (화점) */}
                    {isStar && (
                      <div
                        id={`star-${r}-${c}`}
                        className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#5d4037] z-10 pointer-events-none"
                      />
                    )}

                    {/* Hover Ghost Stone (Desktop hover) */}
                    {isEmpty && !isGameOver && !isAiThinking && !isTouchTarget && (
                      <div
                        className={`absolute w-[82%] h-[82%] rounded-full opacity-0 group-hover:opacity-35 transition-opacity pointer-events-none z-20 ${
                          currentPlayer === 'BLACK'
                            ? 'bg-black'
                            : 'bg-white border border-stone-300'
                        }`}
                      />
                    )}

                    {/* Active Touch Aim Target Indicator (Mobile Smartphone) */}
                    {isTouchTarget && !isGameOver && !isAiThinking && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                        {isEmpty ? (
                          <div
                            className={`w-[88%] h-[88%] rounded-full animate-pulse ring-2 ring-offset-1 ring-[#c2410c] shadow-lg flex items-center justify-center ${
                              currentPlayer === 'BLACK'
                                ? 'bg-black/70 border border-white/50'
                                : 'bg-white/80 border border-stone-400'
                            }`}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-[#c2410c]" />
                          </div>
                        ) : (
                          <div className="w-full h-full rounded-xs ring-2 ring-rose-500 bg-rose-500/20" />
                        )}
                      </div>
                    )}

                    {/* Placed Stone */}
                    {cellValue && (
                      <div
                        id={`stone-${r}-${c}`}
                        className={`relative w-[86%] h-[86%] rounded-full z-20 pointer-events-none flex items-center justify-center transition-transform duration-100 ${
                          isWin ? 'scale-110 ring-4 ring-[#c2410c] ring-offset-1 z-40' : ''
                        }`}
                        style={{
                          background:
                            cellValue === 'BLACK'
                              ? 'radial-gradient(circle at 30% 30%, #444, #000)'
                              : 'radial-gradient(circle at 30% 30%, #fff, #ccc)',
                          boxShadow: '0 3px 5px rgba(0,0,0,0.3)',
                        }}
                      >
                        {/* Last Move Indicator */}
                        {isLast && !isGameOver && (
                          <div
                            id="last-move-indicator"
                            className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#c2410c] border border-white shadow-xs"
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* High Density Win Overlay Banner */}
          {isGameOver && (
            <div
              id="win-overlay"
              className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-4 sm:p-6 text-center z-50 border border-[#18181b] animate-in fade-in zoom-in-95 duration-150"
            >
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full mb-3 flex items-center justify-center shadow-md border border-[#e4e4e7]"
                style={{
                  background:
                    winner === 'BLACK'
                      ? 'radial-gradient(circle at 30% 30%, #444, #000)'
                      : 'radial-gradient(circle at 30% 30%, #fff, #ccc)',
                }}
              />
              <span
                id="winner-text"
                className="text-xl sm:text-3xl font-black tracking-tight text-[#18181b] uppercase mb-1"
              >
                {winner === 'BLACK' ? 'BLACK WINS!' : 'WHITE WINS!'}
              </span>
              <p className="text-sm font-semibold text-[#c2410c] mb-1">
                {winner === 'BLACK' ? '흑돌 승리' : '백돌 승리'}
              </p>
              <p className="text-xs font-mono text-[#71717a] mb-4 sm:mb-6">
                {getDirectionText(winInfo?.direction)}
              </p>
              {onRestart && (
                <button
                  type="button"
                  onClick={onRestart}
                  className="px-5 sm:px-6 py-2.5 sm:py-3 bg-[#18181b] text-white text-xs sm:text-sm font-bold uppercase tracking-wider rounded-md hover:bg-[#27272a] active:scale-[0.98] transition-all shadow-md cursor-pointer"
                >
                  새 게임 시작
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Row Labels (15-1) */}
        <div className="flex flex-col justify-between h-[min(calc(100vw-54px),380px)] sm:h-[460px] md:h-[510px] py-1 sm:py-3 ml-1 text-[9px] sm:text-[11px] font-mono font-bold text-[#71717a]">
          {Array.from({ length: BOARD_SIZE }, (_, i) => 15 - i).map((rowNum, rIdx) => (
            <span
              key={`row-label-right-${rowNum}`}
              className={`h-full flex items-center justify-center w-3 sm:w-4 text-left transition-colors ${
                touchAim?.row === rIdx ? 'text-[#c2410c] font-black scale-110' : ''
              }`}
            >
              {rowNum}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Column Labels (A-O) */}
      <div className="flex justify-between w-[min(calc(100vw-54px),380px)] sm:w-[460px] md:w-[510px] px-1 sm:px-3 mt-1 text-[9px] sm:text-[11px] font-mono font-bold text-[#71717a]">
        {COL_LETTERS.map((letter, idx) => (
          <span
            key={`col-label-bottom-${idx}`}
            className={`w-full text-center transition-colors ${
              touchAim?.col === idx ? 'text-[#c2410c] font-black scale-110' : ''
            }`}
          >
            {letter}
          </span>
        ))}
      </div>
    </div>
  );
};

