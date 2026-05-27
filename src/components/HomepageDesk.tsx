import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Chess, type Move as ChessMove, type Square } from "chess.js";

// Port of homepage-desk.jsx + chess.jsx + nav.jsx from the design bundle.
// Variation 03: DESK — wood-grain surface littered with paper artifacts.

// =========================================================================
// Palette
// =========================================================================

const D = {
  paper: "#f8f0d5",
  paperShadow: "#3a2410",
  postitYellow: "#f0d667",
  postitPink: "#e8b6b5",
  postitBlue: "#a8c4d4",
  indexCard: "#efe2bd",
  ink: "#1b1a17",
  ink2: "#3a3025",
  ink3: "#6e6450",
  red: "#a8331c",
  ochre: "#b88229",
  woodA: "#8a5d33",
  woodB: "#6e4828",
  woodC: "#5a3a1f",
  serif: '"Spectral", Georgia, serif',
  mono: '"IBM Plex Mono", ui-monospace, monospace',
};

const CANVAS_W = 1500;
const CANVAS_H = 3620;

const useFitWidth = (W: number) => {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(1.0, window.innerWidth / W));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [W]);
  return scale;
};

// =========================================================================
// Chess (ported from chess.jsx)
// =========================================================================

const CHESS_INK = "#1b1a17";
const CHESS_RED = "#a8331c";
const LIGHT_SQ = "#e8dec0";
const DARK_SQ = "#b08956";
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

type Color = "w" | "b";
type PieceType = "k" | "q" | "r" | "b" | "n" | "p";
type BoardPiece = { color: Color; type: PieceType } | null;
type Board = BoardPiece[][];
type BoardMove = [number, number, number, number];
type HistEntry = { by: [string, string]; mv: string; side: Color; n: number };

const GLYPH: Record<Color, Record<PieceType, string>> = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};

const squareName = (r: number, c: number) => "abcdefgh"[c] + (8 - r);
const coordsToSquare = (r: number, c: number) => squareName(r, c) as Square;
const squareToCoords = (square: string): [number, number] | null => {
  const file = "abcdefgh".indexOf(square[0]);
  const rank = Number(square[1]);
  if (file < 0 || rank < 1 || rank > 8) return null;
  return [8 - rank, file];
};

const uciToBoardMove = (uci: string): BoardMove | null => {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return null;
  const from = squareToCoords(uci.slice(0, 2));
  const to = squareToCoords(uci.slice(2, 4));
  if (!from || !to) return null;
  return [from[0], from[1], to[0], to[1]];
};

const uciToMoveInput = (uci: string) => {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return null;
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci[4] ?? "q",
  };
};

const castleTargetFromRook = (square: Square): Square | null => {
  if (square === "h1") return "g1";
  if (square === "a1") return "c1";
  return null;
};

const chessBoardToBoard = (rows: ReturnType<Chess["board"]>): Board =>
  rows.map((row) =>
    row.map((piece) =>
      piece
        ? { color: piece.color as Color, type: piece.type as PieceType }
        : null,
    ),
  );

const resultForGame = (game: Chess) => {
  if (!game.isGameOver()) return null;
  if (game.isCheckmate()) {
    return game.turn() === "w"
      ? "opponent wins by checkmate."
      : "you win by checkmate.";
  }
  if (game.isStalemate()) return "draw by stalemate.";
  if (game.isInsufficientMaterial()) return "draw by insufficient material.";
  if (game.isThreefoldRepetition()) return "draw by repetition.";
  if (game.isDrawByFiftyMoves()) return "draw by fifty-move rule.";
  return "draw.";
};

const QUEUE: [string, string][] = [
  ["anon-7f3a", "são paulo"],
  ["anon-2b91", "kyoto"],
  ["anon-c4d0", "lagos"],
  ["anon-9e22", "oslo"],
  ["anon-1b8f", "mumbai"],
  ["anon-44ac", "berlin"],
  ["anon-d018", "mexico city"],
  ["anon-3fee", "taipei"],
  ["anon-8a5b", "reykjavík"],
  ["anon-0c71", "buenos aires"],
  ["anon-5d31", "jakarta"],
  ["anon-eb19", "cairo"],
];

type ChessCtxValue = {
  board: Board;
  selected: [number, number] | null;
  lastMove: BoardMove | null;
  turn: Color;
  history: HistEntry[];
  gameOver: string | null;
  legals: BoardMove[];
  onSquare: (r: number, c: number) => void;
  reset: () => void;
  currentOpp: [string, string];
  nextOpp: [string, string];
  watching: number;
};

const ChessCtx = createContext<ChessCtxValue | null>(null);

