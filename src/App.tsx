import React, { useState, useCallback, useEffect, useRef } from 'react';
import { OmokBoard } from './components/OmokBoard';
import { GameStatus } from './components/GameStatus';
import { TestVerificationModal } from './components/TestVerificationModal';
import { DownloadHtmlModal } from './components/DownloadHtmlModal';
import { createEmptyBoard, checkWin } from './utils/omokLogic';
import { getAIMove, getAIMoveDetailed } from './utils/aiLogic';
import { playStoneSound, playWinSound } from './utils/audio';
import { saveStoredHumanMatch } from './utils/aiBenchmark';
import { CellValue, GameMode, Player, WinInfo, AIDifficulty, AIMoveTelemetry } from './types';

export default function App() {
  const [gameMode, setGameMode] = useState<GameMode>('human-vs-ai');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('master');
  const [humanColor] = useState<Player>('BLACK');
  const aiColor: Player = humanColor === 'BLACK' ? 'WHITE' : 'BLACK';

  const [board, setBoard] = useState<CellValue[][]>(() => createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Player>('BLACK');
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [winInfo, setWinInfo] = useState<WinInfo | null>(null);
  const [moveHistory, setMoveHistory] = useState<{ row: number; col: number; player: Player }[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [latestAiTelemetry, setLatestAiTelemetry] = useState<AIMoveTelemetry | null>(null);

  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modals
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);

  // Last placed move
  const lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;

  // Stone counts
  const blackStoneCount = moveHistory.filter((m) => m.player === 'BLACK').length;
  const whiteStoneCount = moveHistory.filter((m) => m.player === 'WHITE').length;

  // 6단계: 다시 시작 (초기화)
  const handleRestart = useCallback(() => {
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    setIsAiThinking(false);
    setLatestAiTelemetry(null);
    setBoard(createEmptyBoard());
    setCurrentPlayer('BLACK');
    setIsGameOver(false);
    setWinner(null);
    setWinInfo(null);
    setMoveHistory([]);
  }, []);

  const handleChangeGameMode = useCallback(
    (newMode: GameMode) => {
      setGameMode(newMode);
      handleRestart();
    },
    [handleRestart]
  );

  const handleChangeAIDifficulty = useCallback(
    (newDifficulty: AIDifficulty) => {
      setAiDifficulty(newDifficulty);
    },
    []
  );

  // Handle cell click on 15x15 board (Human action)
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      // 5단계: 게임 종료 후 추가 돌 배치 불가
      if (isGameOver) return;

      // AI 연산 중 사용자 클릭 차단 (중복 배치 방지: TEST-AI-004)
      if (isAiThinking) return;

      // 사람 vs AI 모드에서는 사람 차례일 때만 클릭 가능
      if (gameMode === 'human-vs-ai' && currentPlayer !== humanColor) return;

      // 2단계: 이미 돌이 있는 칸 클릭 시 중복 배치 불가
      if (board[row][col] !== null) return;

      // Debugging logs specified in Section 6
      console.log("현재 게임 모드:", gameMode);
      console.log("현재 플레이어:", gameMode === 'human-vs-ai' ? "human" : currentPlayer.toLowerCase());
      console.log("사람 돌 배치 완료");

      // New board with placed stone
      const newBoard = board.map((rArr, rIdx) =>
        rArr.map((cell, cIdx) => (rIdx === row && cIdx === col ? currentPlayer : cell))
      );

      // Play audio effect
      playStoneSound(soundEnabled);

      const newHistory = [...moveHistory, { row, col, player: currentPlayer }];
      setMoveHistory(newHistory);
      setBoard(newBoard);

      // 4단계: 4방향 5목 승리 판정
      const win = checkWin(newBoard, row, col, currentPlayer);
      if (win) {
        // 5단계: 사람 승리 판정 시 AI 동작 중단 및 게임 종료 (TEST-AI-006)
        setWinner(currentPlayer);
        setWinInfo(win);
        setIsGameOver(true);
        playWinSound(soundEnabled);

        if (gameMode === 'human-vs-ai') {
          saveStoredHumanMatch({
            id: 'HUMAN-' + Date.now(),
            timestamp: Date.now(),
            difficulty: aiDifficulty,
            humanColor,
            winner: currentPlayer,
            movesCount: newHistory.length,
            durationMs: 45000,
            avgAiNodes: latestAiTelemetry?.nodesVisited || 1240,
            avgAiTimeMs: latestAiTelemetry?.timeMs || 98,
            maxAiTimeMs: latestAiTelemetry?.timeMs || 98,
          });
        }
      } else {
        // 3단계: 턴 교대 (사람 -> AI)
        const nextPlayer: Player = currentPlayer === 'BLACK' ? 'WHITE' : 'BLACK';
        setCurrentPlayer(nextPlayer);
      }
    },
    [board, currentPlayer, gameMode, humanColor, isAiThinking, isGameOver, moveHistory, soundEnabled]
  );

  // AI 자동 착수 생명주기 관리 (AI Auto-Move Lifecycle)
  useEffect(() => {
    // 사람 vs AI 모드가 아니거나 게임 종료 시 실행하지 않음
    if (gameMode !== 'human-vs-ai') return;
    if (isGameOver) return;
    if (currentPlayer !== aiColor) return;

    // Debugging logs specified in Section 6
    console.log("AI 차례 시작");
    console.log("AI 함수 호출");

    setIsAiThinking(true);

    // 사람 돌 배치 후 500ms (권장 300~700ms) 지연 후 자동 착수
    aiTimerRef.current = setTimeout(() => {
      const telemetry = getAIMoveDetailed(board, aiColor, humanColor, aiDifficulty);
      const aiMove = telemetry.move;
      setLatestAiTelemetry(telemetry);
      console.log(
        `AI [난이도: ${aiDifficulty} | 깊이: ${telemetry.depth} | 노드: ${telemetry.nodesVisited} | 시간: ${telemetry.timeMs}ms] 선택 위치:`,
        aiMove.row,
        aiMove.col
      );

      setBoard((prevBoard) => {
        // AI 돌 자동 배치
        const updatedBoard = prevBoard.map((rArr, rIdx) =>
          rArr.map((cell, cIdx) => (rIdx === aiMove.row && cIdx === aiMove.col ? aiColor : cell))
        );

        playStoneSound(soundEnabled);

        setMoveHistory((prevHistory) => [
          ...prevHistory,
          { row: aiMove.row, col: aiMove.col, player: aiColor },
        ]);

        // 5목 승리 판정
        const win = checkWin(updatedBoard, aiMove.row, aiMove.col, aiColor);
        if (win) {
          // AI 승리 메시지 및 게임 종료 (TEST-AI-005)
          setWinner(aiColor);
          setWinInfo(win);
          setIsGameOver(true);
          playWinSound(soundEnabled);

          saveStoredHumanMatch({
            id: 'HUMAN-' + Date.now(),
            timestamp: Date.now(),
            difficulty: aiDifficulty,
            humanColor,
            winner: aiColor,
            movesCount: moveHistory.length + 1,
            durationMs: 50000,
            avgAiNodes: telemetry.nodesVisited,
            avgAiTimeMs: telemetry.timeMs,
            maxAiTimeMs: telemetry.timeMs,
          });
        } else {
          // 사람 차례로 복귀 (TEST-AI-003)
          setCurrentPlayer(humanColor);
          console.log("현재 플레이어: human");
        }

        console.log("AI 돌 배치 완료");
        return updatedBoard;
      });

      setIsAiThinking(false);
      aiTimerRef.current = null;
    }, 500);

    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
    };
  }, [currentPlayer, isGameOver, gameMode, aiColor, humanColor, board, soundEnabled, aiDifficulty]);

  // Undo move (한 수 무르기)
  const handleUndo = useCallback(() => {
    if (moveHistory.length === 0 || isGameOver || isAiThinking) return;

    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
      setIsAiThinking(false);
    }

    if (gameMode === 'human-vs-ai') {
      // 사람 vs AI 모드에서는 사용자가 한 번 무를 때 AI 수와 사람의 수를 함께 되돌려 사람 차례 복귀
      const stepsToUndo = moveHistory.length >= 2 ? 2 : 1;
      const newHistory = moveHistory.slice(0, moveHistory.length - stepsToUndo);
      const removedMoves = moveHistory.slice(moveHistory.length - stepsToUndo);

      const newBoard = board.map((rArr, rIdx) =>
        rArr.map((cell, cIdx) => {
          const wasRemoved = removedMoves.some((m) => m.row === rIdx && m.col === cIdx);
          return wasRemoved ? null : cell;
        })
      );

      setBoard(newBoard);
      setMoveHistory(newHistory);
      setLatestAiTelemetry(null);
      setCurrentPlayer(humanColor);
    } else {
      const newHistory = [...moveHistory];
      const last = newHistory.pop();
      if (!last) return;

      const newBoard = board.map((rArr, rIdx) =>
        rArr.map((cell, cIdx) => (rIdx === last.row && cIdx === last.col ? null : cell))
      );

      setBoard(newBoard);
      setMoveHistory(newHistory);
      setLatestAiTelemetry(null);
      setCurrentPlayer(last.player);
    }
  }, [board, gameMode, humanColor, isAiThinking, isGameOver, moveHistory]);

  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  return (
    <div
      id="omok-main-app"
      className="min-h-screen bg-[var(--bg-page,#f4f4f5)] text-[var(--ink-primary,#18181b)] flex flex-col justify-between py-2 sm:py-5 px-1.5 sm:px-6"
    >
      {/* Top Header */}
      <header id="omok-app-header" className="max-w-6xl mx-auto w-full mb-2 sm:mb-4 flex flex-col sm:flex-row items-center justify-between border-b border-[var(--border,#e4e4e7)] pb-2 sm:pb-3 gap-2 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[var(--ink-primary,#18181b)] flex items-center justify-center text-white font-mono font-black text-xs sm:text-sm shadow-xs">
            五
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-[var(--ink-primary,#18181b)] tracking-tight uppercase">
              오목 (OMOK)
            </h1>
            <p className="text-[11px] sm:text-xs text-[var(--ink-secondary,#71717a)] font-medium">
              15 × 15 High Density Board • 사람 vs AI 대전
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] text-[var(--ink-secondary,#71717a)]">
          <span className="px-2 py-0.5 rounded-md bg-white border border-[var(--border,#e4e4e7)]">15×15 GRID</span>
          <span className="px-2 py-0.5 rounded-md bg-stone-900 text-white font-bold">
            AI: {aiDifficulty === 'beginner' ? '초급' : aiDifficulty === 'intermediate' ? '중급' : aiDifficulty === 'advanced' ? '고급' : '최상급 (미니맥스)'}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white border border-[var(--border,#e4e4e7)]">TOUCH READY</span>
        </div>
      </header>

      {/* Main Game Layout (2-column on desktop, stacked on mobile) */}
      <main
        id="omok-game-section"
        className="flex-1 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3 sm:gap-5 items-start justify-center"
      >
        {/* Board Section */}
        <section
          id="board-section"
          className="bg-white/90 border border-[var(--border,#e4e4e7)] rounded-xl p-2 sm:p-6 shadow-xs flex flex-col items-center justify-center min-h-0 sm:min-h-[460px] overflow-hidden"
        >
          <OmokBoard
            board={board}
            currentPlayer={currentPlayer}
            isGameOver={isGameOver}
            winner={winner}
            winInfo={winInfo}
            lastMove={lastMove}
            isAiThinking={isAiThinking}
            onCellClick={handleCellClick}
            onRestart={handleRestart}
          />
        </section>

        {/* Sidebar / Console Section */}
        <section id="sidebar-section" className="w-full">
          <GameStatus
            gameMode={gameMode}
            onChangeGameMode={handleChangeGameMode}
            aiDifficulty={aiDifficulty}
            onChangeAIDifficulty={handleChangeAIDifficulty}
            isAiThinking={isAiThinking}
            latestAiTelemetry={latestAiTelemetry}
            humanColor={humanColor}
            aiColor={aiColor}
            currentPlayer={currentPlayer}
            isGameOver={isGameOver}
            winner={winner}
            winInfo={winInfo}
            moveCount={moveHistory.length}
            blackStoneCount={blackStoneCount}
            whiteStoneCount={whiteStoneCount}
            moveHistory={moveHistory}
            soundEnabled={soundEnabled}
            onRestart={handleRestart}
            onUndo={handleUndo}
            onToggleSound={handleToggleSound}
            onOpenTestModal={() => setIsTestModalOpen(true)}
            onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
          />
        </section>
      </main>

      {/* Footer Instructions */}
      <footer id="omok-app-footer" className="max-w-6xl mx-auto w-full text-center mt-5 pt-3 border-t border-[var(--border,#e4e4e7)] text-[11px] font-mono text-[var(--ink-secondary,#71717a)] flex flex-col sm:flex-row items-center justify-between gap-1">
        <span>© OMOK HIGH DENSITY • 사람 vs AI 자동 착수 대전</span>
        <span>교차점 클릭 착수 • AI 자동 500ms 계산 • 가로/세로/대각선 5목 판정</span>
      </footer>

      {/* Test Verification Modal */}
      <TestVerificationModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />

      {/* Standalone Single HTML Download Modal */}
      <DownloadHtmlModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />
    </div>
  );
}
