// facility.jsx — Isometric 3D renderer for an 80x25 ft baseball facility.
// All coordinates are in FEET. (x = along the 80ft length, y = across 25ft width, z = height)
// Bottom-left of plan = (0, 0). Front entrance is bottom (low x).
//
// Iso projection: 30° classic. 1 ft = FT pixels.

const FT = 7;                    // pixels per foot
const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

// World (feet) -> screen (px). z is height in feet.
function iso(x, y, z = 0) {
  return {
    x: (x - y) * COS30 * FT,
    y: ((x + y) * SIN30 - z) * FT,
  };
}

// Convert iso point to "M x y" / "L x y" string
const P = (x, y, z = 0) => {
  const p = iso(x, y, z);
  return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
};

// ── Palette (warm, modern minimal) ─────────────────────────
const PAL = {
  paper:   '#f7f5f1',
  ink:     '#2a2724',
  inkSoft: '#6b6560',
  rule:    '#c9c2b8',
  // floor surfaces
  concrete:    '#d6cfc3',  // entrance pads
  concreteDk:  '#b8b0a3',
  turf:        '#9bb38a',
  turfDk:      '#7d9670',
  cageRubber:  '#c8b8a8',  // batting cage floor
  cageRubberDk:'#ad9d8d',
  weights:     '#a8b4c2',  // weight area floor
  weightsDk:   '#8995a3',
  bullpen:     '#d4a88a',
  bullpenDk:   '#b88a6c',
  bath:        '#e8dfd2',
  bathDk:      '#cfc4b3',
  // walls
  wall:        '#ebe6dc',
  wallShade:   '#d2cabd',
  wallTop:     '#f5f1e8',
};

// ── Polygon utilities ──────────────────────────────────────
// A "floor patch" is a rectangle on the ground in feet: {x, y, w, h, fill, dark, label, sub}
function FloorRect({ x, y, w, h, fill, stroke = 'rgba(0,0,0,.18)' }) {
  const pts = [P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)].join(' ');
  return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={0.6} strokeLinejoin="round" />;
}

// A 3D box (extruded rectangle) for walls, mounds, equipment
function Box({ x, y, w, h, z = 0, height, top, side1, side2, stroke = 'rgba(0,0,0,.25)' }) {
  // Top face (visible)
  const tp = [P(x, y, z + height), P(x + w, y, z + height), P(x + w, y + h, z + height), P(x, y + h, z + height)].join(' ');
  // Front-right face (visible side, looking at +x edge): from (x+w, y) to (x+w, y+h)
  const rt = [P(x + w, y, z), P(x + w, y + h, z), P(x + w, y + h, z + height), P(x + w, y, z + height)].join(' ');
  // Front-left face (looking at +y edge): from (x, y+h) to (x+w, y+h)
  const lf = [P(x, y + h, z), P(x + w, y + h, z), P(x + w, y + h, z + height), P(x, y + h, z + height)].join(' ');
  return (
    <g>
      <polygon points={rt} fill={side1} stroke={stroke} strokeWidth={0.6} strokeLinejoin="round" />
      <polygon points={lf} fill={side2} stroke={stroke} strokeWidth={0.6} strokeLinejoin="round" />
      <polygon points={tp} fill={top} stroke={stroke} strokeWidth={0.6} strokeLinejoin="round" />
    </g>
  );
}

// Wall as a thin extruded box. side picks which edge of the building.
// For exterior walls we draw them with the visible faces facing toward viewer.
function Wall({ x, y, w, h, height = 10, fill = PAL.wall, side1 = PAL.wallShade, top = PAL.wallTop }) {
  return <Box x={x} y={y} w={w} h={h} height={height} top={top} side1={side1} side2={fill} stroke="rgba(0,0,0,.28)" />;
}

// ── Text helpers ─────────────────────────────────────────────
// Iso-aligned text along the +x axis (the 80ft length). Slope ~ -30deg (going up-right in screen).
// Iso-aligned text along the +y axis (the 25ft width). Slope ~ +30deg (going down-right in screen).
const TextX = ({ x, y, z = 0, children, size = 9, fill = PAL.ink, weight = 500, opacity = 1 }) => {
  const p = iso(x, y, z);
  return (
    <text x={p.x} y={p.y} fontSize={size} fontWeight={weight} fill={fill} opacity={opacity}
      transform={`rotate(-30 ${p.x} ${p.y})`}
      fontFamily="Inter, system-ui, sans-serif"
      textAnchor="middle" dominantBaseline="middle"
      style={{ letterSpacing: '0.02em' }}>
      {children}
    </text>
  );
};
const TextY = ({ x, y, z = 0, children, size = 9, fill = PAL.ink, weight = 500, opacity = 1 }) => {
  const p = iso(x, y, z);
  return (
    <text x={p.x} y={p.y} fontSize={size} fontWeight={weight} fill={fill} opacity={opacity}
      transform={`rotate(30 ${p.x} ${p.y})`}
      fontFamily="Inter, system-ui, sans-serif"
      textAnchor="middle" dominantBaseline="middle"
      style={{ letterSpacing: '0.02em' }}>
      {children}
    </text>
  );
};

// Dimension label using mono, smaller
const DimX = (p) => <TextX {...p} size={p.size || 7} weight={400} fill={PAL.inkSoft} />;
const DimY = (p) => <TextY {...p} size={p.size || 7} weight={400} fill={PAL.inkSoft} />;

// ── Floor patch with label centered ────────────────────────
function Zone({ x, y, w, h, fill, label, sub, dim, labelAxis = 'x', textColor = PAL.ink }) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const T = labelAxis === 'x' ? TextX : TextY;
  const D = labelAxis === 'x' ? DimX : DimY;
  return (
    <g>
      <FloorRect x={x} y={y} w={w} h={h} fill={fill} />
      <T x={cx} y={cy - 1.2} size={11} weight={650} fill={textColor}>{label}</T>
      {sub && <T x={cx} y={cy + 0.4} size={7.5} weight={500} fill={textColor} opacity={0.7}>{sub}</T>}
      {dim && <D x={cx} y={cy + 1.8} size={7} fill={textColor} opacity={0.55}>{dim}</D>}
    </g>
  );
}

// ── Pitching mound: a low cylinder/box on the floor ───────
function Mound({ cx, cy, r = 4, h = 0.8 }) {
  // Approximate a low circular mound with an octagon
  const pts = [];
  const pts2 = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    pts.push(P(x, y, h));
    pts2.push(P(x, y, 0));
  }
  // Side faces: connect bottom and top points for the visible front half
  const sides = [];
  for (let i = 0; i < 16; i++) {
    const a1 = (i / 16) * Math.PI * 2;
    const a2 = ((i + 1) / 16) * Math.PI * 2;
    // visible if facing +x or +y (front-right of iso view)
    const mid = (a1 + a2) / 2;
    if (Math.cos(mid) > -0.3 || Math.sin(mid) > -0.3) {
      const x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
      const x2 = cx + Math.cos(a2) * r, y2 = cy + Math.sin(a2) * r;
      sides.push(`${P(x1, y1, 0)} ${P(x2, y2, 0)} ${P(x2, y2, h)} ${P(x1, y1, h)}`);
    }
  }
  return (
    <g>
      {sides.map((s, i) => <polygon key={i} points={s} fill="#a87b5a" stroke="rgba(0,0,0,.2)" strokeWidth={0.4} />)}
      <polygon points={pts.join(' ')} fill="#c79477" stroke="rgba(0,0,0,.25)" strokeWidth={0.5} />
      {/* rubber */}
      <polygon points={[P(cx - 1, cy - 0.25, h + 0.01), P(cx + 1, cy - 0.25, h + 0.01), P(cx + 1, cy + 0.25, h + 0.01), P(cx - 1, cy + 0.25, h + 0.01)].join(' ')} fill="#f5f1e8" stroke="rgba(0,0,0,.3)" strokeWidth={0.4}/>
    </g>
  );
}

// Home plate marker (pentagon-ish, simplified)
function HomePlate({ cx, cy }) {
  const w = 1.2;
  const pts = [
    P(cx - w/2, cy - w/2),
    P(cx + w/2, cy - w/2),
    P(cx + w/2, cy + w/4),
    P(cx, cy + w/2),
    P(cx - w/2, cy + w/4),
  ].join(' ');
  return <polygon points={pts} fill="#fff" stroke="rgba(0,0,0,.4)" strokeWidth={0.4}/>;
}