const ChessGame = ({ children }: { children: ReactNode }) => {
  const gameRef = useRef(new Chess());
  const [board, setBoard] = useState<Board>(() =>
    chessBoardToBoard(gameRef.current.board()),
  );
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [lastMove, setLastMove] = useState<BoardMove | null>(null);
  const [turn, setTurn] = useState<Color>("w");
  const [history, setHistory] = useState<HistEntry[]>([]);
  const [queueIdx, setQueueIdx] = useState(0);
  const [moveNum, setMoveNum] = useState(1);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const engineRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (typeof Worker === "undefined") return;
    const engine = new Worker("/stockfish/stockfish.js");
    engineRef.current = engine;
    engine.postMessage("uci");
    engine.postMessage("isready");

    return () => {
      engine.terminate();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (turn !== "b" || gameOver) return;
    const engine = engineRef.current;
    const game = gameRef.current;
    const fen = game.fen();
    const opponent = QUEUE[queueIdx % QUEUE.length];
    let cancelled = false;

    const commitMove = (move: ChessMove | null, label: [string, string]) => {
      if (cancelled) return;
      if (!move) {
        setGameOver("you win. opponent has no legal moves.");
        return;
      }
      setBoard(chessBoardToBoard(game.board()));
      const boardMove = uciToBoardMove(move.lan) ?? [
        squareToCoords(move.from)?.[0] ?? 0,
        squareToCoords(move.from)?.[1] ?? 0,
        squareToCoords(move.to)?.[0] ?? 0,
        squareToCoords(move.to)?.[1] ?? 0,
      ];
      setLastMove(boardMove);
      setHistory((h) => [
        ...h,
        { by: label, mv: move.san, side: "b", n: moveNum },
      ]);
      setMoveNum((n) => n + 1);
      setQueueIdx((i) => i + 1);
      const result = resultForGame(game);
      if (result) setGameOver(result);
      else setTurn(game.turn() as Color);
    };

    const pickFallback = () => {
      const moves = game.moves({ verbose: true });
      if (!moves.length) return null;
      const move = moves[Math.floor(Math.random() * moves.length)];
      return game.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion ?? "q",
      });
    };

    if (!engine) {
      const t = window.setTimeout(() => {
        if (game.fen() !== fen) return;
        commitMove(pickFallback(), opponent);
      }, 700);
      return () => {
        cancelled = true;
        window.clearTimeout(t);
      };
    }

    const activeEngine = engine;
    const fallback = window.setTimeout(() => {
      activeEngine.removeEventListener("message", onMessage);
      if (game.fen() !== fen) return;
      commitMove(pickFallback(), opponent);
    }, 3200);

    function onMessage(event: MessageEvent<string>) {
      const line = String(event.data);
      if (!line.startsWith("bestmove ")) return;
      window.clearTimeout(fallback);
      activeEngine.removeEventListener("message", onMessage);
      const best = line.split(/\s+/)[1];
      if (game.fen() !== fen) return;
      const input = uciToMoveInput(best);
      commitMove(input ? game.move(input) : pickFallback(), opponent);
    }

    activeEngine.addEventListener("message", onMessage);
    activeEngine.postMessage("stop");
    activeEngine.postMessage(`position fen ${fen}`);
    activeEngine.postMessage("go movetime 650");

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
      activeEngine.removeEventListener("message", onMessage);
      activeEngine.postMessage("stop");
    };
  }, [turn, gameOver, moveNum, queueIdx]);

  const legals = useMemo(() => {
    if (!selected || turn !== "w") return [];
    const square = coordsToSquare(selected[0], selected[1]);
    return gameRef.current
      .moves({ square, verbose: true })
      .map((move) => {
        const to = squareToCoords(move.to);
        return to
          ? ([selected[0], selected[1], to[0], to[1]] as BoardMove)
          : null;
      })
      .filter((move): move is BoardMove => Boolean(move));
  }, [selected, turn, board]);

  const commitUserMove = (from: Square, to: Square, coords?: BoardMove) => {
    let move: ChessMove;
    try {
      move = gameRef.current.move({ from, to, promotion: "q" });
    } catch {
      return false;
    }
    const fromCoords = squareToCoords(from);
    const toCoords = squareToCoords(to);
    setBoard(chessBoardToBoard(gameRef.current.board()));
    setLastMove(
      coords ?? [
        fromCoords?.[0] ?? 0,
        fromCoords?.[1] ?? 0,
        toCoords?.[0] ?? 0,
        toCoords?.[1] ?? 0,
      ],
    );
    setHistory((h) => [
      ...h,
      { by: ["you", "right here"], mv: move.san, side: "w", n: moveNum },
    ]);
    setSelected(null);
    const result = resultForGame(gameRef.current);
    if (result) setGameOver(result);
    else setTurn(gameRef.current.turn() as Color);
    return true;
  };

  const tryCastleFromRookClick = (rookSquare: Square) => {
    const target = castleTargetFromRook(rookSquare);
    if (!target) return false;
    const legalCastle = gameRef.current
      .moves({ square: "e1", verbose: true })
      .find(
        (move) =>
          move.to === target &&
          (move.isKingsideCastle() || move.isQueensideCastle()),
      );
    if (!legalCastle) return false;
    return commitUserMove("e1", target);
  };

  const onSquare = (r: number, c: number) => {
    if (turn !== "w" || gameOver) return;
    const piece = board[r][c];
    const square = coordsToSquare(r, c);
    if (selected) {
      const hit = legals.find((move) => move[2] === r && move[3] === c);
      if (hit) {
        commitUserMove(coordsToSquare(selected[0], selected[1]), square, hit);
        return;
      }
      const selectedPiece = board[selected[0]][selected[1]];
      if (
        selectedPiece?.color === "w" &&
        selectedPiece.type === "k" &&
        piece?.color === "w" &&
        piece.type === "r" &&
        tryCastleFromRookClick(square)
      ) {
        return;
      }
    }
    if (
      piece?.color === "w" &&
      piece.type === "r" &&
      tryCastleFromRookClick(square)
    ) {
      return;
    }
    if (piece && piece.color === "w") setSelected([r, c]);
    else setSelected(null);
  };

  const reset = () => {
    gameRef.current.reset();
    setBoard(chessBoardToBoard(gameRef.current.board()));
    setSelected(null);
    setLastMove(null);
    setTurn("w");
    setHistory([]);
    setMoveNum(1);
    setGameOver(null);
    engineRef.current?.postMessage("ucinewgame");
  };

  const value: ChessCtxValue = {
    board,
    selected,
    lastMove,
    turn,
    history,
    gameOver,
    legals,
    onSquare,
    reset,
    currentOpp: QUEUE[queueIdx % QUEUE.length],
    nextOpp: QUEUE[(queueIdx + 1) % QUEUE.length],
    watching: 23 + ((queueIdx * 3) % 47),
  };

  return <ChessCtx.Provider value={value}>{children}</ChessCtx.Provider>;
};

const useChess = () => useContext(ChessCtx);

const PieceGlyph = ({ p, size }: { p: BoardPiece; size: number }) => {
  if (!p) return null;
  const pieceScale = p.type === "p" ? 0.66 : 0.78;

  return (
    <span
      style={{
        font: `${size * pieceScale}px/${size}px "Segoe UI Symbol", "Apple Color Emoji", "Noto Sans Symbols 2", system-ui`,
        color: CHESS_INK,
        userSelect: "none",
        WebkitFontSmoothing: "antialiased",
        transform: p.type === "p" ? "translateY(1px)" : undefined,
      }}
    >
      {GLYPH[p.color][p.type]}
    </span>
  );
};

