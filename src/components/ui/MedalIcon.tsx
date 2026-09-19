import { memo } from 'react';
import Svg, { G, Path, Polygon, Rect } from 'react-native-svg';

/**
 * The medal behind an earned achievement — `assets/medal-svgrepo-com.svg`,
 * drawn inline so it takes the palette rather than one baked-in gold.
 *
 * The ribbon stays grey in every tone; only the disc changes, so a streak
 * medal and a volume medal read as the same object in two metals. The disc
 * is centred at (256, 392) of the 512 box with a ~71 px inner face, which is
 * where a caller lays a numeral over it.
 */
export type MedalTone = 'gold' | 'primary';

const DISC: Record<MedalTone, { face: string; rim: string; ring: string }> = {
  // The asset's own metals.
  gold: { face: '#FCBB29', rim: '#D39A29', ring: '#F9C969' },
  // The same medal cast in the app's green.
  primary: { face: '#3FA660', rim: '#2D8A47', ring: '#8FBF6A' },
};

export const MedalIcon = memo(function MedalIcon({
  size = 56,
  tone = 'gold',
}: {
  size?: number;
  tone?: MedalTone;
}) {
  const metal = DISC[tone];

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <G>
        <Rect
          x="235.776"
          y="217.707"
          width="40.44"
          height="82.243"
          fill={metal.rim}
        />
        <Path
          fill={metal.rim}
          d="M256,311.738c44.561,0,80.685,36.125,80.685,80.698c0,44.561-36.125,80.698-80.685,80.698 c-44.573,0-80.698-36.137-80.698-80.698C175.302,347.863,211.427,311.738,256,311.738z"
        />
      </G>
      <Path
        fill={metal.face}
        d="M256,272.872c66.031,0,119.564,53.533,119.564,119.564S322.031,512,256,512 s-119.564-53.533-119.564-119.564S189.969,272.872,256,272.872z M336.685,392.436c0-44.573-36.125-80.698-80.685-80.698 c-44.573,0-80.698,36.125-80.698,80.698c0,44.561,36.125,80.698,80.698,80.698C300.561,473.134,336.685,436.997,336.685,392.436z"
      />
      <Polygon
        fill="#666666"
        points="256,260.411 240.287,251.526 138.629,194.019 177.445,25.981 183.452,0 279.676,119.265 "
      />
      <Polygon
        fill="#808080"
        points="328.536,0 373.371,194.019 256,260.411 183.452,0 "
      />
      <Polygon
        fill="#4D4D4D"
        points="256,260.411 240.287,251.526 177.445,25.981 183.452,0 "
      />
      <Path
        fill={metal.ring}
        d="M256,482.48c-49.65,0-90.044-40.394-90.044-90.044S206.35,302.392,256,302.392 c49.644,0,90.031,40.394,90.031,90.044S305.644,482.48,256,482.48z M256,321.084c-39.343,0-71.352,32.009-71.352,71.352 s32.009,71.352,71.352,71.352c39.337,0,71.34-32.009,71.34-71.352S295.337,321.084,256,321.084z"
      />
    </Svg>
  );
});