// L-screen for pitching protection
function LScreen({ cx, cy, h = 7 }) {
  const w = 0.5, d = 4;
  return <Box x={cx - w/2} y={cy - d/2} w={w} h={d} height={h} top="#3a3a3a" side1="#5a5a5a" side2="#4a4a4a"/>;
}

// Dashed-line cage netting (sketch-style) — drawn on the floor as iso dashes
// to clearly read like the user's reference sketch. Optional poles at corners
// and intervals.
function DashedLane({ x, y, w, h, height = 12, showPoles = true, dashLen = 2.2, dashGap = 1.6 }) {
  // Build dashes along the two long edges (at y and y+h) and short edges (at x and x+w).
  const dashes = [];
  const buildEdge = (x1, y1, x2, y2, key) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const dx = (x2 - x1) / len, dy = (y2 - y1) / len;
    let pos = 0;
    let i = 0;
    while (pos < len) {
      const a = pos;
      const b = Math.min(pos + dashLen, len);
      const ax = x1 + dx * a, ay = y1 + dy * a;
      const bx = x1 + dx * b, by = y1 + dy * b;
      const pa = iso(ax, ay, 0);
      const pb = iso(bx, by, 0);
      // floor dash
      dashes.push(<line key={`${key}-${i}-f`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
        stroke="#c8362a" strokeWidth={1.6} strokeLinecap="round" opacity={0.92}/>);
      // top-of-net dash (echoes the floor at z=height) — much fainter
      const paT = iso(ax, ay, height);
      const pbT = iso(bx, by, height);
      dashes.push(<line key={`${key}-${i}-t`} x1={paT.x} y1={paT.y} x2={pbT.x} y2={pbT.y}
        stroke="#c8362a" strokeWidth={1.0} strokeLinecap="round" opacity={0.45}/>);
      pos += dashLen + dashGap;
      i++;
    }
  };
  // long edges
  buildEdge(x, y, x + w, y, 'top');
  buildEdge(x, y + h, x + w, y + h, 'bot');
  // short edges (front + back of lane)
  buildEdge(x, y, x, y + h, 'left');
  buildEdge(x + w, y, x + w, y + h, 'right');

  // a couple of vertical pole hints to show this is netted, not a wall
  const poles = [];
  if (showPoles) {
    const longSteps = Math.max(2, Math.round(w / 16));
    const positions = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]];
    for (let i = 1; i < longSteps; i++) {
      positions.push([x + (w * i / longSteps), y]);
      positions.push([x + (w * i / longSteps), y + h]);
    }
    for (const [px, py] of positions) {
      const pb = iso(px, py, 0);
      const pt = iso(px, py, height);
      poles.push(<line key={`pl-${px}-${py}`} x1={pb.x} y1={pb.y} x2={pt.x} y2={pt.y}
        stroke="rgba(60,40,35,0.35)" strokeWidth={0.6} strokeDasharray="1.5 2"/>);
    }
  }
  return <g>{poles}{dashes}</g>;
}

// Batting cage net structure - poles + mesh top edges
function CageNet({ x, y, w, h, height = 12 }) {
  const poles = [];
  // 4 corners
  const corners = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  // intermediate poles along long edges
  const longSteps = Math.max(2, Math.round(w / 14));
  for (let i = 1; i < longSteps; i++) {
    corners.push([x + (w * i / longSteps), y]);
    corners.push([x + (w * i / longSteps), y + h]);
  }
  for (const [px, py] of corners) {
    poles.push(<Box key={`p-${px}-${py}`} x={px - 0.15} y={py - 0.15} w={0.3} h={0.3} height={height} top="#2a2724" side1="#3a3530" side2="#2f2a25"/>);
  }
  // top mesh frame (4 edges) - thin lines
  const topEdges = [
    [P(x, y, height), P(x + w, y, height)],
    [P(x + w, y, height), P(x + w, y + h, height)],
    [P(x + w, y + h, height), P(x, y + h, height)],
    [P(x, y + h, height), P(x, y, height)],
  ];
  // net mesh - draw as semi-transparent gray polygon for the front-facing sides
  const sideFront = [P(x, y + h, 0), P(x + w, y + h, 0), P(x + w, y + h, height), P(x, y + h, height)].join(' ');
  const sideRight = [P(x + w, y, 0), P(x + w, y + h, 0), P(x + w, y + h, height), P(x + w, y, height)].join(' ');
  // mesh pattern as crosshatch
  return (
    <g>
      {/* netting - very transparent so you can still see what's inside */}
      <polygon points={sideFront} fill="rgba(80,75,68,0.12)" stroke="rgba(80,75,68,.3)" strokeWidth={0.4}/>
      <polygon points={sideRight} fill="rgba(80,75,68,0.18)" stroke="rgba(80,75,68,.35)" strokeWidth={0.4}/>
      {/* horizontal strands on visible faces */}
      {[0.25, 0.5, 0.75].map((t, i) => {
        const z = height * t;
        return (
          <g key={i} stroke="rgba(60,55,50,.2)" strokeWidth={0.3} fill="none">
            <line x1={iso(x, y + h, z).x} y1={iso(x, y + h, z).y} x2={iso(x + w, y + h, z).x} y2={iso(x + w, y + h, z).y}/>
            <line x1={iso(x + w, y, z).x} y1={iso(x + w, y, z).y} x2={iso(x + w, y + h, z).x} y2={iso(x + w, y + h, z).y}/>
          </g>
        );
      })}
      {/* poles last so they sit on top of the net */}
      {poles}
      {/* top frame */}
      {topEdges.map((e, i) => (
        <line key={i} x1={e[0].split(',')[0]} y1={e[0].split(',')[1]} x2={e[1].split(',')[0]} y2={e[1].split(',')[1]}
          stroke="rgba(40,35,30,.55)" strokeWidth={0.6}/>
      ))}
    </g>
  );
}

// Weight rack (simple shelf)
function Rack({ x, y, w = 6, h = 2, height = 6 }) {
  return (
    <g>
      <Box x={x} y={y} w={w} h={h} height={height} top="#5a6473" side1="#7a8493" side2="#6a7483"/>
      {/* shelves */}
      {[2, 4].map((zh, i) => (
        <FloorRect key={i} x={x + 0.2} y={y + 0.3} w={w - 0.4} h={h - 0.6}
          fill="#3a4250" stroke="none"/>
      ))}
    </g>
  );
}

// Bench
function Bench({ x, y, w = 4, h = 1.2 }) {
  return <Box x={x} y={y} w={w} h={h} height={1.6} top="#3a3530" side1="#5a544c" side2="#4a443c"/>;
}

// Dumbbell rack
function DBRack({ x, y, w = 5, h = 1 }) {
  return (
    <g>
      <Box x={x} y={y} w={w} h={h} height={2.5} top="#4a5260" side1="#6a7280" side2="#5a626f"/>
      {/* dumbbells on top */}
      {[0, 1, 2, 3].map(i => (
        <circle key={i} cx={iso(x + 0.6 + i * 1.1, y + h/2, 2.5).x} cy={iso(x + 0.6 + i * 1.1, y + h/2, 2.5).y}
          r={1.2} fill="#2a2724" stroke="rgba(0,0,0,.4)" strokeWidth={0.3}/>
      ))}
    </g>
  );
}

// Plyo box
function PlyoBox({ x, y, s = 2 }) {
  return <Box x={x} y={y} w={s} h={s} height={s * 0.9} top="#c4654a" side1="#9a4a35" side2="#a8533d"/>;
}

// Door indicator on a wall
function DoorMark({ x, y, w, h, axis }) {
  // draws a lighter notch in the wall
  return <FloorRect x={x} y={y} w={w} h={h} fill="rgba(255,255,255,.4)" stroke="none"/>;
}

// ── Architectural symbols ──────────────────────────────────
// All on the floor plane (z=0) so they read like a true plan.
// Coordinates in feet.

// Solid wall — drawn as an extruded box with a darker top so it reads as
// a poché'd plan wall in iso. wall_thk default = 0.5 ft (6").
function ArchWall({ x, y, w, h, height = 9, exterior = false }) {
  const top = exterior ? '#3a3530' : '#4a443c';
  const side1 = exterior ? '#2a2520' : '#3a342d';
  const side2 = exterior ? '#322d28' : '#403a32';
  return <Box x={x} y={y} w={w} h={h} height={height} top={top} side1={side1} side2={side2} stroke="rgba(0,0,0,.5)"/>;
}