const ChessBoardOnly = ({ size = 480 }: { size?: number }) => {
  const ctx = useChess();
  if (!ctx) return null;
  const { board, selected, lastMove, turn, gameOver, legals, onSquare } = ctx;
  const sq = size / 8;
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        boxShadow: `0 1px 0 ${CHESS_INK}22, 0 18px 40px -20px ${CHESS_INK}55`,
        border: `1px solid ${CHESS_INK}55`,
      }}
    >
      {board.map((row, r) =>
        row.map((piece, c) => {
          const isLight = (r + c) % 2 === 0;
          const isSel = selected && selected[0] === r && selected[1] === c;
          const isLast =
            lastMove &&
            ((lastMove[0] === r && lastMove[1] === c) ||
              (lastMove[2] === r && lastMove[3] === c));
          const legalDot = legals.find(
            (move) => move[2] === r && move[3] === c,
          );
          const isCapture = legalDot && board[r][c];
          return (
            <div
              key={`${r}-${c}`}
              data-square={squareName(r, c)}
              onClick={() => onSquare(r, c)}
              style={{
                position: "absolute",
                left: c * sq,
                top: r * sq,
                width: sq,
                height: sq,
                background: isLight ? LIGHT_SQ : DARK_SQ,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: turn === "w" && !gameOver ? "pointer" : "default",
                boxShadow: isSel
                  ? `inset 0 0 0 3px ${CHESS_RED}`
                  : isLast
                    ? `inset 0 0 0 2px ${CHESS_RED}55`
                    : "none",
              }}
            >
              {c === 0 && (
                <span
                  style={{
                    position: "absolute",
                    left: 4,
                    top: 2,
                    font: `500 9px ${MONO}`,
                    color: isLight ? DARK_SQ : LIGHT_SQ,
                    opacity: 0.9,
                  }}
                >
                  {8 - r}
                </span>
              )}
              {r === 7 && (
                <span
                  style={{
                    position: "absolute",
                    right: 4,
                    bottom: 2,
                    font: `500 9px ${MONO}`,
                    color: isLight ? DARK_SQ : LIGHT_SQ,
                    opacity: 0.9,
                  }}
                >
                  {"abcdefgh"[c]}
                </span>
              )}
              <PieceGlyph p={piece} size={sq} />
              {legalDot && !isCapture && (
                <span
                  style={{
                    position: "absolute",
                    width: sq * 0.22,
                    height: sq * 0.22,
                    borderRadius: 999,
                    background: `${CHESS_INK}55`,
                    pointerEvents: "none",
                  }}
                />
              )}
              {legalDot && isCapture && (
                <span
                  style={{
                    position: "absolute",
                    inset: 4,
                    borderRadius: 999,
                    border: `3px solid ${CHESS_RED}88`,
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          );
        }),
      )}
      {gameOver && (
        <div
          className="animate-fade-in"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(27,26,23,0.28)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              minWidth: size * 0.48,
              maxWidth: size * 0.76,
              background: D.paper,
              color: D.ink,
              border: `1px solid ${D.ink}55`,
              boxShadow: "0 16px 32px rgba(20,8,0,0.35)",
              padding: "18px 22px",
              textAlign: "center",
              transform: "rotate(-2deg)",
            }}
          >
            <div
              style={{
                font: `600 11px ${D.mono}`,
                color: D.red,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              result
            </div>
            <div
              style={{
                font: `italic 28px/1.05 ${D.serif}`,
                color: D.ink,
              }}
            >
              {gameOver}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// Desk surface
// =========================================================================

const DeskBg = () => (
  <>
    <div
      style={{ position: "absolute", inset: 0, background: D.woodB, zIndex: 0 }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(ellipse 1100px 900px at 38% 18%, rgba(160,110,60,0.55), transparent 70%)",
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `repeating-linear-gradient(91deg, rgba(70,40,15,0.16) 0 1px, transparent 1px 6px), repeating-linear-gradient(91deg, rgba(255,220,170,0.05) 0 1px, transparent 1px 13px), repeating-linear-gradient(91deg, rgba(40,20,5,0.08) 0 2px, transparent 2px 22px)`,
        mixBlendMode: "overlay",
        pointerEvents: "none",
        zIndex: 2,
      }}
    />
    <svg
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 2,
        pointerEvents: "none",
      }}
    >
      <g stroke="rgba(40,20,5,0.16)" fill="none" strokeWidth="1.1">
        <ellipse cx="120" cy="1480" rx="46" ry="15" />
        <ellipse cx="120" cy="1480" rx="30" ry="10" />
        <ellipse cx="120" cy="1480" rx="16" ry="5" />
        <ellipse cx="1340" cy="980" rx="38" ry="13" />
        <ellipse cx="1340" cy="980" rx="24" ry="8" />
        <ellipse cx="1340" cy="980" rx="12" ry="4" />
      </g>
    </svg>
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(ellipse at 50% 40%, transparent 65%, rgba(0,0,0,0.28) 100%)",
        pointerEvents: "none",
        zIndex: 3,
      }}
    />
  </>
);

// =========================================================================
// Helpers
// =========================================================================

const Item = ({
  x,
  y,
  w,
  h,
  rotate = 0,
  z = 10,
  children,
  style,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number;
  z?: number;
  children: ReactNode;
  style?: CSSProperties;
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      transform: `rotate(${rotate}deg)`,
      transformOrigin: "center",
      filter: `drop-shadow(0 10px 18px rgba(20,8,0,0.35))`,
      zIndex: z,
      ...style,
    }}
  >
    {children}
  </div>
);

const HandLabel = ({
  x,
  y,
  rotate = 0,
  children,
  color = "#e8d0a4",
  size = 28,
}: {
  x: number;
  y: number;
  rotate?: number;
  children: ReactNode;
  color?: string;
  size?: number;
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `rotate(${rotate}deg)`,
      transformOrigin: "left center",
      font: `italic 300 ${size}px "Spectral", Georgia, serif`,
      color,
      letterSpacing: "0.02em",
      opacity: 0.92,
      textShadow: "0 1px 2px rgba(0,0,0,0.4)",
      zIndex: 8,
      whiteSpace: "nowrap",
      pointerEvents: "none",
    }}
  >
    {children}
  </div>
);

// =========================================================================
// Letter — bio
// =========================================================================

const getSeasonStamp = () => {
  const now = new Date();
  const month = now.getMonth();
  const season =
    month < 2 || month === 11
      ? "winter"
      : month < 5
        ? "spring"
        : month < 8
          ? "summer"
          : "fall";
  return `${season} '${String(now.getFullYear()).slice(-2)}`;
};

const Letter = ({
  x,
  y,
  rotate = 0,
}: {
  x: number;
  y: number;
  rotate?: number;
}) => {
  const seasonStamp = getSeasonStamp();

  return (
    <Item x={x} y={y} w={580} h={440} rotate={rotate} z={14}>
      <div
        style={{
          width: "100%",
          height: "100%",
          background: D.paper,
          padding: "36px 42px",
          position: "relative",
          boxShadow: "inset 0 0 80px rgba(80,55,20,0.10)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.06)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 30,
            top: 32,
            font: `500 10px ${D.mono}`,
            color: D.red,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            border: `1px solid ${D.red}88`,
            padding: "4px 9px",
            transform: "rotate(3deg)",
          }}
        >
          {seasonStamp} · fol. 01
        </div>

        <div
          style={{
            font: `400 13px ${D.mono}`,
            color: D.ink3,
            marginBottom: 6,
            letterSpacing: "0.04em",
          }}
        >
          hi, my name is —
        </div>
        <div
          style={{
            font: `400 62px/0.95 "Spectral"`,
            color: D.ink,
            letterSpacing: "-0.02em",
          }}
        >
          sung jae{" "}
          <span style={{ fontStyle: "italic", fontWeight: 300 }}>bae</span>.
        </div>
        <div
          style={{
            font: `italic 16px/1.4 "Spectral"`,
            color: D.ink2,
            marginTop: 12,
            marginBottom: 16,
            paddingBottom: 14,
            borderBottom: `1px solid ${D.ink}22`,
          }}
        >
          — i like to think and build.
        </div>

        <div
          style={{
            font: `400 15px/1.65 "Spectral"`,
            color: D.ink,
            maxWidth: 480,
          }}
        >
          Lead MLE at an ml company in high school. Made a club to build
          real-world solutions for problems students face at college, with
          thousands of users. Did research in neuroscience, continual learning,
          and aging at Univ Rochester. Now in SF, trying to make better AI and
          figure out the next thing.
        </div>

        <div
          style={{
            position: "absolute",
            left: 42,
            right: 42,
            bottom: 28,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            paddingTop: 14,
            borderTop: `1px solid ${D.ink}22`,
          }}
        >
          <div style={{ font: `400 14px/1.7 "Spectral"`, color: D.ink }}>
            {[
              ["github", "https://github.com/sjbaebae"],
              ["linkedin", "https://linkedin.com/in/sungjaebae"],
              ["x", "https://x.com/sunjaebae"],
              ["say hi", "mailto:sbae703@gmail.com"],
            ].map(([label, href], i) => (
              <a
                key={label}
                href={href}
                target={href.startsWith("mailto:") ? undefined : "_blank"}
                rel={href.startsWith("mailto:") ? undefined : "noopener"}
                style={{
                  borderBottom: `1px solid ${D.ochre}`,
                  marginRight: i === 3 ? 0 : 14,
                  color: "inherit",
                  textDecoration: "none",
                }}
              >
                {label}
              </a>
            ))}
          </div>
          <div
            style={{
              font: `italic 12.5px "Spectral"`,
              color: D.red,
              whiteSpace: "nowrap",
            }}
          >
            ↳ then play me →
          </div>
        </div>
      </div>
    </Item>
  );
};

