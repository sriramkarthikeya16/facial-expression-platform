/**
 * MoodLens - Zen Focus Emoji Memory Match Game
 * Playful mindfulness exercise for neutral / rest moments.
 */
import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Trophy, Sparkles } from 'lucide-react';

interface FocusGameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const EMOJIS = ['🌸', '🍵', '🧘', '🌿', '🌊', '🕯️'];

export const FocusGameModal: React.FC<FocusGameModalProps> = ({ isOpen, onClose }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);

  const initGame = () => {
    const deck = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, idx) => ({
        id: idx,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(deck);
    setFlippedIndices([]);
    setMoves(0);
    setMatchedPairs(0);
  };

  useEffect(() => {
    if (isOpen) {
      initGame();
    }
  }, [isOpen]);

  const handleCardClick = (index: number) => {
    if (flippedIndices.length === 2 || cards[index].isFlipped || cards[index].isMatched) {
      return;
    }

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [firstIdx, secondIdx] = newFlipped;
      if (newCards[firstIdx].emoji === newCards[secondIdx].emoji) {
        newCards[firstIdx].isMatched = true;
        newCards[secondIdx].isMatched = true;
        setCards(newCards);
        setMatchedPairs((p) => p + 1);
        setFlippedIndices([]);
      } else {
        setTimeout(() => {
          newCards[firstIdx].isFlipped = false;
          newCards[secondIdx].isFlipped = false;
          setCards([...newCards]);
          setFlippedIndices([]);
        }, 900);
      }
    }
  };

  if (!isOpen) return null;

  const isComplete = matchedPairs === EMOJIS.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-4 p-6 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Zen Focus Memory Match
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Match all 6 pairs to quiet your mind and sharpen focus.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-xs">
          <span className="text-slate-600 dark:text-slate-300 font-medium">
            Pairs Matched: <strong className="text-cyan-600 dark:text-cyan-400 font-mono">{matchedPairs} / {EMOJIS.length}</strong>
          </span>
          <span className="text-slate-600 dark:text-slate-300 font-medium">
            Moves: <strong className="text-slate-900 dark:text-white font-mono">{moves}</strong>
          </span>
        </div>

        {/* Board */}
        {isComplete ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-cyan-100 dark:bg-cyan-950/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400 animate-bounce">
              <Trophy className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
              Mind Cleared & Focused!
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              You completed the Zen memory challenge in {moves} moves. Great job taking this mindful pause.
            </p>
            <button
              onClick={initGame}
              className="mt-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition-all inline-flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Play Again</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2.5 py-1">
            {cards.map((card, idx) => (
              <button
                key={card.id}
                onClick={() => handleCardClick(idx)}
                disabled={card.isFlipped || card.isMatched}
                className={`h-16 rounded-2xl text-2xl flex items-center justify-center border transition-all transform ${
                  card.isFlipped || card.isMatched
                    ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-700 scale-95 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700/80 active:scale-95'
                }`}
              >
                {card.isFlipped || card.isMatched ? card.emoji : '✨'}
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={initGame}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center space-x-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