// Door symbol: a 3ft opening in a wall + quarter-arc swing.
// `axis`: 'x' = wall runs along x (door cuts a notch in y), 'y' = wall runs along y.
// `hinge`: 'low' or 'high' end of the door opening (controls arc direction).
// `swing`: 'in' or 'out' relative to the wall-normal direction.
// (cx, cy) is the center of the opening on the wall centerline.
function Door({ cx, cy, axis = 'x', hinge = 'low', swing = 'in', width = 3, wallThk = 0.5 }) {
  // Compute hinge point and arc end on the floor.
  let hx, hy, ex, ey;
  if (axis === 'x') {
    // wall runs in x direction; door opening width is along x
    hx = hinge === 'low' ? cx - width / 2 : cx + width / 2;
    hy = cy;
    // door leaf swings into +y (in) or -y (out)
    const dy = swing === 'in' ? width : -width;
    const dx = hinge === 'low' ? width : -width;
    ex = hx + dx;
    ey = hy; // leaf-end if door were fully open along the wall (used for arc end)
    // arc end is at (hx, hy + dy) — door at 90° to wall
    ex = hx;
    ey = hy + dy;
  } else {
    hx = cx;
    hy = hinge === 'low' ? cy - width / 2 : cy + width / 2;
    const dx = swing === 'in' ? width : -width;
    ex = hx + dx;
    ey = hy;
  }
  const ph = iso(hx, hy, 0);
  const pe = iso(ex, ey, 0);
  // Compute arc using elliptical SVG arc — iso projection of a circle is an ellipse.
  // Approximation: build the arc as a polyline of 12 segments through iso space.
  const arc = [];
  const segs = 16;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    let ax2, ay2;
    if (axis === 'x') {
      const a0 = swing === 'in' ? Math.PI / 2 : -Math.PI / 2;
      const a1 = hinge === 'low' ? 0 : Math.PI;
      const ang = a0 + (a1 - a0) * t;
      ax2 = hx + Math.cos(ang) * width;
      ay2 = hy + Math.sin(ang) * width;
    } else {
      const a0 = swing === 'in' ? 0 : Math.PI;
      const a1 = hinge === 'low' ? -Math.PI / 2 : Math.PI / 2;
      const ang = a0 + (a1 - a0) * t;
      ax2 = hx + Math.cos(ang) * width;
      ay2 = hy + Math.sin(ang) * width;
    }
    const p = iso(ax2, ay2, 0);
    arc.push(`${p.x},${p.y}`);
  }
  // Door leaf line (hinge -> 90° open position)
  return (
    <g>
      {/* opening: a paper-colored gap to "cut" the wall visually */}
      {axis === 'x' ? (
        <FloorRect x={cx - width / 2} y={cy - wallThk / 2} w={width} h={wallThk} fill={PAL.paper} stroke="none"/>
      ) : (
        <FloorRect x={cx - wallThk / 2} y={cy - width / 2} w={wallThk} h={width} fill={PAL.paper} stroke="none"/>
      )}
      {/* arc */}
      <polyline points={arc.join(' ')} fill="none" stroke="#2a2724" strokeWidth={0.5} strokeDasharray="1.2 1"/>
      {/* leaf */}
      <line x1={ph.x} y1={ph.y} x2={pe.x} y2={pe.y} stroke="#2a2724" strokeWidth={0.9}/>
      {/* hinge dot */}
      <circle cx={ph.x} cy={ph.y} r={0.6} fill="#2a2724"/>
    </g>
  );
}

// Toilet — plan symbol: rectangular tank + rounded-rectangle bowl.
// `face` = direction the bowl points: 'px','nx','py','ny' (along + or - x/y axis)
function Toilet({ x, y, face = 'py' }) {
  // tank: 1.7w x 0.8d, bowl: 1.4w x 1.4d
  const tankW = 1.7, tankD = 0.8;
  const bowlW = 1.4, bowlD = 1.4;
  // base position: x,y is back-of-tank corner closest to wall
  let tank, bowl, bowlCenter;
  if (face === 'py') {
    // tank along -y wall, bowl extends +y
    tank = { x, y, w: tankW, h: tankD };
    bowl = { cx: x + tankW / 2, cy: y + tankD + bowlD / 2 };
  } else if (face === 'ny') {
    tank = { x, y: y - tankD, w: tankW, h: tankD };
    bowl = { cx: x + tankW / 2, cy: y - tankD - bowlD / 2 };
  } else if (face === 'px') {
    tank = { x, y, w: tankD, h: tankW };
    bowl = { cx: x + tankD + bowlD / 2, cy: y + tankW / 2 };
  } else {
    tank = { x: x - tankD, y, w: tankD, h: tankW };
    bowl = { cx: x - tankD - bowlD / 2, cy: y + tankW / 2 };
  }
  return (
    <g>
      {/* tank */}
      <FloorRect x={tank.x} y={tank.y} w={tank.w} h={tank.h} fill="#fff" stroke="rgba(0,0,0,.6)"/>
      {/* bowl as ellipse in iso */}
      {(() => {
        const cIso = iso(bowl.cx, bowl.cy, 0);
        return <ellipse cx={cIso.x} cy={cIso.y} rx={bowlW / 2 * COS30 * FT} ry={bowlD / 2 * SIN30 * FT}
          fill="#fff" stroke="rgba(0,0,0,.6)" strokeWidth={0.55}/>;
      })()}
    </g>
  );
}

// Sink — plan symbol: a counter rectangle with a basin oval inside.
function Sink({ x, y, w = 2, d = 1.6 }) {
  return (
    <g>
      <FloorRect x={x} y={y} w={w} h={d} fill="#fff" stroke="rgba(0,0,0,.6)"/>
      {(() => {
        const c = iso(x + w / 2, y + d / 2, 0);
        return <ellipse cx={c.x} cy={c.y} rx={(w * 0.36) * COS30 * FT} ry={(d * 0.36) * SIN30 * FT}
          fill={PAL.paper} stroke="rgba(0,0,0,.5)" strokeWidth={0.5}/>;
      })()}
      {/* faucet dot */}
      {(() => {
        const c = iso(x + w / 2, y + 0.25, 0);
        return <circle cx={c.x} cy={c.y} r={0.5} fill="#7a7570"/>;
      })()}
    </g>
  );
}

// Overhead garage door — shown as a heavy dashed line on the floor at the
// opening + small "OH" label. Width specified in feet. axis='x' or 'y'.
function GarageDoor({ cx, cy, width = 10, axis = 'x' }) {
  const a = axis === 'x'
    ? [iso(cx - width/2, cy, 0), iso(cx + width/2, cy, 0)]
    : [iso(cx, cy - width/2, 0), iso(cx, cy + width/2, 0)];
  return (
    <g>
      <line x1={a[0].x} y1={a[0].y} x2={a[1].x} y2={a[1].y}
        stroke="#2a2724" strokeWidth={1.4} strokeDasharray="2.5 1.6"/>
      {/* track stubs perpendicular to door at each end */}
      {[0, 1].map(i => {
        const ax = axis === 'x' ? (cx + (i === 0 ? -width/2 : width/2)) : cx;
        const ay = axis === 'x' ? cy : (cy + (i === 0 ? -width/2 : width/2));
        const ax2 = axis === 'x' ? ax : ax + 1.2;
        const ay2 = axis === 'x' ? ay + 1.2 : ay;
        const p1 = iso(ax, ay, 0), p2 = iso(ax2, ay2, 0);
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#2a2724" strokeWidth={0.6}/>;
      })}
    </g>
  );
}

// Roof truss — dashed line overhead (z = wall height), suggesting unfinished
// ceiling. axis='y' means truss runs across the building width.
function Truss({ x, axis = 'y', y0 = 0, y1 = 25, z = 12 }) {
  const a = iso(x, y0, z);
  const b = iso(x, y1, z);
  return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(60,55,50,0.55)" strokeWidth={0.5} strokeDasharray="2 1.5"/>;
}

// ── End architectural symbols ──────────────────────────────