// =========================================================================
// Polaroid (uses real image src)
// =========================================================================

const Polaroid = ({
  x,
  y,
  w = 280,
  rotate = 0,
  src,
  caption,
  dateNote,
  z = 12,
}: {
  x: number;
  y: number;
  w?: number;
  rotate?: number;
  src?: string;
  caption: ReactNode;
  dateNote?: string;
  z?: number;
}) => (
  <Item x={x} y={y} w={w} h={w * 1.22} rotate={rotate} z={z}>
    <div
      style={{
        width: "100%",
        height: "100%",
        background: D.paper,
        padding: 14,
        paddingBottom: 50,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: "#1b1a17",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {src ? (
          <img
            src={src}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              font: `500 10px ${D.mono}`,
              color: "#dcc28a",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            no photo
          </div>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 12,
          font: `400 16px "Spectral", Georgia, serif`,
          color: D.ink2,
          fontStyle: "italic",
          textAlign: "center",
        }}
      >
        {caption}
        {dateNote && (
          <div
            style={{
              font: `400 11px ${D.mono}`,
              color: D.red,
              marginTop: 2,
              fontStyle: "normal",
            }}
          >
            {dateNote}
          </div>
        )}
      </div>
    </div>
    <div
      style={{
        position: "absolute",
        top: -10,
        left: "40%",
        width: 56,
        height: 22,
        background: "rgba(220,210,170,0.5)",
        border: "1px solid rgba(180,170,120,0.4)",
        transform: "rotate(-4deg)",
      }}
    />
  </Item>
);

// =========================================================================
// Chess on desk
// =========================================================================

const ChessStatusInline = () => {
  const ctx = useChess();
  if (!ctx) return null;
  const { turn, gameOver, currentOpp, watching } = ctx;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        color: "#dcc28a",
        marginLeft: "auto",
      }}
    >
      <span>watching · {watching}</span>
      <span>
        {gameOver ? (
          gameOver
        ) : turn === "w" ? (
          "your move"
        ) : (
          <>
            {currentOpp[0]} <span style={{ color: "#b39a64" }}>· thinking</span>
          </>
        )}
      </span>
    </span>
  );
};

const ChessOnDesk = ({
  x,
  y,
  rotate = 0,
}: {
  x: number;
  y: number;
  rotate?: number;
}) => {
  const BOARD_SIZE = 480;
  return (
    <Item
      x={x}
      y={y}
      w={BOARD_SIZE + 60}
      h={BOARD_SIZE + 110}
      rotate={rotate}
      z={20}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          background: `linear-gradient(135deg, #4a3318 0%, #6b4824 50%, #4a3318 100%)`,
          padding: 24,
          paddingBottom: 56,
          boxShadow:
            "inset 0 0 0 1px rgba(0,0,0,0.5), inset 0 0 28px rgba(0,0,0,0.4)",
          position: "relative",
        }}
      >
        <ChessBoardOnly size={BOARD_SIZE} />
        <div
          style={{
            position: "absolute",
            left: 24,
            right: 24,
            bottom: 14,
            font: `500 11px ${D.mono}`,
            color: "#dcc28a",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: "#d96b3a",
                boxShadow: "0 0 6px #d96b3a",
              }}
            />
            board open
          </span>
          <ChessStatusInline />
        </div>
      </div>
    </Item>
  );
};

// =========================================================================
// Clipboard — move log
// =========================================================================

