import React from 'react';
import { GameMode, Player, WinInfo, AIDifficulty, AIMoveTelemetry } from '../types';
import { AI_DIFFICULTIES } from '../utils/aiLogic';
import {
  RotateCcw,
  Undo2,
  Volume2,
  VolumeX,
  Download,
  CheckCircle2,
  Bot,
  User,
  Users,
  Loader2,
  Zap,
  Shield,
  Crosshair,
  Sparkles,
  GitCommit,
  Cpu,
} from 'lucide-react';

interface GameStatusProps {
  gameMode: GameMode;
  onChangeGameMode: (mode: GameMode) => void;
  aiDifficulty: AIDifficulty;
  onChangeAIDifficulty: (diff: AIDifficulty) => void;
  isAiThinking: boolean;
  latestAiTelemetry?: AIMoveTelemetry | null;
  humanColor: Player;
  aiColor: Player;
  currentPlayer: Player;
  isGameOver: boolean;
  winner: Player | null;
  winInfo: WinInfo | null;
  moveCount: number;
  blackStoneCount: number;
  whiteStoneCount: number;
  moveHistory: { row: number; col: number; player: Player }[];
  soundEnabled: boolean;
  onRestart: () => void;
  onUndo: () => void;
  onToggleSound: () => void;
  onOpenTestModal: () => void;
  onOpenDownloadModal: () => void;
}

const COL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];

const formatMoveCoord = (row: number, col: number) => {
  const colLetter = COL_LETTERS[col] || '?';
  const rowNum = 15 - row;
  return `${colLetter}${rowNum}`;
};