// Builds outer walls along the perimeter of the 80x25 footprint, leaving
// 3ft concrete pads at x=0..3 (back, top-of-plan) and x=77..80 (front, bottom).
// Wall thickness: 0.5 ft visual.
function Shell({ entranceSide = 'left' }) {
  const T = 0.5;          // wall thickness
  const H = 9;            // wall height
  const W = 80, D = 25;   // length × width

  // We DO NOT draw the front-facing walls (the two closer to the viewer)
  // to keep the interior visible. In our iso projection (+x and +y go down-right),
  // the "back" walls that should remain are: the y=0 edge (top-back) and the
  // x=0 edge (left-back).
  return (
    <g>
      {/* back wall along y=0 (top side of plan) - full length */}
      <Wall x={0} y={-T} w={W} h={T} height={H} />
      {/* left wall along x=0 (back of facility, where back entrance is) - full width */}
      <Wall x={-T} y={0} w={T} h={D} height={H} />
      {/* front-left short stub at x=W to suggest enclosure on bottom-right corner */}
      {/* skipped to reveal interior */}
    </g>
  );
}

// ── Layout primitives end ─────────────────────────────────

// ============================================================
// LAYOUT 1 — Linear flow
// Front entrance (low x, near viewer) → cage → turf → bullpen at back
// Bathroom in front-right (high y, low x) corner
// Weights along the right side (high y)
// ============================================================
function Layout1() {
  // Floor zones
  return (
    <>
      {/* Concrete entrance pads (front low x, back high x). Building x=0..80. */}
      {/* Front pad: x=0..3 (closest to viewer in iso since x small and y small are upper-back...) */}
      {/* Actually with iso: low x and low y is the LEFT-BACK corner. */}
      {/* User said "bottom-left = front entrance". In top-down plan with vertical orientation,
          bottom-left is (x=80, y=0) here (since x runs along length). Let's reorient:
          Make x=80 be the FRONT (bottom of plan, closer to viewer in iso would be high x+y).
          For best iso visibility we want the FRONT to be at the bottom-right of the SVG = high x and high y.
          So entrance front is x=77..80 (front), back is x=0..3.
          Front-right corner (bathroom) = high x, high y. */}

      {/* Back concrete pad (x=0..3) */}
      <Zone x={0} y={0} w={3} h={25} fill={PAL.concrete} label="" />
      {/* Front concrete pad (x=77..80) */}
      <Zone x={77} y={0} w={3} h={25} fill={PAL.concrete} label="" />

      {/* Concrete texture lines */}
      {[1, 2].map(i => (
        <line key={`b${i}`}
          x1={iso(i, 0).x} y1={iso(i, 0).y}
          x2={iso(i, 25).x} y2={iso(i, 25).y}
          stroke={PAL.concreteDk} strokeWidth={0.3} opacity={0.5}/>
      ))}
      {[78, 79].map(i => (
        <line key={`f${i}`}
          x1={iso(i, 0).x} y1={iso(i, 0).y}
          x2={iso(i, 25).x} y2={iso(i, 25).y}
          stroke={PAL.concreteDk} strokeWidth={0.3} opacity={0.5}/>
      ))}

      {/* Bathroom 5x5 in front-right corner. Front = x=77..80; right = high y (y=20..25).
          But bathroom should be INSIDE building, so it sits at x=72..77, y=20..25 (just before the front concrete) */}
      <Zone x={72} y={20} w={5} h={5} fill={PAL.bath} label="BATHROOM" sub="5×5 ft" labelAxis="x"/>

      {/* Batting cage near the front entrance: 14ft wide x 50ft long. */}
      {/* Place along the LEFT side (low y) so user enters and cage is on left. */}
      {/* x = 22..72 (50 ft long), y = 0..14 (14ft wide) */}
      <Zone x={22} y={0} w={50} h={14} fill={PAL.cageRubber} label="BATTING CAGE" sub="50' × 14' tunnel" labelAxis="x"/>

      {/* Turf / open training: between back-pad and cage start, full width except cage zone overlap */}
      {/* x=3..22 (19 ft long) by full 25ft width */}
      <Zone x={3} y={0} w={19} h={25} fill={PAL.turf} label="TURF / OPEN TRAINING" sub="19' × 25'" labelAxis="x" textColor="#2d3a25"/>

      {/* Bullpen / pitching: at back, in lane between cage end and back pad, but we already used that.
          Put bullpen tucked at back of cage tunnel? Better: split.
          Let's put pitching mound INSIDE the cage tunnel itself — common setup. */}

      {/* Weights area: right side adjacent to cage, x=22..72, y=14..25 (50' x 11') */}
      {/* But bathroom occupies x=72..77 y=20..25. Weights: x=22..72, y=14..25 */}
      <Zone x={22} y={14} w={50} h={11} fill={PAL.weights} label="WEIGHT / STRENGTH" sub="50' × 11'" labelAxis="x" textColor="#2a3540"/>

      {/* Bullpen: small mound + plate inside cage. Pitcher rubber 60.5 ft from plate. */}
      {/* Plate at front of cage (high x), mound 60.5 ft away. Cage is 50 ft though; use full length */}
      <Mound cx={28} cy={7} r={3.5}/>
      <HomePlate cx={68} cy={7}/>
      <LScreen cx={32} cy={7}/>

      {/* Equipment in weights zone */}
      <Rack x={25} y={15.5} w={6} h={1.5}/>
      <Rack x={33} y={15.5} w={6} h={1.5}/>
      <Bench x={26} y={19} w={4} h={1.2}/>
      <Bench x={34} y={19} w={4} h={1.2}/>
      <DBRack x={42} y={15.5} w={5} h={1}/>
      <PlyoBox x={42} y={19} s={2}/>
      <PlyoBox x={45.5} y={19} s={2.5}/>
      <Rack x={50} y={15.5} w={6} h={1.5}/>
      <Bench x={51} y={19} w={4} h={1.2}/>
      <PlyoBox x={58} y={19} s={2}/>
      <DBRack x={62} y={15.5} w={5} h={1}/>

      {/* Cage net structure */}
      <CageNet x={22} y={0} w={50} h={14} height={12}/>

      {/* Bathroom walls (interior partition) */}
      <Wall x={72} y={20 - 0.4} w={5} h={0.4} height={9}/>
      <Wall x={72 - 0.4} y={20} w={0.4} h={5} height={9}/>

      {/* Building shell */}
      <Shell />

      {/* Entrance arrows */}
      <g>
        {/* Front entrance (x=80 side) */}
        <g transform={`translate(${iso(80, 12.5).x}, ${iso(80, 12.5).y + 12})`}>
          <text fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill={PAL.ink} fontWeight={600} textAnchor="middle" letterSpacing="0.1em">FRONT ENTRANCE</text>
          <text fontFamily="JetBrains Mono, monospace" fontSize="5.5" fill={PAL.inkSoft} y="8" textAnchor="middle">3 FT CONCRETE PAD</text>
        </g>
        {/* Back entrance (x=0 side) */}
        <g transform={`translate(${iso(0, 12.5).x - 0}, ${iso(0, 12.5).y - 18})`}>
          <text fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill={PAL.ink} fontWeight={600} textAnchor="middle" letterSpacing="0.1em">BACK ENTRANCE</text>
          <text fontFamily="JetBrains Mono, monospace" fontSize="5.5" fill={PAL.inkSoft} y="8" textAnchor="middle">3 FT CONCRETE PAD</text>
        </g>
      </g>

      {/* Overall dimensions on outside of shell */}
      <DimX x={40} y={-3} z={0} size={9} weight={500}>80 FT (LENGTH)</DimX>
      <DimY x={-3} y={12.5} z={0} size={9} weight={500}>25 FT (WIDTH)</DimY>
    </>
  );
}