const Clipboard = ({
  x,
  y,
  rotate = 0,
}: {
  x: number;
  y: number;
  rotate?: number;
}) => {
  const ctx = useChess();
  return (
    <Item x={x} y={y} w={300} h={460} rotate={rotate} z={15}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: -8,
          width: 72,
          height: 30,
          transform: "translateX(-50%)",
          background: "linear-gradient(180deg, #b8b0a0, #6a665a 70%, #4a4640)",
          borderRadius: 4,
          border: "1px solid #2a2620",
          zIndex: 2,
        }}
      />
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(180deg, #6a4f2a, #4a3318)",
          padding: 18,
          paddingTop: 32,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: D.paper,
            padding: "16px 18px",
            font: `400 12px/1.55 ${D.mono}`,
            color: D.ink,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              font: `500 11px ${D.mono}`,
              color: D.red,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              paddingBottom: 8,
              borderBottom: `1px solid ${D.ink}33`,
            }}
          >
            move log · live
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column-reverse",
            }}
          >
            <div>
              {ctx?.history.length === 0 && (
                <div
                  style={{
                    color: D.ink2,
                    fontStyle: "italic",
                    fontFamily: D.serif,
                    fontSize: 13,
                  }}
                >
                  ↳ no moves yet. start by clicking any white piece.
                </div>
              )}
              {ctx?.history.map((h, i) => (
                <div
                  key={i}
                  style={{ display: "flex", gap: 6, padding: "2px 0" }}
                >
                  <span style={{ color: D.ink2, width: 24 }}>
                    {h.side === "w" ? `${h.n}.` : ""}
                  </span>
                  <span
                    style={{
                      width: 54,
                      fontWeight: 500,
                      color: h.side === "w" ? D.red : D.ink,
                    }}
                  >
                    {h.mv}
                  </span>
                  <span
                    style={{
                      color: D.ink2,
                      fontSize: 11,
                      fontStyle: "italic",
                      fontFamily: D.serif,
                    }}
                  >
                    {h.side === "w" ? "you" : h.by[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              paddingTop: 8,
              borderTop: `1px dashed ${D.ink}33`,
              font: `400 10.5px/1.4 ${D.mono}`,
              color: D.ink2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <span>
              next · <span style={{ color: D.ink }}>{ctx?.nextOpp[0]}</span>
              <br />
              <span style={{ color: D.ink2, opacity: 0.7 }}>
                {ctx?.nextOpp[1]}
              </span>
            </span>
            <button
              onClick={() => ctx?.reset()}
              style={{
                font: `500 10px ${D.mono}`,
                color: D.ink,
                background: "transparent",
                border: `1px solid ${D.ink}55`,
                padding: "4px 8px",
                cursor: "pointer",
              }}
            >
              new ↻
            </button>
          </div>
        </div>
      </div>
    </Item>
  );
};

// =========================================================================
// Scrap (paper note)
// =========================================================================

const Scrap = ({
  x,
  y,
  rotate = 0,
  w = 320,
  h = 90,
  color = D.paper,
  dateLabel,
  tag,
  title,
  body,
}: {
  x: number;
  y: number;
  rotate?: number;
  w?: number;
  h?: number;
  color?: string;
  dateLabel?: string;
  tag?: string;
  title?: ReactNode;
  body?: ReactNode;
}) => (
  <Item x={x} y={y} w={w} h={h} rotate={rotate} z={12}>
    <div
      style={{
        width: "100%",
        height: "100%",
        background: color,
        padding: "10px 14px",
        fontFamily: D.serif,
        color: D.ink,
        position: "relative",
      }}
    >
      <div
        style={{
          font: `500 9px ${D.mono}`,
          color: D.red,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>{tag}</span>
        <span style={{ color: D.ink2 }}>{dateLabel}</span>
      </div>
      <div style={{ font: `400 14.5px/1.35 "Spectral"`, marginTop: 6 }}>
        {title}
      </div>
      {body && (
        <div
          style={{
            font: `italic 12px/1.4 "Spectral"`,
            color: D.ink2,
            marginTop: 4,
          }}
        >
          {body}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
          borderStyle: "solid",
          borderWidth: "0 0 16px 16px",
          borderColor: `transparent transparent rgba(0,0,0,0.08) transparent`,
        }}
      />
    </div>
  </Item>
);

const ScrollHint = ({ x, y }: { x: number; y: number }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      font: `italic 18px "Spectral", Georgia, serif`,
      color: "#e8d0a4",
      opacity: 0.7,
      textShadow: "0 1px 2px rgba(0,0,0,0.4)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
      zIndex: 8,
      pointerEvents: "none",
    }}
  >
    <span>↓</span>
    <span
      style={{
        font: `500 11px "IBM Plex Mono"`,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
      }}
    >
      the desk continues
    </span>
  </div>
);

// =========================================================================
// Project thumbnails
// =========================================================================

const ThumbBox = ({
  children,
  bg = D.paper,
}: {
  children: ReactNode;
  bg?: string;
}) => (
  <div
    style={{
      width: 140,
      height: 140,
      background: bg,
      border: `1px solid ${D.ink}44`,
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)",
    }}
  >
    {children}
  </div>
);

const ThumbImage = ({ src, alt }: { src: string; alt: string }) => (
  <ThumbBox bg={D.ink}>
    <img
      src={src}
      alt={alt}
      loading="lazy"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
        filter: "saturate(0.92) contrast(0.98)",
      }}
    />
  </ThumbBox>
);

const ThumbClinic = () => (
  <ThumbBox bg="#f4e8c5">
    <svg viewBox="0 0 80 80" width="100%" height="100%">
      <rect width="80" height="80" fill="#f4e8c5" />
      <rect
        x="22"
        y="18"
        width="42"
        height="50"
        fill="#fffbe8"
        stroke="#1b1a17"
        strokeWidth="1"
      />
      <line x1="26" y1="26" x2="58" y2="26" stroke="#1b1a1755" />
      <line x1="26" y1="32" x2="54" y2="32" stroke="#1b1a1755" />
      <line x1="26" y1="38" x2="56" y2="38" stroke="#1b1a1755" />
      <line x1="26" y1="44" x2="50" y2="44" stroke="#1b1a1755" />
      <path
        d="M14 22 q-2 14 6 22 q8 6 14 -4"
        fill="none"
        stroke="#a8331c"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="35" cy="42" r="5" fill="#a8331c" />
      <circle cx="35" cy="42" r="2.5" fill="#1b1a17" />
      <circle cx="14" cy="22" r="2.5" fill="#1b1a17" />
      <text
        x="50"
        y="62"
        fontFamily="IBM Plex Mono"
        fontSize="12"
        fontWeight="600"
        fill="#1b1a17"
      >
        (λ)
      </text>
    </svg>
  </ThumbBox>
);

const ThumbCircuits = () => (
  <ThumbBox bg="#e8e1d2">
    <svg viewBox="0 0 80 80" width="100%" height="100%">
      <rect width="80" height="80" fill="#e8e1d2" />
      <g fill="none" stroke="#1b1a1799" strokeWidth="0.4">
        <path d="M19 22 L36 15 M19 22 L36 30 M19 22 L36 45 M19 40 L36 30 M19 40 L36 45 M19 40 L36 60 M19 58 L36 45 M19 58 L36 60 M44 15 L61 25 M44 30 L61 25 M44 30 L61 40 M44 45 L61 40 M44 45 L61 55 M44 60 L61 55" />
      </g>
      <g stroke="#1b1a17" strokeWidth="0.8">
        <circle cx="15" cy="22" r="4" fill="#a8331c" />
        <circle cx="15" cy="40" r="4" fill="#a8331c" />
        <circle cx="15" cy="58" r="4" fill="#a8331c" />
        <circle cx="40" cy="15" r="4" fill="#b88229" />
        <circle cx="40" cy="30" r="4" fill="#b88229" />
        <circle cx="40" cy="45" r="4" fill="#5a7a3f" />
        <circle cx="40" cy="60" r="4" fill="#b88229" />
        <circle cx="65" cy="25" r="4" fill="#a8331c" />
        <circle cx="65" cy="40" r="4" fill="#a8331c" />
        <circle cx="65" cy="55" r="4" fill="#a8331c" />
        <circle
          cx="40"
          cy="45"
          r="7"
          stroke="#5a7a3f"
          strokeWidth="1.5"
          fill="none"
        />
      </g>
      <text
        x="40"
        y="75"
        textAnchor="middle"
        fontFamily="IBM Plex Mono"
        fontSize="6"
        fill="#5a7a3f"
        fontWeight="600"
      >
        head 6 →
      </text>
    </svg>
  </ThumbBox>
);

