import { Easing } from 'react-native';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

type SceneInterpolator = NonNullable<
  BottomTabNavigationOptions['sceneStyleInterpolator']
>;

/**
 * How far a scene drifts on its way in or out, in points.
 *
 * Small on purpose. Tabs are siblings, not a stack: the reader is not going
 * anywhere, they are looking at a different face of the same thing. A slide
 * the width of the screen would say otherwise. This is just enough that the
 * new scene arrives from the side its tab is on, and the eye reads which way
 * it went.
 */
const DRIFT = 14;

/**
 * The tab switch.
 *
 * The navigator's own presets are a straight cut or a 150ms cross-fade, and
 * the cut is what a tab switch looks like when nothing has been decided: the
 * old screen is there, then the new one is. This is the decided version — the
 * outgoing scene fades as it drifts away, the incoming fades up as it drifts
 * in from its own side, both on one quick ease-out so the change is over
 * before the thumb has left the bar but never in a single frame.
 *
 * `progress` is 0 for the scene on top, -1 for one left of it and 1 for one
 * right of it, so the direction of the drift falls out of the tab order.
 */
const interpolate: SceneInterpolator = ({ current }) => ({
  sceneStyle: {
    opacity: current.progress.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [0, 1, 0],
    }),
    transform: [
      {
        translateX: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-DRIFT, 0, DRIFT],
        }),
      },
    ],
  },
});

export const TAB_TRANSITION = {
  animation: 'shift',
  transitionSpec: {
    animation: 'timing',
    config: {
      duration: 200,
      easing: Easing.out(Easing.cubic),
    },
  },
  sceneStyleInterpolator: interpolate,
} satisfies BottomTabNavigationOptions;