// ============================================================
// LAYOUT 2 — Split duty (cage/bullpen one side, turf+weights other)
// ============================================================
function Layout2() {
  return (
    <>
      <Zone x={0} y={0} w={3} h={25} fill={PAL.concrete} label="" />
      <Zone x={77} y={0} w={3} h={25} fill={PAL.concrete} label="" />

      {/* Bathroom front-right */}
      <Zone x={72} y={20} w={5} h={5} fill={PAL.bath} label="BATHROOM" sub="5×5 ft" labelAxis="x"/>

      {/* Long cage running nearly full length (70ft x 14ft) */}
      <Zone x={3} y={0} w={69} h={14} fill={PAL.cageRubber} label="BATTING CAGE + BULLPEN" sub="69' × 14' multi-use tunnel" labelAxis="x"/>

      {/* Turf in back portion of right side */}
      <Zone x={3} y={14} w={32} h={11} fill={PAL.turf} label="TURF / TEE WORK" sub="32' × 11'" labelAxis="x" textColor="#2d3a25"/>

      {/* Weights front portion of right side (not over bathroom) */}
      <Zone x={35} y={14} w={37} h={6} fill={PAL.weights} label="WEIGHT / STRENGTH" sub="37' × 6'" labelAxis="x" textColor="#2a3540"/>
      <Zone x={35} y={20} w={37} h={5} fill={PAL.weights} label="" />

      {/* Mound in cage */}
      <Mound cx={20} cy={7} r={3.5}/>
      <HomePlate cx={66} cy={7}/>
      <LScreen cx={24} cy={7}/>

      {/* Tees in turf */}
      {[10, 17, 24, 31].map((tx, i) => (
        <g key={i}>
          <Box x={tx - 0.15} y={19 - 0.15} w={0.3} h={0.3} height={3} top="#3a3530" side1="#5a544c" side2="#4a443c"/>
          <circle cx={iso(tx, 19, 3).x} cy={iso(tx, 19, 3).y} r={0.8} fill="#fff" stroke="rgba(0,0,0,.3)" strokeWidth={0.3}/>
        </g>
      ))}

      {/* Weight equipment */}
      <Rack x={36} y={15} w={6} h={1.5}/>
      <Rack x={44} y={15} w={6} h={1.5}/>
      <Rack x={52} y={15} w={6} h={1.5}/>
      <Bench x={37} y={18.5} w={4} h={1.2}/>
      <Bench x={45} y={18.5} w={4} h={1.2}/>
      <DBRack x={60} y={15} w={5} h={1}/>
      <PlyoBox x={60} y={18.5} s={2}/>
      <PlyoBox x={63.5} y={18.5} s={2}/>
      <DBRack x={36} y={22} w={5} h={1}/>
      <Bench x={45} y={22.5} w={4} h={1.2}/>
      <PlyoBox x={52} y={22} s={2}/>
      <PlyoBox x={55.5} y={22} s={2.5}/>
      <Rack x={62} y={22} w={6} h={1.5}/>

      <CageNet x={3} y={0} w={69} h={14} height={12}/>

      <Wall x={72} y={20 - 0.4} w={5} h={0.4} height={9}/>
      <Wall x={72 - 0.4} y={20} w={0.4} h={5} height={9}/>

      <Shell />

      <g>
        <g transform={`translate(${iso(80, 12.5).x}, ${iso(80, 12.5).y + 12})`}>
          <text fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill={PAL.ink} fontWeight={600} textAnchor="middle" letterSpacing="0.1em">FRONT ENTRANCE</text>
          <text fontFamily="JetBrains Mono, monospace" fontSize="5.5" fill={PAL.inkSoft} y="8" textAnchor="middle">3 FT CONCRETE PAD</text>
        </g>
        <g transform={`translate(${iso(0, 12.5).x}, ${iso(0, 12.5).y - 18})`}>
          <text fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill={PAL.ink} fontWeight={600} textAnchor="middle" letterSpacing="0.1em">BACK ENTRANCE</text>
          <text fontFamily="JetBrains Mono, monospace" fontSize="5.5" fill={PAL.inkSoft} y="8" textAnchor="middle">3 FT CONCRETE PAD</text>
        </g>
      </g>

      <DimX x={40} y={-3} size={9} weight={500}>80 FT (LENGTH)</DimX>
      <DimY x={-3} y={12.5} size={9} weight={500}>25 FT (WIDTH)</DimY>
    </>
  );
}

// ============================================================
// LAYOUT 3 — Hub layout (turf central, specialty zones flank)
// ============================================================
function Layout3() {
  return (
    <>
      <Zone x={0} y={0} w={3} h={25} fill={PAL.concrete} label="" />
      <Zone x={77} y={0} w={3} h={25} fill={PAL.concrete} label="" />

      <Zone x={72} y={20} w={5} h={5} fill={PAL.bath} label="BATHROOM" sub="5×5 ft" labelAxis="x"/>

      {/* Weights in back third (near back entrance) */}
      <Zone x={3} y={0} w={22} h={25} fill={PAL.weights} label="WEIGHT / STRENGTH" sub="22' × 25'" labelAxis="x" textColor="#2a3540"/>

      {/* Turf central (hub) */}
      <Zone x={25} y={0} w={28} h={25} fill={PAL.turf} label="TURF / OPEN TRAINING" sub="28' × 25'" labelAxis="x" textColor="#2d3a25"/>

      {/* Cage front third */}
      <Zone x={53} y={0} w={24} h={14} fill={PAL.cageRubber} label="BATTING CAGE" sub="24' × 14'" labelAxis="x"/>

      {/* Bullpen front third right */}
      <Zone x={53} y={14} w={19} h={11} fill={PAL.bullpen} label="BULLPEN" sub="19' × 11'" labelAxis="x" textColor="#5a3520"/>

      {/* Mound in bullpen */}
      <Mound cx={59} cy={19} r={3.2}/>
      <HomePlate cx={70} cy={19}/>

      {/* Mound in cage */}
      <Mound cx={58} cy={7} r={3}/>
      <HomePlate cx={73} cy={7}/>
      <LScreen cx={61} cy={7}/>

      {/* Weight equipment - back area */}
      <Rack x={5} y={2} w={6} h={1.5}/>
      <Rack x={13} y={2} w={6} h={1.5}/>
      <Bench x={6} y={5.5} w={4} h={1.2}/>
      <Bench x={14} y={5.5} w={4} h={1.2}/>
      <DBRack x={5} y={9} w={5} h={1}/>
      <DBRack x={13} y={9} w={5} h={1}/>
      <PlyoBox x={20} y={2} s={2}/>
      <PlyoBox x={20} y={5} s={2.5}/>
      <Rack x={5} y={14} w={6} h={1.5}/>
      <Rack x={13} y={14} w={6} h={1.5}/>
      <Bench x={6} y={17.5} w={4} h={1.2}/>
      <Bench x={14} y={17.5} w={4} h={1.2}/>
      <PlyoBox x={5} y={21} s={2}/>
      <PlyoBox x={9} y={21} s={2}/>
      <PlyoBox x={13} y={21} s={2}/>
      <PlyoBox x={17} y={21} s={2}/>

      {/* Tees in turf */}
      {[30, 36, 42, 48].map((tx, i) => (
        <g key={`t1-${i}`}>
          <Box x={tx - 0.15} y={5 - 0.15} w={0.3} h={0.3} height={3} top="#3a3530" side1="#5a544c" side2="#4a443c"/>
          <circle cx={iso(tx, 5, 3).x} cy={iso(tx, 5, 3).y} r={0.8} fill="#fff" stroke="rgba(0,0,0,.3)" strokeWidth={0.3}/>
        </g>
      ))}
      {[30, 36, 42, 48].map((tx, i) => (
        <g key={`t2-${i}`}>
          <Box x={tx - 0.15} y={20 - 0.15} w={0.3} h={0.3} height={3} top="#3a3530" side1="#5a544c" side2="#4a443c"/>
          <circle cx={iso(tx, 20, 3).x} cy={iso(tx, 20, 3).y} r={0.8} fill="#fff" stroke="rgba(0,0,0,.3)" strokeWidth={0.3}/>
        </g>
      ))}

      <CageNet x={53} y={0} w={24} h={14} height={12}/>

      {/* bullpen partition (low partial wall) */}
      <Wall x={53} y={14 - 0.3} w={19} h={0.3} height={4}/>

      <Wall x={72} y={20 - 0.4} w={5} h={0.4} height={9}/>
      <Wall x={72 - 0.4} y={20} w={0.4} h={5} height={9}/>

      <Shell />

      <g>
        <g transform={`translate(${iso(80, 12.5).x}, ${iso(80, 12.5).y + 12})`}>
          <text fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill={PAL.ink} fontWeight={600} textAnchor="middle" letterSpacing="0.1em">FRONT ENTRANCE</text>
          <text fontFamily="JetBrains Mono, monospace" fontSize="5.5" fill={PAL.inkSoft} y="8" textAnchor="middle">3 FT CONCRETE PAD</text>
        </g>
        <g transform={`translate(${iso(0, 12.5).x}, ${iso(0, 12.5).y - 18})`}>
          <text fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill={PAL.ink} fontWeight={600} textAnchor="middle" letterSpacing="0.1em">BACK ENTRANCE</text>
          <text fontFamily="JetBrains Mono, monospace" fontSize="5.5" fill={PAL.inkSoft} y="8" textAnchor="middle">3 FT CONCRETE PAD</text>
        </g>
      </g>

      <DimX x={40} y={-3} size={9} weight={500}>80 FT (LENGTH)</DimX>
      <DimY x={-3} y={12.5} size={9} weight={500}>25 FT (WIDTH)</DimY>
    </>
  );
}