const ThumbMatch = () => (
  <ThumbBox bg="#7a9d5a">
    <svg viewBox="0 0 80 80" width="100%" height="100%">
      <defs>
        <marker
          id="arrM"
          viewBox="0 0 6 6"
          refX="5"
          refY="3"
          markerWidth="4"
          markerHeight="4"
          orient="auto"
        >
          <path d="M0 0 L6 3 L0 6 z" fill="#1b1a17" />
        </marker>
      </defs>
      <rect width="80" height="80" fill="#7a9d5a" />
      <rect
        x="6"
        y="10"
        width="68"
        height="60"
        fill="none"
        stroke="#f5e8c5"
        strokeWidth="1.2"
      />
      <line x1="40" y1="10" x2="40" y2="70" stroke="#f5e8c5" strokeWidth="1" />
      <circle
        cx="40"
        cy="40"
        r="8"
        fill="none"
        stroke="#f5e8c5"
        strokeWidth="1"
      />
      <rect
        x="6"
        y="28"
        width="8"
        height="24"
        fill="none"
        stroke="#f5e8c5"
        strokeWidth="1"
      />
      <rect
        x="66"
        y="28"
        width="8"
        height="24"
        fill="none"
        stroke="#f5e8c5"
        strokeWidth="1"
      />
      <g fill="none" stroke="#1b1a17" strokeWidth="0.8" markerEnd="url(#arrM)">
        <path d="M20 55 L29 39" />
        <path d="M30 38 L49 23" />
        <path d="M50 22 L57 41" />
        <path d="M58 42 L51 57" />
      </g>
      <g>
        <circle cx="20" cy="55" r="2.5" fill="#a8331c" />
        <circle cx="30" cy="38" r="2.5" fill="#a8331c" />
        <circle cx="50" cy="22" r="2.5" fill="#a8331c" />
        <circle cx="58" cy="42" r="2.5" fill="#a8331c" />
        <circle cx="50" cy="58" r="2.5" fill="#a8331c" />
      </g>
    </svg>
  </ThumbBox>
);

const ThumbFebrile = () => (
  <ThumbBox bg="#f0e0d5">
    <svg viewBox="0 0 80 80" width="100%" height="100%">
      <rect width="80" height="80" fill="#f0e0d5" />
      <line x1="12" y1="66" x2="72" y2="66" stroke="#1b1a17" strokeWidth="1" />
      <line x1="12" y1="12" x2="12" y2="66" stroke="#1b1a17" strokeWidth="1" />
      <line
        x1="12"
        y1="30"
        x2="72"
        y2="30"
        stroke="#1b1a1755"
        strokeWidth="0.6"
        strokeDasharray="2 2"
      />
      <text
        x="70"
        y="28"
        textAnchor="end"
        fontFamily="IBM Plex Mono"
        fontSize="5"
        fill="#1b1a1788"
      >
        sepsis
      </text>
      <path
        d="M12 56 Q22 54, 28 50 T44 38 Q52 30, 60 18 L66 14"
        fill="none"
        stroke="#a8331c"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  </ThumbBox>
);

const ThumbSite = () => (
  <ThumbBox bg="#1b1a17">
    <svg viewBox="0 0 80 80" width="100%" height="100%">
      <rect width="80" height="80" fill="#1b1a17" />
      <rect x="6" y="14" width="68" height="54" fill="#f1ead6" />
      <rect x="6" y="14" width="68" height="6" fill="#d4c198" />
      <circle cx="10" cy="17" r="1" fill="#a8331c" />
      <circle cx="14" cy="17" r="1" fill="#b88229" />
      <circle cx="18" cy="17" r="1" fill="#5a7a3f" />
      <g transform="translate(40 26)">
        <rect width="30" height="30" fill="#e8dec0" />
        <g fill="#b08956">
          <rect x="0" y="0" width="7.5" height="7.5" />
          <rect x="15" y="0" width="7.5" height="7.5" />
          <rect x="7.5" y="7.5" width="7.5" height="7.5" />
          <rect x="22.5" y="7.5" width="7.5" height="7.5" />
          <rect x="0" y="15" width="7.5" height="7.5" />
          <rect x="15" y="15" width="7.5" height="7.5" />
          <rect x="7.5" y="22.5" width="7.5" height="7.5" />
          <rect x="22.5" y="22.5" width="7.5" height="7.5" />
        </g>
      </g>
    </svg>
  </ThumbBox>
);

const ThumbTinyCnn = () => (
  <ThumbBox bg="#071018">
    <img
      src="/tiny_cnn.png"
      alt=""
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
      }}
    />
  </ThumbBox>
);

const PROJECT_THUMBS: Record<string, ReactNode> = {
  clinic: <ThumbClinic />,
  circuits: <ThumbCircuits />,
  match: <ThumbMatch />,
  febrile: <ThumbFebrile />,
  site: <ThumbSite />,
  tinycnn: <ThumbTinyCnn />,
  quizvoyage: (
    <ThumbImage src="/projects/quiz-voyage.png" alt="Quiz Voyage screenshot" />
  ),
  powersearch: (
    <ThumbImage src="/projects/powersearch.png" alt="PowerSearch thumbnail" />
  ),
};

// =========================================================================
// Projects binder page
// =========================================================================

