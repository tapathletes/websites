// POV walk-in view — perspective render from a viewpoint outside the netted
// cage, near the front of the building, looking back-left across the
// pitching lane. This gives a clear view of the full netted shell.
//
// World coords match facility.jsx: x = 0 (back wall) .. 80 (front wall),
// y = 0 (right wall) .. 25 (left wall), z = 0 (floor) .. 16 (ceiling).

const POV_PAL = {
  wall:     '#f6f3ec',   // white walls
  wallDk:   '#e2ddd0',
  wallShade:'#cdc6b6',
  ceiling:  '#fafaf5',
  ceilingDk:'#dcd5c4',
  floor:    '#0e0e12',   // BLACK rubber flooring outside cage
  floorDk:  '#070709',
  laneFloor:'#3a6f9a',   // BLUE lane flooring
  laneFloorDk:'#2c5478',
  truss:    '#3a3a3a',
  ink:      '#1a1714',
};

function POVLayout() {
  const W = 1280, H = 720;

  // ── Target-based camera ──────────────────────────────────────────────
  // Eye position and target both in world space.
  const CAM   = { x: 82, y: 2,  z: 6.2 };   // pulled back & out for wider view
  const TGT   = { x: 8,  y: 17, z: 5.0 };   // back-left, lane interior
  const FOV   = 88;                          // wider lens
  const F     = (W / 2) / Math.tan(FOV * Math.PI / 360);

  // Build camera basis
  const fwd = norm3(sub3(TGT, CAM));
  const right = norm3(cross3(fwd, { x: 0, y: 0, z: 1 }));
  const upV   = cross3(right, fwd);

  function dot(a, b) { return a.x*b.x + a.y*b.y + a.z*b.z; }
  function sub3(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
  function cross3(a, b) {
    return {
      x: a.y*b.z - a.z*b.y,
      y: a.z*b.x - a.x*b.z,
      z: a.x*b.y - a.y*b.x,
    };
  }
  function norm3(v) {
    const m = Math.hypot(v.x, v.y, v.z);
    return { x: v.x/m, y: v.y/m, z: v.z/m };
  }

  function P(x, y, z) {
    const r = sub3({ x, y, z }, CAM);
    const d = dot(r, fwd);
    if (d < 0.2) return null;
    const sx = W/2 + dot(r, right) / d * F;
    const sy = H/2 - dot(r, upV)   / d * F;
    return { x: sx, y: sy, d };
  }

  function quad(corners) {
    const ps = corners.map(c => P(c[0], c[1], c[2]));
    if (ps.some(p => !p)) return null;
    return ps.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }

  const Quad = ({ corners, fill, stroke = 'none', strokeWidth = 0, opacity = 1 }) => {
    const pts = quad(corners);
    if (!pts) return null;
    return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity}/>;
  };

  const Line = ({ a, b, stroke, strokeWidth = 1, opacity = 1, dash }) => {
    const pa = P(a[0], a[1], a[2]);
    const pb = P(b[0], b[1], b[2]);
    if (!pa || !pb) return null;
    return <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
      stroke={stroke} strokeWidth={strokeWidth} opacity={opacity}
      strokeDasharray={dash} strokeLinecap="round"/>;
  };

  const Box3 = ({ x, y, w, d, h, top, side, dark }) => (
    <g>
      <Quad corners={[[x, y+d, 0],[x+w, y+d, 0],[x+w, y+d, h],[x, y+d, h]]} fill={side}/>
      <Quad corners={[[x, y, 0],[x+w, y, 0],[x+w, y, h],[x, y, h]]} fill={dark}/>
      <Quad corners={[[x, y, 0],[x, y+d, 0],[x, y+d, h],[x, y, h]]} fill={dark}/>
      <Quad corners={[[x+w, y, 0],[x+w, y+d, 0],[x+w, y+d, h],[x+w, y, h]]} fill={side}/>
      <Quad corners={[[x, y, h],[x+w, y, h],[x+w, y+d, h],[x, y+d, h]]} fill={top}/>
    </g>
  );

  // Sloped portable mound — black turf top, white rubber.
  const Mound3 = ({ rubberX, cy, length = 9, width = 4, height = 10/12, face = 'nx' }) => {
    // face='nx' → high end at +x (toward camera), slopes down toward -x (toward plate at back)
    const xb = face === 'nx' ? rubberX + 0.5 : rubberX - 0.5;       // back/high end
    const xf = face === 'nx' ? xb - length   : xb + length;          // front/low end
    const y0 = cy - width/2, y1 = cy + width/2;
    return (
      <g>
        {/* +y face (visible from camera at low y) */}
        <Quad corners={[
          [xb, y1, 0],[xf, y1, 0],
          face === 'nx' ? [xf, y1, 0] : [xf, y1, height],
          face === 'nx' ? [xb, y1, height] : [xb, y1, 0],
        ]} fill="#0e0e10"/>
        {/* -y face */}
        <Quad corners={[
          [xb, y0, 0],[xf, y0, 0],
          face === 'nx' ? [xf, y0, 0] : [xf, y0, height],
          face === 'nx' ? [xb, y0, height] : [xb, y0, 0],
        ]} fill="#15151a"/>
        {/* high end (back) face */}
        <Quad corners={[[xb, y0, 0],[xb, y1, 0],[xb, y1, height],[xb, y0, height]]} fill="#1f1f24"/>
        {/* sloped TOP — black turf */}
        <Quad corners={[
          [xb, y0, height],[xb, y1, height],
          face === 'nx' ? [xf, y1, 0] : [xf, y1, 0],
          face === 'nx' ? [xf, y0, 0] : [xf, y0, 0],
        ]} fill="#1a1a1f"/>
        {/* white pitching rubber on top of slope, near the high (back) end */}
        <Quad corners={[
          [xb - 0.55, cy - 1, height + 0.02],
          [xb - 0.55, cy + 1, height + 0.02],
          [xb - 0.05, cy + 1, height + 0.02],
          [xb - 0.05, cy - 1, height + 0.02],
        ]} fill="#fafaf5" stroke="rgba(0,0,0,.3)" strokeWidth={0.5}/>
      </g>
    );
  };

  // ── Scene ────────────────────────────────────────────────────────────
  const CAGE_X0 = 3, CAGE_X1 = 67, CAGE_Y0 = 10, CAGE_Y1 = 22, CAGE_Z = 12;

  // Net poles at intervals
  const polesX = [3, 13, 23, 33, 43, 53, 63, 67];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ background: '#0e0e10' }}>
      <defs>
        <linearGradient id="floor-grad-pov" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={POV_PAL.floorDk}/>
          <stop offset="60%" stopColor={POV_PAL.floor}/>
          <stop offset="100%" stopColor={POV_PAL.floor}/>
        </linearGradient>
        <linearGradient id="lane-grad-pov" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={POV_PAL.laneFloorDk}/>
          <stop offset="100%" stopColor={POV_PAL.laneFloor}/>
        </linearGradient>
        <linearGradient id="ceil-grad-pov" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={POV_PAL.ceilingDk}/>
          <stop offset="100%" stopColor={POV_PAL.ceiling}/>
        </linearGradient>
      </defs>

      {/* Walls (white) */}
      {/* Back wall (x=0) */}
      <Quad corners={[[0, 0, 0],[0, 25, 0],[0, 25, 16],[0, 0, 16]]} fill={POV_PAL.wallDk}/>
      {/* Bay door on back wall */}
      <Quad corners={[[0, 4, 0],[0, 14, 0],[0, 14, 12],[0, 4, 12]]} fill="#bdb8ad"/>
      {[2,4,6,8,10].map(z => (
        <Line key={`bd${z}`} a={[0,4,z]} b={[0,14,z]} stroke="#7a7670" strokeWidth={0.8}/>
      ))}
      {/* Left wall (y=25) */}
      <Quad corners={[[0, 25, 0],[0, 25, 16],[CAM.x - 0.1, 25, 16],[CAM.x - 0.1, 25, 0]]} fill={POV_PAL.wall}/>
      {/* Right wall (y=0) — white, behind mirror & plyo board */}
      <Quad corners={[[0, 0, 0],[CAM.x - 0.1, 0, 0],[CAM.x - 0.1, 0, 16],[0, 0, 16]]} fill={POV_PAL.wall}/>
      {/* subtle baseboard shadow */}
      <Quad corners={[[0, 0, 0],[CAM.x - 0.1, 0, 0],[CAM.x - 0.1, 0, 0.4],[0, 0, 0.4]]} fill={POV_PAL.wallShade}/>
      {/* Ceiling */}
      <Quad corners={[[0, 0, 16],[0, 25, 16],[CAM.x - 0.1, 25, 16],[CAM.x - 0.1, 0, 16]]} fill="url(#ceil-grad-pov)"/>

      {/* Trusses */}
      {[20, 40, 60].map(tx => (
        <g key={`t${tx}`}>
          <Line a={[tx, 0, 12]} b={[tx, 25, 12]} stroke="#5a5a5a" strokeWidth={1.4}/>
          <Line a={[tx, 0, 12]} b={[tx, 0, 16]}  stroke="#5a5a5a" strokeWidth={0.8} opacity={0.6}/>
          <Line a={[tx, 25, 12]} b={[tx, 25, 16]} stroke="#5a5a5a" strokeWidth={0.8} opacity={0.6}/>
        </g>
      ))}

      {/* Floor — black rubber outside cage */}
      <Quad corners={[[0, 0, 0],[CAM.x - 0.1, 0, 0],[CAM.x - 0.1, 25, 0],[0, 25, 0]]} fill="url(#floor-grad-pov)"/>
      {/* Blue speckle pattern across rubber floor */}
      <g opacity={0.85}>
        {Array.from({length: 280}).map((_, i) => {
          // pseudo-random but deterministic
          const seed = i * 9301 + 49297;
          const r1 = ((seed * 1103515245 + 12345) >>> 0) / 0xffffffff;
          const r2 = ((seed * 22695477 + 1) >>> 0) / 0xffffffff;
          const r3 = ((seed * 214013 + 2531011) >>> 0) / 0xffffffff;
          const wx = r1 * (CAM.x - 0.5) + 0.2;
          const wy = r2 * 24.6 + 0.2;
          // skip speckles inside the cage area (cage has its own blue floor)
          if (wx >= CAGE_X0 && wx <= CAGE_X1 && wy >= CAGE_Y0 && wy <= CAGE_Y1) return null;
          // skip speckles inside concrete pads
          if (wx < 3 || wx > 77) return null;
          const p = P(wx, wy, 0.04);
          if (!p) return null;
          const size = 0.6 + r3 * 1.4;
          const colors = ['#3a6f9a', '#4a82b0', '#5a96c4', '#2c5478'];
          const color = colors[i % colors.length];
          // perspective scale for size
          const ss = Math.max(0.4, 600 / p.d);
          return <circle key={`sp${i}`} cx={p.x} cy={p.y} r={size * ss / 100} fill={color} opacity={0.7 + r3 * 0.3}/>;
        })}
      </g>

      {/* Concrete pads */}
      <Quad corners={[[0, 0, 0.01],[3, 0, 0.01],[3, 25, 0.01],[0, 25, 0.01]]} fill="#cdc7b8"/>
      <Quad corners={[[77, 0, 0.01],[80, 0, 0.01],[80, 25, 0.01],[77, 25, 0.01]]} fill="#cdc7b8"/>

      {/* BLUE pitching lane floor */}
      <Quad corners={[
        [CAGE_X0, CAGE_Y0, 0.02],
        [CAGE_X1, CAGE_Y0, 0.02],
        [CAGE_X1, CAGE_Y1, 0.02],
        [CAGE_X0, CAGE_Y1, 0.02],
      ]} fill="url(#lane-grad-pov)"/>

      {/* ── NETTED CAGE — full shell (frame + nets on all 4 walls + ceiling net) ── */}
      {/* Vertical poles at intervals along both side walls */}
      {polesX.map(x => (
        <g key={`pp${x}`}>
          <Line a={[x, CAGE_Y0, 0]} b={[x, CAGE_Y0, CAGE_Z]} stroke="#1a1a1a" strokeWidth={1.4}/>
          <Line a={[x, CAGE_Y1, 0]} b={[x, CAGE_Y1, CAGE_Z]} stroke="#1a1a1a" strokeWidth={1.4}/>
        </g>
      ))}
      {/* Top rails */}
      <Line a={[CAGE_X0, CAGE_Y0, CAGE_Z]} b={[CAGE_X1, CAGE_Y0, CAGE_Z]} stroke="#1a1a1a" strokeWidth={1.4}/>
      <Line a={[CAGE_X0, CAGE_Y1, CAGE_Z]} b={[CAGE_X1, CAGE_Y1, CAGE_Z]} stroke="#1a1a1a" strokeWidth={1.4}/>
      {/* Cross rails (front and back of cage at top) */}
      <Line a={[CAGE_X0, CAGE_Y0, CAGE_Z]} b={[CAGE_X0, CAGE_Y1, CAGE_Z]} stroke="#1a1a1a" strokeWidth={1.4}/>
      <Line a={[CAGE_X1, CAGE_Y0, CAGE_Z]} b={[CAGE_X1, CAGE_Y1, CAGE_Z]} stroke="#1a1a1a" strokeWidth={1.4}/>
      {/* Vertical corner posts at cage ends */}
      {[CAGE_X0, CAGE_X1].map(x => [CAGE_Y0, CAGE_Y1].map(y => (
        <Line key={`cp${x}-${y}`} a={[x, y, 0]} b={[x, y, CAGE_Z]} stroke="#1a1a1a" strokeWidth={1.6}/>
      )))}

      {/* Net mesh — diagonal lines. Side wall y=10 (close to camera, but camera is at y=4 → far inside). */}
      {Array.from({length: 33}, (_, i) => CAGE_X0 + i * 2).filter(x => x <= CAGE_X1).map(x => (
        <g key={`mesh${x}`}>
          {/* Side near camera (y=10) */}
          <Line a={[x, CAGE_Y0, CAGE_Z]} b={[x + 2, CAGE_Y0, 0]} stroke="rgba(20,20,30,.55)" strokeWidth={0.7}/>
          <Line a={[x, CAGE_Y0, 0]}      b={[x + 2, CAGE_Y0, CAGE_Z]} stroke="rgba(20,20,30,.55)" strokeWidth={0.7}/>
          {/* Far side (y=22) */}
          <Line a={[x, CAGE_Y1, CAGE_Z]} b={[x + 2, CAGE_Y1, 0]} stroke="rgba(20,20,30,.35)" strokeWidth={0.5}/>
          <Line a={[x, CAGE_Y1, 0]}      b={[x + 2, CAGE_Y1, CAGE_Z]} stroke="rgba(20,20,30,.35)" strokeWidth={0.5}/>
        </g>
      ))}
      {/* End nets at x=CAGE_X0 (back) and x=CAGE_X1 (front, near camera) */}
      {Array.from({length: 6}, (_, i) => CAGE_Y0 + i * 2).filter(y => y < CAGE_Y1).map(y => (
        <g key={`endmesh${y}`}>
          <Line a={[CAGE_X0, y, CAGE_Z]} b={[CAGE_X0, y + 2, 0]} stroke="rgba(20,20,30,.4)" strokeWidth={0.5}/>
          <Line a={[CAGE_X0, y, 0]}      b={[CAGE_X0, y + 2, CAGE_Z]} stroke="rgba(20,20,30,.4)" strokeWidth={0.5}/>
          <Line a={[CAGE_X1, y, CAGE_Z]} b={[CAGE_X1, y + 2, 0]} stroke="rgba(20,20,30,.55)" strokeWidth={0.7}/>
          <Line a={[CAGE_X1, y, 0]}      b={[CAGE_X1, y + 2, CAGE_Z]} stroke="rgba(20,20,30,.55)" strokeWidth={0.7}/>
        </g>
      ))}
      {/* Ceiling net (overhead inside cage) — sparse cross-hatch at z=CAGE_Z */}
      {Array.from({length: 7}, (_, i) => CAGE_X0 + i * 10).filter(x => x <= CAGE_X1).map(x => (
        <Line key={`cn${x}`} a={[x, CAGE_Y0, CAGE_Z]} b={[x, CAGE_Y1, CAGE_Z]} stroke="rgba(20,20,30,.35)" strokeWidth={0.5}/>
      ))}
      {Array.from({length: 4}, (_, i) => CAGE_Y0 + i * 4).filter(y => y <= CAGE_Y1).map(y => (
        <Line key={`cnY${y}`} a={[CAGE_X0, y, CAGE_Z]} b={[CAGE_X1, y, CAGE_Z]} stroke="rgba(20,20,30,.35)" strokeWidth={0.5}/>
      ))}

      {/* Pitching mound — black turf, white rubber */}
      <Mound3 rubberX={64.5} cy={16} face="nx"/>

      {/* Home plate at back of lane */}
      <Quad corners={[[3.5, 15.4, 0.05],[4.5, 15.4, 0.05],[4.7, 16, 0.05],[4.5, 16.6, 0.05],[3.5, 16.6, 0.05]]} fill="#fafaf5"/>

      {/* ── Equipment along right wall (y=0..10) ── */}
      {/* Youth mound stored upright (back-right corner, leaning on back wall) */}
      <Box3 x={0.5} y={0.5} w={3.5} d={10/12} h={6.33}
        top="#a8523c" side="#8a4634" dark="#7a3d2c"/>

      {/* Strength rack — uprights against right wall (y=0) + lifting platform out */}
      <Quad corners={[[14, 0, 0.03],[20, 0, 0.03],[20, 8, 0.03],[14, 8, 0.03]]} fill="#3a2f24"/>
      <Quad corners={[[14.6, 0.6, 0.04],[19.4, 0.6, 0.04],[19.4, 7.4, 0.04],[14.6, 7.4, 0.04]]} fill="#5a4a3a"/>
      {[[15, 0],[19, 0],[15, 4],[19, 4]].map(([px, py], i) => (
        <Box3 key={`up${i}`} x={px - 0.125} y={py - 0.125} w={0.25} d={0.25} h={7.5}
          top="#1a1715" side="#22201d" dark="#15120f"/>
      ))}
      <Line a={[15, 0, 7.5]} b={[19, 0, 7.5]} stroke="#1a1715" strokeWidth={1.5}/>
      <Line a={[15, 4, 7.5]} b={[19, 4, 7.5]} stroke="#1a1715" strokeWidth={1.5}/>
      <Line a={[15, 0, 7.5]} b={[15, 4, 7.5]} stroke="#1a1715" strokeWidth={1.5}/>
      <Line a={[19, 0, 7.5]} b={[19, 4, 7.5]} stroke="#1a1715" strokeWidth={1.5}/>
      <Line a={[13.5, 3.6, 3.5]} b={[20.5, 3.6, 3.5]} stroke="#3a3a3a" strokeWidth={2.4}/>
      <Box3 x={13.4} y={3.0} w={0.3} d={1.2} h={1.4} top="#1a1715" side="#22201d" dark="#15120f"/>
      <Box3 x={20.3} y={3.0} w={0.3} d={1.2} h={1.4} top="#1a1715" side="#22201d" dark="#15120f"/>

      {/* Med-ball area + plyo target on right wall */}
      <Quad corners={[[22, 0, 0.03],[34, 0, 0.03],[34, 9, 0.03],[22, 9, 0.03]]} fill="#b8a890" opacity={0.95}/>
      <Line a={[22, 9, 0]} b={[22, 9, 10]} stroke="#1a1a1a" strokeWidth={1.2}/>
      <Line a={[34, 9, 0]} b={[34, 9, 10]} stroke="#1a1a1a" strokeWidth={1.2}/>
      <Line a={[22, 9, 10]} b={[34, 9, 10]} stroke="#1a1a1a" strokeWidth={1.2}/>
      <Line a={[22, 0, 10]} b={[22, 9, 10]} stroke="#1a1a1a" strokeWidth={1.2}/>
      <Line a={[34, 0, 10]} b={[34, 9, 10]} stroke="#1a1a1a" strokeWidth={1.2}/>
      <Line a={[22, 0, 0]} b={[22, 0, 10]} stroke="#1a1a1a" strokeWidth={1.2}/>
      <Line a={[34, 0, 0]} b={[34, 0, 10]} stroke="#1a1a1a" strokeWidth={1.2}/>
      {Array.from({length: 6}, (_, i) => 22 + i * 2).map(x => (
        <g key={`mbm${x}`}>
          <Line a={[x, 9, 10]} b={[x + 2, 9, 0]} stroke="rgba(20,20,30,.4)" strokeWidth={0.6}/>
          <Line a={[x, 9, 0]} b={[x + 2, 9, 10]} stroke="rgba(20,20,30,.4)" strokeWidth={0.6}/>
        </g>
      ))}
      {/* Plyo target on right wall inside med-ball area */}
      <Quad corners={[[26, 0.01, 0.5],[30, 0.01, 0.5],[30, 0.01, 4.5],[26, 0.01, 4.5]]} fill="#5a4a3a" stroke="#3a2f24" strokeWidth={1}/>

      {/* Mirror on right wall (y=0) */}
      <Quad corners={[[40, 0.02, 1],[48, 0.02, 1],[48, 0.02, 8],[40, 0.02, 8]]} fill="#cfd6dd" stroke="#7a8088" strokeWidth={1.2}/>
      {[41, 43, 45, 47].map(mx => (
        <Line key={`mr${mx}`} a={[mx, 0.01, 1.5]} b={[mx, 0.01, 7.5]} stroke="rgba(255,255,255,.4)" strokeWidth={0.8}/>
      ))}

      {/* Bathroom enclosure — front-right corner */}
      <Quad corners={[[72, 5, 0],[77, 5, 0],[77, 5, 9],[72, 5, 9]]} fill={POV_PAL.wall} stroke={POV_PAL.wallShade} strokeWidth={0.6}/>
      <Quad corners={[[72, 0, 0],[72, 5, 0],[72, 5, 9],[72, 0, 9]]} fill={POV_PAL.wall}/>
      {/* Door cutout */}
      <Quad corners={[[72, 5, 0],[73.75, 5, 0],[73.75, 5, 7],[72, 5, 7]]} fill="#3a2f24"/>

      {/* HUD */}
      <g style={{ pointerEvents: 'none' }}>
        <rect x={20} y={20} width={340} height={70} fill="rgba(0,0,0,.55)" rx={8}/>
        <text x={36} y={48} fill="#fafaf5" fontFamily="JetBrains Mono, monospace" fontSize={13} fontWeight={600}>
          POV · outside cage, front of building
        </text>
        <text x={36} y={68} fill="rgba(255,255,255,.7)" fontFamily="JetBrains Mono, monospace" fontSize={11}>
          eye height 5'6"  ·  full netted shell visible
        </text>
      </g>
    </svg>
  );
}

window.POVLayout = POVLayout;