// ── Frame: viewBox & background for an artboard ────────────
function FacilitySVG({ children, width = 900, height = 620 }) {
  // Compute approximate viewbox needed to fit a 80x25 building in iso.
  // Iso bounds:
  //   x range: from iso(0,25).x = -25*COS30*FT  to  iso(80,0).x = 80*COS30*FT
  //   y range: from iso(0,0).y = 0  to  iso(80,25).y = 105*SIN30*FT
  const minX = iso(0, 25).x - 35;
  const maxX = iso(80, 0).x + 35;
  const minY = iso(0, 0).y - 60;       // for top labels + back wall height
  const maxY = iso(80, 25).y + 50;     // for front labels
  const vbW = maxX - minX;
  const vbH = maxY - minY;
  return (
    <svg width={width} height={height} viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
      style={{ display: 'block', background: PAL.paper, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {children}
    </svg>
  );
}

// Title block lower-right
function TitleBlock({ name, subtitle, minX, minY, vbW, vbH }) {
  return null;
}

// Rectangular portable pitching mound — sloped platform.
// length = throwing direction (long axis), width = perpendicular, height at back.
// `face` = 'nx' (slopes down toward -x) or 'px' (slopes down toward +x). The rubber
// sits at the HIGH end (back of slope). The visible plate side is the low end.
function RectMound({ rubberX, cy, length = 9, width = 4, height = 10/12, face = 'nx' }) {
  // Compute mound rectangle bounds with rubber at back end
  const x0 = face === 'nx' ? rubberX - 0.5 : rubberX - length + 0.5;
  // ^ rubber sits ~6" from the back edge of the mound (high end)
  // For face='nx' (throws toward -x), high end is at +x, so rubber near high-x edge.
  // Recompute cleanly:
  let xb, xf; // back (high) and front (low/sloped) edges in world coords
  if (face === 'nx') {
    xb = rubberX + 0.5;
    xf = xb - length;
  } else {
    xb = rubberX - 0.5;
    xf = xb + length;
  }
  const xMin = Math.min(xb, xf), xMax = Math.max(xb, xf);
  const y0 = cy - width / 2, y1 = cy + width / 2;

  // Top surface: a 4-point polygon. Back edge at z=height, front edge at z=0.
  let topPts;
  if (face === 'nx') {
    topPts = [
      P(xb, y0, height), P(xb, y1, height),
      P(xf, y1, 0), P(xf, y0, 0),
    ];
  } else {
    topPts = [
      P(xb, y0, height), P(xb, y1, height),
      P(xf, y1, 0), P(xf, y0, 0),
    ];
  }
  // Side faces (the visible ones in iso): the +y side (front-right facing
  // viewer) and the +x side at the back.
  // +y side polygon (back-right of mound from viewer)
  const sideY1 = [
    P(xMin, y1, 0), P(xMax, y1, 0),
    face === 'nx' ? P(xMax, y1, height) : P(xMax, y1, 0),
    face === 'nx' ? P(xMin, y1, 0) : P(xMin, y1, height),
  ];
  // Build rectangular sides as straightforward extruded faces with sloped top.
  // Use the back face (high end) as a small rectangle of full height.
  // Front face (low end) is at floor level — invisible.
  // Two sloped side faces (+y and -y).
  const backFace = face === 'nx'
    ? [P(xb, y0, 0), P(xb, y1, 0), P(xb, y1, height), P(xb, y0, height)]
    : [P(xb, y0, 0), P(xb, y1, 0), P(xb, y1, height), P(xb, y0, height)];

  const sidePlusY = face === 'nx'
    ? [P(xb, y1, 0), P(xf, y1, 0), P(xf, y1, 0), P(xb, y1, height)]
    : [P(xb, y1, 0), P(xf, y1, 0), P(xf, y1, 0), P(xb, y1, height)];

  // Cleaner: compute the visible faces explicitly.
  // Visible faces in our iso view (camera looking from +x,+y direction down):
  //   - top (sloped)
  //   - +x face (the high or low end depending on which is +x)
  //   - +y face (always visible since +y points toward viewer-right)
  const xPlusEnd = xMax;        // the +x end
  const xPlusIsBack = xb === xMax;

  const topPolygon = [
    iso(xb, y0, xPlusIsBack ? height : 0),
    iso(xb, y1, xPlusIsBack ? height : 0),
    iso(xf, y1, xPlusIsBack ? 0 : height),
    iso(xf, y0, xPlusIsBack ? 0 : height),
  ].map(p => `${p.x},${p.y}`).join(' ');

  // +y face: a trapezoid with full height at back end, 0 at front end
  const yPlusPolygon = [
    iso(xb, y1, 0),
    iso(xf, y1, 0),
    iso(xf, y1, xPlusIsBack ? 0 : height),
    iso(xb, y1, xPlusIsBack ? height : 0),
  ].map(p => `${p.x},${p.y}`).join(' ');

  // +x face: a rectangle at xMax. Height depends on which side is the back.
  const xPlusH = xPlusIsBack ? height : 0;
  const xPlusPolygon = xPlusIsBack ? [
    iso(xPlusEnd, y0, 0),
    iso(xPlusEnd, y1, 0),
    iso(xPlusEnd, y1, xPlusH),
    iso(xPlusEnd, y0, xPlusH),
  ].map(p => `${p.x},${p.y}`).join(' ') : null;

  // Rubber: 24" x 6" white slab on back of mound surface, perpendicular to throwing direction.
  const rubW = 0.5, rubD = 2;
  const rubX0 = rubberX - rubW/2;
  const rubY0 = cy - rubD/2;
  const rubberPts = [
    iso(rubX0, rubY0, height + 0.02),
    iso(rubX0 + rubW, rubY0, height + 0.02),
    iso(rubX0 + rubW, rubY0 + rubD, height + 0.02),
    iso(rubX0, rubY0 + rubD, height + 0.02),
  ].map(p => `${p.x},${p.y}`).join(' ');

  return (
    <g>
      {/* black base side faces */}
      <polygon points={yPlusPolygon} fill="#1f1c1a" stroke="rgba(0,0,0,.5)" strokeWidth={0.5} strokeLinejoin="round"/>
      {xPlusPolygon && <polygon points={xPlusPolygon} fill="#252220" stroke="rgba(0,0,0,.5)" strokeWidth={0.5} strokeLinejoin="round"/>}
      {/* sloped clay-red top */}
      <polygon points={topPolygon} fill="#a8523c" stroke="rgba(0,0,0,.4)" strokeWidth={0.5} strokeLinejoin="round"/>
      {/* rubber */}
      <polygon points={rubberPts} fill="#fafaf5" stroke="rgba(0,0,0,.4)" strokeWidth={0.4}/>
    </g>
  );
}


// All footprints in feet, drawn as iso-extruded boxes or floor symbols.

// Wall-mounted mirror — 8ft long x 7ft tall, ~3" thick.
function Mirror({ x, y, length = 8, axis = 'x' }) {
  const t = 0.25;            // thickness
  const h = 7;                // height
  if (axis === 'x') {
    return (
      <g>
        <Box x={x} y={y} w={length} h={t} height={h} top="#cfd6dd" side1="#aab3bd" side2="#b8c1cb" stroke="rgba(0,0,0,.5)"/>
        {/* glass face hint */}
        {[0.25, 0.5, 0.75].map((f, i) => {
          const z1 = h * 0.15, z2 = h * 0.85;
          const a = iso(x + length * f, y + t/2, z1);
          const b = iso(x + length * f, y + t/2, z2);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(255,255,255,.5)" strokeWidth={0.3}/>;
        })}
      </g>
    );
  }
  return <Box x={x} y={y} w={t} h={length} height={h} top="#cfd6dd" side1="#aab3bd" side2="#b8c1cb" stroke="rgba(0,0,0,.5)"/>;
}

// Plyo throwing board — wall mounted, ~4ft x 4ft x 0.5ft thick.
function PlyoBoard({ x, y, w = 4, axis = 'x' }) {
  const t = 0.5, h = 4;
  if (axis === 'x') {
    return <Box x={x} y={y} w={w} h={t} height={h} top="#5a4a3a" side1="#3a2f24" side2="#4a3a2c" stroke="rgba(0,0,0,.5)"/>;
  }
  return <Box x={x} y={y} w={t} h={w} height={h} top="#5a4a3a" side1="#3a2f24" side2="#4a3a2c" stroke="rgba(0,0,0,.5)"/>;
}

// Strength training cage — power rack uprights pressed against a wall, with
// the lifting platform extending OUT into the room.
// (x, y) is the corner of the platform on the wall side.
// `wall` = 'ny' → wall is at low y (rack uprights at +y from wall), platform extends in +y.
function StrengthCage({ x, y, platformW = 6, platformD = 8, rackW = 4, rackD = 4, h = 7.5, wall = 'ny' }) {
  const t = 0.25;
  // Center the rack horizontally within the platform
  const rackX = x + (platformW - rackW) / 2;
  // Rack sits at the wall side (y === y) and extends rackD into the room.
  const rackY = y; // wall is at y, posts touch the wall
  const uprights = [
    [rackX, rackY],
    [rackX + rackW - t, rackY],
    [rackX, rackY + rackD - t],
    [rackX + rackW - t, rackY + rackD - t],
  ];
  return (
    <g>
      {/* lifting platform extends into room from wall */}
      <FloorRect x={x} y={y} w={platformW} h={platformD} fill="#3a2f24" stroke="rgba(0,0,0,.4)"/>
      <FloorRect x={x + 0.6} y={y + 0.6} w={platformW - 1.2} h={platformD - 1.2} fill="#5a4a3a" stroke="rgba(0,0,0,.3)"/>
      {/* uprights pressed to wall */}
      {uprights.map(([px, py], i) => (
        <Box key={i} x={px} y={py} w={t} h={t} height={h} top="#2a2724" side1="#1a1715" side2="#22201d"/>
      ))}
      {/* horizontal top crossbars of cage */}
      {[
        [iso(rackX, rackY, h), iso(rackX + rackW, rackY, h)],
        [iso(rackX + rackW, rackY, h), iso(rackX + rackW, rackY + rackD, h)],
        [iso(rackX + rackW, rackY + rackD, h), iso(rackX, rackY + rackD, h)],
        [iso(rackX, rackY + rackD, h), iso(rackX, rackY, h)],
      ].map((seg, i) => (
        <line key={i} x1={seg[0].x} y1={seg[0].y} x2={seg[1].x} y2={seg[1].y} stroke="#2a2724" strokeWidth={0.6}/>
      ))}
      {/* J-cup bar at chest height — spans across the rack between front uprights */}
      <Box x={rackX + rackW/2 - 3.5} y={rackY + rackD - 0.4} w={7} h={0.2} height={3.6} top="#3a3a3a" side1="#2a2a2a" side2="#333"/>
      {/* plates on bar ends */}
      {[rackX + rackW/2 - 3.5, rackX + rackW/2 + 3.3].map((px, i) => (
        <Box key={i} x={px - 0.1} y={rackY + rackD - 0.95} w={0.3} h={1.2} height={1.4} top="#2a2724" side1="#1a1715" side2="#22201d"/>
      ))}
    </g>
  );
}

// Youth mound stored UPRIGHT, leaned against a wall. (x, y) is the floor corner.
// `axis = 'x'` → long edge runs along x (3.5 ft); upright depth is on y (0.83 ft).
function UprightMound({ x, y, length = 6.33, width = 3.5, depth = 10/12, axis = 'x' }) {
  // The mound is stood on its long edge; the back/high (rectangular) face is
  // against the floor and one wall. From the viewer it reads as a tall, narrow
  // clay-red slab.
  if (axis === 'x') {
    return (
      <g>
        {/* dark base/strip on floor */}
        <Box x={x} y={y} w={width} h={depth} height={length}
             top="#a8523c" side1="#7a3d2c" side2="#8a4634" stroke="rgba(0,0,0,.5)"/>
        {/* dark band at the bottom (mimics the painted base of the real mound) */}
        <Box x={x} y={y} w={width} h={depth} height={0.6}
             top="#1f1c1a" side1="#1a1715" side2="#22201d" stroke="rgba(0,0,0,.5)"/>
        {/* small white rubber strip near the top */}
        {(() => {
          const a = iso(x + 0.4, y + depth/2, length - 0.8);
          const b = iso(x + width - 0.4, y + depth/2, length - 0.8);
          return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fafaf5" strokeWidth={1.2} strokeLinecap="round"/>;
        })()}
      </g>
    );
  }
  return (
    <g>
      <Box x={x} y={y} w={depth} h={width} height={length}
           top="#a8523c" side1="#7a3d2c" side2="#8a4634" stroke="rgba(0,0,0,.5)"/>
      <Box x={x} y={y} w={depth} h={width} height={0.6}
           top="#1f1c1a" side1="#1a1715" side2="#22201d" stroke="rgba(0,0,0,.5)"/>
    </g>
  );
}

// Med-ball throw section — small netted enclosure with med balls on floor.
function MedBallArea({ x, y, w = 12, d = 10, height = 10 }) {
  return (
    <g>
      {/* Distinct floor patch */}
      <FloorRect x={x} y={y} w={w} h={d} fill="#b8a890" stroke="rgba(0,0,0,.15)"/>
      {/* Three netted sides (open toward the lane / interior) — back, left, right */}
      <DashedLane x={x} y={y} w={w} h={d} height={height} showPoles={true}/>
      {/* Med balls */}
      {[[x+1.5, y+1.5], [x+2.5, y+2.0], [x+1.8, y+2.8], [x+w-2, y+1.5]].map(([bx, by], i) => {
        const c = iso(bx, by, 0.5);
        return <circle key={i} cx={c.x} cy={c.y} r={1.4} fill="#3a3530" stroke="rgba(0,0,0,.4)" strokeWidth={0.4}/>;
      })}
    </g>
  );
}

// Bench — 6ft long viewing bench
function ViewBench({ x, y, length = 6, axis = 'x' }) {
  const d = 1.4, h = 1.5;
  if (axis === 'x') {
    return (
      <g>
        <Box x={x} y={y} w={length} h={d} height={h} top="#7a6a55" side1="#5a4d3c" side2="#6a5a45"/>
        {/* backrest */}
        <Box x={x} y={y - 0.15} w={length} h={0.15} height={3} top="#7a6a55" side1="#5a4d3c" side2="#6a5a45"/>
      </g>
    );
  }
  return (
    <g>
      <Box x={x} y={y} w={d} h={length} height={h} top="#7a6a55" side1="#5a4d3c" side2="#6a5a45"/>
      <Box x={x - 0.15} y={y} w={0.15} h={length} height={3} top="#7a6a55" side1="#5a4d3c" side2="#6a5a45"/>
    </g>
  );
}

// Equipment label — small, low-key, parallel to building
function EqLabel({ x, y, children, size = 6.5, axis = 'x' }) {
  const T = axis === 'x' ? TextX : TextY;
  return <T x={x} y={y} size={size} weight={500} fill={PAL.ink} opacity={0.75}>{children}</T>;
}

// ============================================================
// LAYOUT 4 — Sketch-matched: single pitching lane along the LEFT side,
// open turf/training to the right of the lane and across the back.
// Lane is shown as dashed netting (per user's sketch).
// ============================================================
function Layout4() {
  // Building: x = 0..80 (length, x=0 = BACK, x=80 = FRONT).
  // y = 0..25 (width). When entering from front, "left" = high y, "right" = low y.
  // Pitching lane: 12 ft wide, 3 ft off the LEFT wall (y=25). So lane at y=10..22.
  // Lane shifted toward the BACK so the front of the building has more open
  // floor area than the back (per user direction).
  const LANE_X0 = 3, LANE_X1 = 67;
  const LANE_Y0 = 10, LANE_Y1 = 22;

  return (
    <>
      {/* Concrete pads */}
      <Zone x={0} y={0} w={3} h={25} fill={PAL.concrete} label="" />
      <Zone x={77} y={0} w={3} h={25} fill={PAL.concrete} label="" />
      {[1, 2, 78, 79].map(i => (
        <line key={`c${i}`}
          x1={iso(i, 0).x} y1={iso(i, 0).y}
          x2={iso(i, 25).x} y2={iso(i, 25).y}
          stroke={PAL.concreteDk} strokeWidth={0.3} opacity={0.5}/>
      ))}

      {/* Interior turf */}
      <Zone x={3} y={0} w={74} h={25} fill={PAL.turf} label="" />

      {/* Pitching lane floor (rubber) */}
      <FloorRect x={LANE_X0} y={LANE_Y0} w={LANE_X1 - LANE_X0} h={LANE_Y1 - LANE_Y0} fill={PAL.cageRubber}/>

      {/* Bathroom 5x5, front-right (low y, high x) when entering = front-right corner */}
      <Zone x={72} y={0} w={5} h={5} fill={PAL.bath} label="" />
      <ArchWall x={72} y={5 - 0.25} w={5} h={0.5} height={9}/>
      <ArchWall x={72 - 0.25} y={0} w={0.5} h={2.0} height={9}/>
      <ArchWall x={72 - 0.25} y={4.75} w={0.5} h={0.25} height={9}/>
      <Door cx={72} cy={3.4} axis="y" hinge="low" swing="out" width={2.5}/>

      {/* Pitching equipment in lane — ADULT mound only (in use).
          Plate at back of lane, mound near front. Rubber 60'6" from plate. */}
      <HomePlate cx={4} cy={16}/>
      <RectMound rubberX={64.5} cy={16} length={9} width={4} height={10/12} face="nx"/>
      <DashedLane x={LANE_X0} y={LANE_Y0} w={LANE_X1 - LANE_X0} h={LANE_Y1 - LANE_Y0} height={12}/>

      {/* Youth mound (6'4") — stored UPRIGHT in the back-right corner,
          leaned against the back wall (x=0). Pulled out for younger pitchers. */}
      <UprightMound x={0.5} y={0.5} length={6.33} width={3.5} depth={10/12} axis="x"/>
      <EqLabel x={4.5} y={4.6}>YOUTH MOUND (STORED UPRIGHT)</EqLabel>

      {/* ── Equipment along the right strip (y = 0..10), back to front ── */}

      {/* Viewing seating near back — away from front, near back bay for ventilation */}
      <ViewBench x={5} y={6.5} length={6} axis="x"/>
      <ViewBench x={5} y={8.2} length={6} axis="x"/>
      <EqLabel x={7} y={9.7}>VIEWING SEATING</EqLabel>

      {/* Strength training — power rack pressed to right wall (y=0),
          lifting platform extends out into the room. */}
      <StrengthCage x={14} y={0} platformW={6} platformD={8} rackW={4} rackD={4} h={7.5} wall="ny"/>
      <EqLabel x={15} y={9}>STRENGTH RACK</EqLabel>

      {/* Med-ball throw section — netted, with a plyo throwing board on the
          back wall the user throws the ball INTO. */}
      <MedBallArea x={22} y={0} w={12} d={9} height={10}/>
      {/* Plyo throw board mounted on the right wall (y=0) inside the med-ball area */}
      <PlyoBoard x={26} y={0} w={4} axis="x"/>
      <EqLabel x={26} y={1.5}>PLYO TARGET</EqLabel>
      <EqLabel x={30} y={9.7}>MED BALL THROW</EqLabel>

      {/* Mirror — wall-mounted on the right wall (y=0), 8 ft long */}
      <Mirror x={40} y={0} length={8} axis="x"/>
      <EqLabel x={43} y={1.4}>MIRROR (8 FT)</EqLabel>

      {/* Pitcher warmup / coaching space (open) between mirror and bathroom */}
      <EqLabel x={56} y={5}>WARMUP / COACHING</EqLabel>

      {/* ── Doors and trusses ── */}

      {/* Back bay door (overhead) — for ventilation; offset toward "right" (low y)
          so it's away from the lane on the left side */}
      <GarageDoor cx={0} cy={9} width={10} axis="y"/>

      {/* Front entry — personnel door offset toward LEFT (high y), per user spec.
          Mounted in front wall (x=80) at cy=20 so it's closer to left wall (y=25). */}
      <Door cx={80} cy={20} axis="y" hinge="high" swing="in" width={3}/>

      {/* Trusses overhead (unfinished ceiling) */}
      <Truss x={20} y0={0} y1={25} z={12}/>
      <Truss x={40} y0={0} y1={25} z={12}/>
      <Truss x={60} y0={0} y1={25} z={12}/>

      <Shell />
    </>
  );
}

// ============================================================
// LAYOUT 5 — Same equipment, MOUND AT BACK (plate near front)
// ============================================================
function Layout5() {
  // Lane shifted toward the BACK; more open floor at the FRONT.
  const LANE_X0 = 3, LANE_X1 = 67;
  const LANE_Y0 = 10, LANE_Y1 = 22;

  return (
    <>
      <Zone x={0} y={0} w={3} h={25} fill={PAL.concrete} label="" />
      <Zone x={77} y={0} w={3} h={25} fill={PAL.concrete} label="" />
      {[1, 2, 78, 79].map(i => (
        <line key={`c${i}`}
          x1={iso(i, 0).x} y1={iso(i, 0).y}
          x2={iso(i, 25).x} y2={iso(i, 25).y}
          stroke={PAL.concreteDk} strokeWidth={0.3} opacity={0.5}/>
      ))}

      <Zone x={3} y={0} w={74} h={25} fill={PAL.turf} label="" />
      <FloorRect x={LANE_X0} y={LANE_Y0} w={LANE_X1 - LANE_X0} h={LANE_Y1 - LANE_Y0} fill={PAL.cageRubber}/>

      {/* Bathroom — front-right corner */}
      <Zone x={72} y={0} w={5} h={5} fill={PAL.bath} label="" />
      <ArchWall x={72} y={5 - 0.25} w={5} h={0.5} height={9}/>
      <ArchWall x={72 - 0.25} y={0} w={0.5} h={2.0} height={9}/>
      <ArchWall x={72 - 0.25} y={4.75} w={0.5} h={0.25} height={9}/>
      <Door cx={72} cy={3.4} axis="y" hinge="low" swing="out" width={2.5}/>

      {/* Adult mound (9 ft) at back wall, plate 60'6" away. */}
      <HomePlate cx={65} cy={16}/>
      <RectMound rubberX={4.5} cy={16} length={9} width={4} height={10/12} face="px"/>
      <DashedLane x={LANE_X0} y={LANE_Y0} w={LANE_X1 - LANE_X0} h={LANE_Y1 - LANE_Y0} height={12}/>

      {/* Youth mound (6'4") — stored UPRIGHT in back-right corner of equipment strip */}
      <UprightMound x={20} y={0.5} length={6.33} width={3.5} depth={10/12} axis="x"/>
      <EqLabel x={20.5} y={4.6}>YOUTH MOUND (STORED UPRIGHT)</EqLabel>

      {/* Equipment — moved to FRONT half so it's away from the mound */}
      {/* Viewing seating — toward the front, away from the back-mound throwing zone */}
      <ViewBench x={60} y={6.5} length={6} axis="x"/>
      <ViewBench x={60} y={8.2} length={6} axis="x"/>
      <EqLabel x={62} y={9.7}>VIEWING SEATING</EqLabel>

      {/* Strength rack pressed to right wall, platform extends in */}
      <StrengthCage x={28} y={0} platformW={6} platformD={8} rackW={4} rackD={4} h={7.5} wall="ny"/>
      <EqLabel x={29} y={9}>STRENGTH RACK</EqLabel>

      {/* Med-ball throw section with plyo target on back wall */}
      <MedBallArea x={38} y={0} w={12} d={9} height={10}/>
      <PlyoBoard x={42} y={0} w={4} axis="x"/>
      <EqLabel x={42} y={1.5}>PLYO TARGET</EqLabel>
      <EqLabel x={45} y={9.7}>MED BALL THROW</EqLabel>

      {/* Mirror — wall-mounted on the BACK wall (x=0), facing the mound —
          ideal for self-reflection during the pitcher's setup. */}
      <Mirror x={0} y={11} length={8} axis="y"/>
      <EqLabel x={1.5} y={15} axis="y">MIRROR (8 FT)</EqLabel>

      {/* Doors */}
      <GarageDoor cx={0} cy={9} width={10} axis="y"/>
      <Door cx={80} cy={20} axis="y" hinge="high" swing="in" width={3}/>

      <Truss x={20} y0={0} y1={25} z={12}/>
      <Truss x={40} y0={0} y1={25} z={12}/>
      <Truss x={60} y0={0} y1={25} z={12}/>

      <Shell />
    </>
  );
}

Object.assign(window, { Layout1, Layout2, Layout3, Layout4, Layout5, FacilitySVG, PAL, iso, FT });