const ProjectsPage = ({
  x,
  y,
  rotate = 0,
}: {
  x: number;
  y: number;
  rotate?: number;
}) => {
  const rows: {
    thumb: string;
    year: string;
    name: string;
    href?: string;
    blurb: ReactNode;
  }[] = [
    {
      thumb: "tinycnn",
      year: "2026",
      name: "tiny_cnn",
      href: "https://github.com/sjbaebae/tiny_cnn",
      blurb: (
        <>
          MNIST from scratch: raw IDX parsing, hand-written training loops, and
          CNN layers that peel PyTorch back toward NumPy. The visualizer shows
          learned conv filters and live digit predictions.
        </>
      ),
    },
    {
      thumb: "circuits",
      year: "2026",
      name: "wisp",
      href: "https://github.com/sjbaebae/wisp",
      blurb: (
        <>
          Natural-language workflow automation over MCP tools. It searches
          available tools, builds a parallel execution DAG, and routes work
          through a live backend.
        </>
      ),
    },
    {
      thumb: "match",
      year: "2026",
      name: "sutro-problems",
      href: "https://github.com/cybertronai/sutro-problems/pulls?q=author%3Asjbaebae",
      blurb: (
        <>
          Reproducible problems for energy-efficient learning research. Added
          records for matmul, sparse-parity records, and weighted-lifetime
          submissions.
        </>
      ),
    },
    {
      thumb: "site",
      year: "2026",
      name: "ByteDMD",
      href: "https://github.com/cybertronai/ByteDMD/pulls?q=author%3Asjbaebae",
      blurb: <>Data movement distance experiments.</>,
    },
    {
      thumb: "quizvoyage",
      year: "2023",
      name: "Quiz Voyage",
      href: "https://devpost.com/software/quiz-voyage",
      blurb: (
        <>
          DandyHacks winner: a generative-AI study game where students upload
          notes, fight quizzes as battles, and get guided by a virtual tutor.
        </>
      ),
    },
    {
      thumb: "febrile",
      year: "2026",
      name: "cactograd",
      href: "https://github.com/sjbaebae/cactograd",
      blurb: (
        <>
          On-device autograd for Cactus: reverse-mode differentiation over
          compute graphs, hand-written ARM-SIMD backward kernels, and a
          trainable engine path for local fine-tuning.
        </>
      ),
    },
    {
      thumb: "powersearch",
      year: "2020",
      name: "PowerSearch",
      href: "https://devpost.com/software/powersearch",
      blurb: (
        <>
          Internet-scale retrieval assistant before RAG: query expansion, web
          scraping, source retrieval, and LLM/NLP summarization into condensed
          answers for research workflows.
        </>
      ),
    },
  ];
  const pageHeight = 220 + rows.length * 180;

  return (
    <Item x={x} y={y} w={1360} h={pageHeight} rotate={rotate} z={11}>
      <div
        style={{
          width: "100%",
          height: "100%",
          background: D.paper,
          padding: "40px 56px 40px 100px",
          position: "relative",
          fontFamily: D.serif,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `repeating-linear-gradient(180deg, transparent 0 30px, rgba(110,80,40,0.18) 30px 31px)`,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 78,
            top: 0,
            bottom: 0,
            width: 1,
            background: `${D.red}66`,
          }}
        />
        {[90, 290, 490, 690, 890, 1090, 1290].map((t) => (
          <div
            key={t}
            style={{
              position: "absolute",
              left: 30,
              top: t,
              width: 16,
              height: 16,
              background: D.woodC,
              borderRadius: 999,
              opacity: 0.5,
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.4)",
            }}
          />
        ))}

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            paddingBottom: 14,
            borderBottom: `1px solid ${D.ink}22`,
          }}
        >
          <div>
            <div
              style={{
                font: `500 11px ${D.mono}`,
                color: D.red,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              things i've made
            </div>
            <div
              style={{
                font: `400 44px/1 "Spectral"`,
                color: D.ink,
                marginTop: 10,
                letterSpacing: "-0.015em",
              }}
            >
              <span style={{ fontStyle: "italic", fontWeight: 300 }}>pet</span>{" "}
              projects.
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            paddingRight: 18,
          }}
        >
          {rows.map((r, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "140px 1fr",
                gap: 28,
                padding: "20px 0",
                alignItems: "flex-start",
                borderBottom:
                  i < rows.length - 1 ? `1px dotted ${D.ink}33` : "none",
              }}
            >
              {PROJECT_THUMBS[r.thumb]}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 14,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      font: `500 13px ${D.mono}`,
                      color: D.red,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {r.year}
                  </span>
                  <a
                    href={r.href}
                    target={r.href ? "_blank" : undefined}
                    rel={r.href ? "noopener" : undefined}
                    style={{
                      font: `500 20px "Spectral"`,
                      color: D.ink,
                      borderBottom: `1px solid ${D.ochre}`,
                      textDecoration: "none",
                    }}
                  >
                    {r.name}
                  </a>
                </div>
                <div
                  style={{
                    font: `400 14.5px/1.55 "Spectral"`,
                    color: D.ink2,
                    maxWidth: 760,
                  }}
                >
                  {r.blurb}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Item>
  );
};

// =========================================================================
// Library card
// =========================================================================

const LIBRARY_ITEMS = [
  [
    "book",
    "Real Analysis I",
    "terence tao · first in the series",
    "https://turan-edu.uz/media/books/2024/05/28/1664976801.pdf",
  ],
  [
    "book",
    "Principles of Mathematical Analysis",
    "rudin · third edition",
    "https://david92jackson.neocities.org/images/Principles_of_Mathematical_Analysis-Rudin.pdf",
  ],
  ["talk", "generalization", "ilya on why models learn", undefined],
  ["site", "explorables", "complex systems, made tangible", undefined],
] as const;

