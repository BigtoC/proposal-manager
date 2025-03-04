import type { CreateTypes } from 'canvas-confetti';
import { useCallback, useEffect, useRef } from 'react';
import ReactCanvasConfetti from 'react-canvas-confetti';

interface Props {
  fire: boolean;
  onComplete?: () => void;
}

export const Fireworks: React.FC<Props> = ({ fire, onComplete }) => {
  const refAnimationInstance = useRef<CreateTypes | null>(null);

  const getInstance = useCallback((instance: { confetti: CreateTypes }) => {
    refAnimationInstance.current = instance.confetti;
  }, []);

  useEffect(() => {
    if (fire && refAnimationInstance.current) {
      const colors = [
        '#26ccff',
        '#a25afd',
        '#ff5e7e',
        '#88ff5a',
        '#fcff42',
        '#ffa62d',
        '#ff36ff',
      ];

      // Fire multiple shots in sequence
      const fireConfetti = async () => {
        if (!refAnimationInstance.current) return;

        await refAnimationInstance.current({
          particleCount: 100,
          spread: 70,
          origin: { x: 0.3, y: 0.7 },
          colors,
        });
      };

      fireConfetti().then(() => {
        // Wait for animation to complete
        setTimeout(() => {
          onComplete?.();
        }, 1000);
      });
    }
  }, [fire, onComplete]);

  return (
    <ReactCanvasConfetti
      onInit={getInstance}
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        zIndex: 999,
      }}
    />
  );
};
