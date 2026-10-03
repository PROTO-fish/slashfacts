import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

/** The mark's own box (logo-mark.svg on proto.fish): a chevron and a bar, ">_". */
const VIEW_BOX = '315 396 625 436';
const ASPECT = 625 / 436;

/** Half a second on, half off, stepped rather than faded: proto.fish's terminal cursor. */
const BLINK_MS = 500;

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => live && setReduce(on));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/**
 * The PROTO/fish mark, in ink only, without the black square of the app-icon version.
 * `blink` makes the bar flash like a terminal cursor, and holds it still when the system
 * asks for reduced motion.
 */
export function Mark({ height, color, blink = false }: { height: number; color: string; blink?: boolean }) {
  const reduceMotion = useReduceMotion();
  const animate = blink && !reduceMotion;
  const [barOn, setBarOn] = useState(true);

  useEffect(() => {
    if (!animate) {
      setBarOn(true);
      return;
    }
    const id = setInterval(() => setBarOn((on) => !on), BLINK_MS);
    return () => clearInterval(id);
  }, [animate]);

  return (
    <Svg width={Math.round(height * ASPECT)} height={height} viewBox={VIEW_BOX}>
      <Path d="M315 396 601 625 315 832V738L472 625 315 501Z" fill={color} />
      <Rect x={618} y={750} width={322} height={82} fill={color} opacity={barOn ? 1 : 0} />
    </Svg>
  );
}