const LibraryCard = ({
  x,
  y,
  rotate = 0,
}: {
  x: number;
  y: number;
  rotate?: number;
}) => (
  <Item x={x} y={y} w={500} h={260} rotate={rotate} z={12}>
    <div
      style={{
        width: "100%",
        height: "100%",
        background: D.indexCard,
        padding: "22px 28px",
        fontFamily: D.serif,
        color: D.ink,
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          paddingBottom: 10,
          borderBottom: `1px solid ${D.ink}22`,
        }}
      >
        <div
          style={{
            font: `500 11px ${D.mono}`,
            color: D.red,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          library
        </div>
        <div style={{ font: `400 11px ${D.mono}`, color: D.ink3 }}>
          useful / interesting
        </div>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        {LIBRARY_ITEMS.map(([kind, title, note, href]) => {
          const content = (
            <>
              <div
                style={{
                  font: `500 10px ${D.mono}`,
                  color: D.ochre,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  paddingTop: 2,
                }}
              >
                {kind}
              </div>
              <div>
                <div style={{ font: `500 15px/1.2 "Spectral"`, color: D.ink }}>
                  {title}
                </div>
                <div
                  style={{
                    font: `italic 12.5px/1.35 "Spectral"`,
                    color: D.ink2,
                  }}
                >
                  {note}
                </div>
              </div>
            </>
          );

          const style: CSSProperties = {
            display: "grid",
            gridTemplateColumns: "64px 1fr",
            gap: 12,
            color: "inherit",
            textDecoration: "none",
          };

          return href ? (
            <a
              key={title}
              href={href}
              target="_blank"
              rel="noopener"
              style={style}
            >
              {content}
            </a>
          ) : (
            <div key={title} style={style}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  </Item>
);

// =========================================================================
// Now playing
// =========================================================================

const NowCard = ({
  x,
  y,
  rotate = 0,
}: {
  x: number;
  y: number;
  rotate?: number;
}) => (
  <Item x={x} y={y} w={300} h={140} rotate={rotate} z={12}>
    <div
      style={{
        width: "100%",
        height: "100%",
        background: D.paper,
        padding: 14,
        fontFamily: D.mono,
        color: D.ink,
        display: "grid",
        gridTemplateColumns: "92px 1fr",
        gap: 14,
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #c97b3d, #6a3215)",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 64 64" width="48" height="48">
          <circle cx="32" cy="32" r="26" fill="#1b1a17" />
          <circle cx="32" cy="32" r="8" fill="#c97b3d" />
          <circle cx="32" cy="32" r="2" fill="#1b1a17" />
          <circle
            cx="32"
            cy="32"
            r="22"
            fill="none"
            stroke="#3a2618"
            strokeWidth="0.4"
          />
          <circle
            cx="32"
            cy="32"
            r="18"
            fill="none"
            stroke="#3a2618"
            strokeWidth="0.4"
          />
          <circle
            cx="32"
            cy="32"
            r="14"
            fill="none"
            stroke="#3a2618"
            strokeWidth="0.4"
          />
        </svg>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "2px 0",
        }}
      >
        <div>
          <div
            style={{
              font: `500 10px ${D.mono}`,
              color: D.red,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            on the turntable
          </div>
          <div
            style={{
              font: `500 15px/1.3 "Spectral"`,
              color: D.ink,
              marginTop: 4,
            }}
          >
            home
          </div>
          <div style={{ font: `italic 12.5px "Spectral"`, color: D.ink2 }}>
            charlie puth · hikaru utada
          </div>
        </div>
        <div
          style={{
            font: `400 10.5px ${D.mono}`,
            color: D.ink2,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>side a · ◀◀ ▶ ▶▶</span>
          <span>23:14</span>
        </div>
      </div>
    </div>
  </Item>
);

// =========================================================================
// Decorations
// =========================================================================

const CoffeeRing = ({
  x,
  y,
  size = 80,
}: {
  x: number;
  y: number;
  size?: number;
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: size,
      height: size,
      borderRadius: "50%",
      border: `2px solid rgba(60,30,10,0.32)`,
      boxShadow: "inset 0 0 8px rgba(60,30,10,0.25)",
      zIndex: 5,
      pointerEvents: "none",
    }}
  />
);

const DeskNavPlate = ({
  x,
  y,
  rotate = 0,
}: {
  x: number;
  y: number;
  rotate?: number;
}) => {
  const links = [
    ["desk", "/"],
    ["writing", "/?view=blog"],
    ["library", "/?view=library"],
  ] as const;

  return (
    <Item
      x={x}
      y={y}
      w={382}
      h={64}
      rotate={rotate}
      z={24}
      style={{ filter: "drop-shadow(0 8px 12px rgba(20,8,0,0.24))" }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: 2,
          background:
            "linear-gradient(135deg, #b98d45 0%, #d8b267 40%, #a97832 100%)",
          border: "1px solid rgba(56,31,10,0.42)",
          boxShadow:
            "inset 0 1px 0 rgba(255,239,184,0.38), inset 0 -2px 5px rgba(58,27,6,0.24)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 6,
            border: "1px solid rgba(65,37,12,0.18)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(100deg, transparent 0 38%, rgba(255,244,198,0.18) 49%, transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "0 20px",
          }}
        >
          {links.map(([label, href], index) => (
            <a
              key={label}
              href={href}
              style={{
                color: index === 0 ? "#2f1907" : "#5c3513",
                font: `600 11px ${D.mono}`,
                letterSpacing: "0.17em",
                textTransform: "uppercase",
                textDecoration: "none",
                textShadow: "0 1px 0 rgba(255,238,184,0.28)",
                padding: "5px 6px",
                borderBottom:
                  index === 0 ? "1px solid rgba(55,27,7,0.26)" : undefined,
              }}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </Item>
  );
};

const DeskLink = ({
  x,
  y,
  href,
  children,
  rotate = 0,
}: {
  x: number;
  y: number;
  href: string;
  children: ReactNode;
  rotate?: number;
}) => (
  <a
    href={href}
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `rotate(${rotate}deg)`,
      transformOrigin: "left center",
      font: `500 12px "IBM Plex Mono"`,
      color: "#f5e8c5",
      textDecoration: "underline",
      textDecorationColor: "#b8822988",
      textUnderlineOffset: 4,
      zIndex: 9,
      textShadow: "0 1px 2px rgba(0,0,0,0.5)",
    }}
  >
    {children}
  </a>
);

// =========================================================================
// Compose
// =========================================================================

export default function HomepageDesk() {
  const scale = useFitWidth(CANVAS_W);
  return (
    <ChessGame>
      <div
        style={{
          width: "100vw",
          minHeight: "100vh",
          background: D.woodC,
          overflowX: "hidden",
        }}
      >
        <div
          style={{
            width: CANVAS_W * scale,
            height: CANVAS_H * scale,
            margin: "0 auto",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: CANVAS_W,
              height: CANVAS_H,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <DeskBg />

            {/* warm spotlight over the bio */}
            <div
              style={{
                position: "absolute",
                left: -100,
                top: -50,
                width: 900,
                height: 700,
                background:
                  "radial-gradient(ellipse at 380px 320px, rgba(255,220,150,0.22), transparent 60%)",
                pointerEvents: "none",
                zIndex: 3,
              }}
            />

            <Letter x={30} y={70} rotate={-1.5} />
            <DeskNavPlate x={795} y={70} rotate={1.4} />
            <ChessOnDesk x={640} y={240} rotate={1.2} />
            <Polaroid
              x={1230}
              y={40}
              rotate={5}
              src="/pokemon-desk-photo.png"
              caption="rest, melee."
              dateNote="evo '14"
            />
            <Clipboard x={1180} y={520} rotate={-3} />

            <CoffeeRing x={200} y={720} size={84} />

            <ScrollHint x={680} y={870} />

            {/* BOTTOM ZONE A · writing + now */}
            <HandLabel x={62} y={1000} rotate={-1.5} size={28}>
              ↓ writing
            </HandLabel>
            <Scrap
              x={42}
              y={1050}
              rotate={-2.5}
              w={380}
              h={120}
              color={D.postitYellow}
              tag="blog"
              dateLabel="soon"
              title="writing coming soon"
              body="notes, essays, and longer thoughts will live here once they are ready."
            />
            <DeskLink x={72} y={1198} href="/?view=blog" rotate={-1}>
              see all writing →
            </DeskLink>
            <HandLabel x={72} y={1235} rotate={1.5} size={26}>
              ↓ library
            </HandLabel>
            <LibraryCard x={62} y={1290} rotate={1.2} />
            <DeskLink x={84} y={1585} href="/?view=library" rotate={1.2}>
              see all library →
            </DeskLink>

            <HandLabel x={920} y={1000} rotate={-2} size={26}>
              ↓ now
            </HandLabel>
            <NowCard x={900} y={1060} rotate={-2} />
            <Scrap
              x={920}
              y={1230}
              rotate={-2}
              w={300}
              h={100}
              color={D.paper}
              tag="reading"
              dateLabel="this week"
              title="rudin, principles"
              body="principles of mathematical analysis · third edition."
            />

            {/* BOTTOM ZONE B · projects */}
            <HandLabel x={80} y={1860} rotate={-1} size={40}>
              ↓ pet projects
            </HandLabel>
            <ProjectsPage x={70} y={1940} rotate={-0.4} />

            <div
              style={{
                position: "absolute",
                left: 28,
                bottom: 18,
                font: `500 10px "IBM Plex Mono"`,
                color: "#e8d0a4",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                opacity: 0.7,
              }}
            >
              sjb · desk · winter '26
            </div>
          </div>
        </div>
      </div>
    </ChessGame>
  );
}