export const GameStatus: React.FC<GameStatusProps> = ({
  gameMode,
  onChangeGameMode,
  aiDifficulty,
  onChangeAIDifficulty,
  isAiThinking,
  latestAiTelemetry,
  humanColor,
  aiColor,
  currentPlayer,
  isGameOver,
  winner,
  winInfo,
  moveCount,
  blackStoneCount,
  whiteStoneCount,
  moveHistory,
  soundEnabled,
  onRestart,
  onUndo,
  onToggleSound,
  onOpenTestModal,
  onOpenDownloadModal,
}) => {
  const lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;
  const currentDiffConfig = AI_DIFFICULTIES.find((d) => d.id === aiDifficulty) || AI_DIFFICULTIES[3];

  const getDirectionKorean = (dir?: string) => {
    switch (dir) {
      case 'horizontal': return '가로 5목';
      case 'vertical': return '세로 5목';
      case 'diagonal-main': return '대각선 ↘ 5목';
      case 'diagonal-anti': return '대각선 ↗ 5목';
      default: return '5목';
    }
  };

  const isHumanTurn = gameMode === 'human-vs-ai' ? currentPlayer === humanColor : true;

  const getTurnTitle = () => {
    if (isGameOver) {
      if (gameMode === 'human-vs-ai') {
        return winner === humanColor ? '사람(나) 승리!' : '오목 AI 승리!';
      }
      return `${winner === 'BLACK' ? '흑돌(BLACK)' : '백돌(WHITE)'} 승리!`;
    }

    if (gameMode === 'human-vs-ai') {
      if (isAiThinking) {
        return 'AI 생각 중...';
      }
      return isHumanTurn ? '나의 차례 (흑돌)' : 'AI 차례 (백돌)';
    }

    return `${currentPlayer === 'BLACK' ? '흑돌(BLACK)' : '백돌(WHITE)'} 차례`;
  };

  const getSubDesc = () => {
    if (isGameOver) {
      return `${getDirectionKorean(winInfo?.direction)} 달성 • 게임 종료`;
    }
    if (gameMode === 'human-vs-ai') {
      if (isAiThinking) {
        return 'AI가 최적의 착수 위치를 계산하고 있습니다...';
      }
      return isHumanTurn ? '오목판의 빈 교차점을 터치하세요' : 'AI가 자동으로 수를 놓습니다';
    }
    return '교차점을 터치하여 착수하세요';
  };

  return (
    <div
      id="game-status-panel"
      className="w-full bg-[var(--bg-panel,#ffffff)] border border-[var(--border,#e4e4e7)] rounded-xl p-4 sm:p-5 shadow-sm space-y-4 flex flex-col justify-between"
    >
      {/* Panel Header */}
      <div className="border-b-2 border-[var(--ink-primary,#18181b)] pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-[var(--ink-primary,#18181b)] uppercase">
            오목 콘솔
          </h2>
          <p className="text-xs text-[var(--ink-secondary,#71717a)] font-medium">
            15 × 15 High Density Match
          </p>
        </div>
        <button
          type="button"
          id="btn-toggle-sound"
          onClick={onToggleSound}
          title={soundEnabled ? '효과음 끄기' : '효과음 켜기'}
          className="min-h-[40px] min-w-[40px] p-2 rounded-lg border border-[var(--border,#e4e4e7)] text-[var(--ink-secondary,#71717a)] hover:text-[var(--ink-primary,#18181b)] hover:bg-[var(--bg-page,#f4f4f5)] transition-colors cursor-pointer flex items-center justify-center touch-manipulation"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
        </button>
      </div>

      {/* Game Mode Selector */}
      <div className="bg-[var(--bg-page,#f4f4f5)] p-1 rounded-lg border border-[var(--border,#e4e4e7)] flex gap-1">
        <button
          type="button"
          id="mode-human-vs-ai"
          onClick={() => onChangeGameMode('human-vs-ai')}
          className={`flex-1 min-h-[40px] py-2 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation ${
            gameMode === 'human-vs-ai'
              ? 'bg-[var(--ink-primary,#18181b)] text-white shadow-xs'
              : 'text-[var(--ink-secondary,#71717a)] hover:text-[var(--ink-primary,#18181b)]'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>사람 vs AI</span>
        </button>

        <button
          type="button"
          id="mode-human-vs-human"
          onClick={() => onChangeGameMode('human-vs-human')}
          className={`flex-1 min-h-[40px] py-2 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation ${
            gameMode === 'human-vs-human'
              ? 'bg-[var(--ink-primary,#18181b)] text-white shadow-xs'
              : 'text-[var(--ink-secondary,#71717a)] hover:text-[var(--ink-primary,#18181b)]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>2인 대전</span>
        </button>
      </div>

      {/* Role Badges for AI Mode */}
      {gameMode === 'human-vs-ai' && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs font-medium">
            <div className="flex items-center gap-2 p-2 rounded-md bg-white border border-[var(--border,#e4e4e7)]">
              <span className="w-3.5 h-3.5 rounded-full bg-black shrink-0 border border-neutral-700 shadow-xs" />
              <div className="truncate">
                <span className="font-bold text-[var(--ink-primary,#18181b)]">사람 (나)</span>
                <span className="text-[10px] text-[var(--ink-secondary,#71717a)] block">흑돌 선공</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-md bg-white border border-[var(--border,#e4e4e7)]">
              <span className="w-3.5 h-3.5 rounded-full bg-white shrink-0 border border-neutral-400 shadow-xs" />
              <div className="truncate">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[var(--ink-primary,#18181b)]">AI ({currentDiffConfig.name})</span>
                </div>
                <span className="text-[10px] text-[var(--ink-secondary,#71717a)] block">{currentDiffConfig.depthDesc}</span>
              </div>
            </div>
          </div>

          {/* 4-Tier AI Difficulty Selection */}
          <div id="ai-difficulty-container" className="pt-1 space-y-1.5">
            <div className="flex items-center justify-between text-xs px-0.5">
              <span className="font-bold text-[var(--ink-primary,#18181b)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                AI 난이도 선택
              </span>
              <span className="text-[10px] font-mono text-[var(--ink-secondary,#71717a)]">
                {currentDiffConfig.winRateTarget}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1 p-1 bg-[var(--bg-page,#f4f4f5)] rounded-lg border border-[var(--border,#e4e4e7)]">
              {AI_DIFFICULTIES.map((diff) => {
                const isSelected = aiDifficulty === diff.id;
                let activeStyle = 'bg-stone-900 text-white shadow-xs';
                if (diff.id === 'master') activeStyle = 'bg-red-600 text-white shadow-xs ring-1 ring-red-400';
                else if (diff.id === 'advanced') activeStyle = 'bg-purple-600 text-white shadow-xs';
                else if (diff.id === 'intermediate') activeStyle = 'bg-blue-600 text-white shadow-xs';
                else if (diff.id === 'beginner') activeStyle = 'bg-emerald-600 text-white shadow-xs';

                return (
                  <button
                    key={diff.id}
                    type="button"
                    id={`btn-difficulty-${diff.id}`}
                    onClick={() => onChangeAIDifficulty(diff.id)}
                    className={`min-h-[44px] py-1.5 px-1 rounded-md text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer touch-manipulation ${
                      isSelected
                        ? activeStyle
                        : 'text-[var(--ink-secondary,#71717a)] hover:text-[var(--ink-primary,#18181b)] hover:bg-white/60 bg-transparent'
                    }`}
                  >
                    <span>{diff.name}</span>
                    <span className="text-[9px] font-normal opacity-85">
                      {diff.id === 'master'
                        ? '알파-베타'
                        : diff.id === 'advanced'
                        ? '미니맥스'
                        : diff.id === 'intermediate'
                        ? '공수강화'
                        : '입문자용'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Difficulty Description */}
            <div className="text-[11px] bg-amber-50/80 border border-amber-200 text-amber-950 px-2.5 py-2 rounded-md leading-relaxed flex items-start gap-1.5 shadow-xs">
              <div className="mt-0.5 shrink-0">
                {aiDifficulty === 'master' ? (
                  <Sparkles className="w-3.5 h-3.5 text-red-600" />
                ) : aiDifficulty === 'advanced' ? (
                  <Crosshair className="w-3.5 h-3.5 text-purple-600" />
                ) : aiDifficulty === 'intermediate' ? (
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                )}
              </div>
              <div>
                <strong className="font-bold text-[11px] text-stone-900 mr-1">
                  [{currentDiffConfig.name} • {currentDiffConfig.badge}]:
                </strong>
                <span className="text-stone-700">{currentDiffConfig.description}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game State Card */}
      <div
        id="status-card"
        className={`p-3.5 rounded-lg border transition-all ${
          isGameOver
            ? 'bg-orange-50/60 border-[var(--accent,#c2410c)]'
            : isAiThinking
            ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-400/20'
            : 'bg-[var(--bg-page,#f4f4f5)] border-[var(--border,#e4e4e7)]'
        }`}
      >
        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-secondary,#71717a)] mb-1.5 flex items-center justify-between">
          <span>Game State</span>
          {isGameOver ? (
            <span className="text-[var(--accent,#c2410c)] font-extrabold">FINISHED</span>
          ) : isAiThinking ? (
            <span className="text-amber-700 font-extrabold flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              AI THINKING
            </span>
          ) : (
            <span className="text-emerald-700 font-bold">READY</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Turn Stone Indicator */}
          <div
            id="status-stone-indicator"
            className={`w-8 h-8 rounded-full shrink-0 shadow-md border border-neutral-300 flex items-center justify-center ${
              isAiThinking ? 'animate-pulse ring-2 ring-amber-400' : ''
            }`}
            style={{
              background:
                (isGameOver ? winner === 'BLACK' : currentPlayer === 'BLACK')
                  ? 'radial-gradient(circle at 30% 30%, #444, #000)'
                  : 'radial-gradient(circle at 30% 30%, #fff, #ccc)',
            }}
          >
            {isGameOver ? (
              <span className="text-[10px] font-extrabold text-[#c2410c]">WIN</span>
            ) : isAiThinking ? (
              <Bot className="w-4 h-4 text-stone-700" />
            ) : null}
          </div>

          <div className="flex-1 min-w-0">
            <h3
              id="turn-message-text"
              className="text-base font-extrabold text-[var(--ink-primary,#18181b)] tracking-tight leading-tight truncate"
            >
              {getTurnTitle()}
            </h3>
            <p id="sub-status-desc" className="text-xs text-[var(--ink-secondary,#71717a)] mt-0.5 truncate">
              {getSubDesc()}
            </p>
          </div>
        </div>
      </div>

      {/* Live AI Search Telemetry HUD (사람 vs AI 모드 실시간 수읽기 지표) */}
      {gameMode === 'human-vs-ai' && (
        <div
          id="ai-telemetry-panel"
          className="p-3 bg-stone-900 text-stone-100 rounded-lg border border-stone-800 shadow-xs space-y-2 text-xs"
        >
          <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
            <span className="font-bold flex items-center gap-1.5 text-amber-400">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              AI 실시간 수읽기 & 탐색 지표
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-300">
              {currentDiffConfig.name} ({currentDiffConfig.targetDepth}수 탐색)
            </span>
          </div>

          {latestAiTelemetry ? (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                <div className="bg-stone-800/80 p-1.5 rounded">
                  <div className="text-stone-400">탐색 깊이</div>
                  <div className="font-bold text-amber-300 text-xs mt-0.5">{latestAiTelemetry.depth} Ply</div>
                </div>
                <div className="bg-stone-800/80 p-1.5 rounded">
                  <div className="text-stone-400">탐색 후보 수</div>
                  <div className="font-bold text-stone-200 text-xs mt-0.5">{latestAiTelemetry.candidateCount}개</div>
                </div>
                <div className="bg-stone-800/80 p-1.5 rounded">
                  <div className="text-stone-400">방문 노드</div>
                  <div className="font-bold text-stone-200 text-xs mt-0.5">{latestAiTelemetry.nodesVisited}개</div>
                </div>
                <div className="bg-stone-800/80 p-1.5 rounded">
                  <div className="text-stone-400">연산 시간</div>
                  <div className="font-bold text-emerald-400 text-xs mt-0.5">{latestAiTelemetry.timeMs}ms</div>
                </div>
              </div>

              {/* Principal Variation (AI 예측 수순) */}
              <div className="bg-stone-950/80 p-2 rounded border border-stone-800">
                <div className="text-[10px] text-stone-400 mb-1 flex items-center gap-1 font-semibold">
                  <GitCommit className="w-3 h-3 text-amber-400" />
                  예측 수순 (현재 수 → 상대 대응 → 다음 수 → 상대 대응):
                </div>
                <div className="flex items-center flex-wrap gap-1 font-mono text-[11px]">
                  {latestAiTelemetry.principalVariation.map((m, idx) => {
                    const isAIMove = idx % 2 === 0;
                    return (
                      <span
                        key={idx}
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isAIMove
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-stone-800 text-stone-300'
                        }`}
                      >
                        {idx === 0
                          ? `1.[착수] ${formatMoveCoord(m.row, m.col)}`
                          : idx === 1
                          ? `2.[상대] ${formatMoveCoord(m.row, m.col)}`
                          : idx === 2
                          ? `3.[다음] ${formatMoveCoord(m.row, m.col)}`
                          : `4.[대응] ${formatMoveCoord(m.row, m.col)}`}
                      </span>
                    );
                  })}
                </div>
                <div className="text-[9px] text-stone-400 mt-1">
                  가지치기 절감율: <strong className="text-stone-200">{latestAiTelemetry.pruningRate}%</strong> (
                  {latestAiTelemetry.nodesVisited} / {latestAiTelemetry.nodesTotalEstimated} 노드)
                </div>
              </div>
            </div>
          ) : (
            <div className="py-2 text-center text-stone-400 text-[11px]">
              {isAiThinking ? (
                <span className="flex items-center justify-center gap-1.5 text-amber-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Minimax & Alpha-Beta 가지치기 수읽기 계산 중...
                </span>
              ) : (
                '돌을 착수하면 AI의 4수 심층 수읽기(PV)와 탐색 노드가 실시간 표시됩니다.'
              )}
            </div>
          )}
        </div>
      )}

      {/* Info Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2.5 bg-[var(--bg-page,#f4f4f5)] rounded-lg border border-[var(--border,#e4e4e7)] text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-secondary,#71717a)]">
            흑돌 수
          </div>
          <div className="text-base font-extrabold text-[var(--ink-primary,#18181b)] mt-0.5">
            {blackStoneCount}
          </div>
        </div>

        <div className="p-2.5 bg-[var(--bg-page,#f4f4f5)] rounded-lg border border-[var(--border,#e4e4e7)] text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-secondary,#71717a)]">
            백돌 수
          </div>
          <div className="text-base font-extrabold text-[var(--ink-primary,#18181b)] mt-0.5">
            {whiteStoneCount}
          </div>
        </div>

        <div className="p-2.5 bg-[var(--bg-page,#f4f4f5)] rounded-lg border border-[var(--border,#e4e4e7)] text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-secondary,#71717a)]">
            총 착수
          </div>
          <div id="move-count-badge" className="text-base font-extrabold text-[var(--ink-primary,#18181b)] mt-0.5">
            {moveCount}
          </div>
        </div>

        <div className="p-2.5 bg-[var(--bg-page,#f4f4f5)] rounded-lg border border-[var(--border,#e4e4e7)] text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-secondary,#71717a)]">
            최근 위치
          </div>
          <div className="text-base font-mono font-extrabold text-[var(--ink-primary,#18181b)] mt-0.5">
            {lastMove ? formatMoveCoord(lastMove.row, lastMove.col) : '-'}
          </div>
        </div>
      </div>

      {/* Recent Move Log */}
      <div className="p-3 bg-[var(--bg-page,#f4f4f5)] rounded-lg border border-[var(--border,#e4e4e7)]">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-secondary,#71717a)] mb-1.5 flex items-center justify-between">
          <span>Recent Moves (최근 착수)</span>
          <span className="font-mono text-[10px]">{moveHistory.length} Moves</span>
        </div>
        <div className="font-mono text-[11px] leading-relaxed max-h-[85px] overflow-y-auto space-y-0.5 pr-1 text-[var(--ink-primary,#18181b)]">
          {moveHistory.length === 0 ? (
            <span className="text-[var(--ink-secondary,#71717a)] italic">
              아직 착수된 돌이 없습니다.
            </span>
          ) : (
            moveHistory
              .slice(-6)
              .reverse()
              .map((m, idx) => {
                const moveNum = moveHistory.length - idx;
                return (
                  <div key={`hist-${moveNum}`} className="flex items-center justify-between py-0.5 border-b border-[var(--border,#e4e4e7)]/60 last:border-b-0">
                    <span className="font-semibold text-[var(--ink-secondary,#71717a)]">
                      #{moveNum}
                    </span>
                    <span className="font-medium">
                      {m.player === 'BLACK' ? '● 흑돌' : '○ 백돌'}
                    </span>
                    <span className="font-bold text-[var(--ink-primary,#18181b)]">
                      {formatMoveCoord(m.row, m.col)}
                    </span>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Control Actions */}
      <div className="space-y-2 pt-1">
        {/* Primary Action: Restart */}
        <button
          type="button"
          id="btn-restart-game"
          onClick={onRestart}
          className="w-full min-h-[44px] py-2.5 px-4 rounded-lg bg-[var(--ink-primary,#18181b)] hover:bg-[#27272a] text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.99] flex items-center justify-center gap-2 shadow-xs cursor-pointer touch-manipulation"
        >
          <RotateCcw className="w-4 h-4" />
          다시 시작 (Reset Board)
        </button>

        {/* Secondary: Undo Move */}
        <button
          type="button"
          id="btn-undo-move"
          onClick={onUndo}
          disabled={moveCount === 0 || isGameOver || isAiThinking}
          className="w-full min-h-[44px] py-2 px-3 rounded-lg border border-[var(--border,#e4e4e7)] bg-white hover:bg-[var(--bg-page,#f4f4f5)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--ink-primary,#18181b)] text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
        >
          <Undo2 className="w-3.5 h-3.5" />
          한 수 무르기 (Undo)
        </button>

        {/* Utilities: Test Modal & Download */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            id="btn-open-tests"
            onClick={onOpenTestModal}
            className="min-h-[44px] py-2 px-2.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100/70 text-amber-900 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer truncate touch-manipulation"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">단계별 검증</span>
          </button>

          <button
            type="button"
            id="btn-open-download"
            onClick={onOpenDownloadModal}
            className="min-h-[44px] py-2 px-2.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100/70 text-blue-900 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer truncate touch-manipulation"
          >
            <Download className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">단일 HTML</span>
          </button>
        </div>
      </div>
    </div>
  );
};

