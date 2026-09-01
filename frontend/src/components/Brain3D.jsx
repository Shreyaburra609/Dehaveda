import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RotateCcw, ZoomIn, ZoomOut, Move3d } from "lucide-react";

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
  } catch {
    return false;
  }
}

function Marker({ region, active, onSelect }) {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const pulse = active ? 1 + Math.sin(state.clock.elapsedTime * 3) * 0.12 : 1;
    ref.current.scale.setScalar(pulse);
  });
  return (
    <mesh
      ref={ref}
      position={region.position}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(region);
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <sphereGeometry args={[active ? 0.14 : 0.11, 24, 24]} />
      <meshStandardMaterial
        color={region.color}
        emissive={region.color}
        emissiveIntensity={active ? 1.4 : 0.6}
        roughness={0.25}
      />
    </mesh>
  );
}

function BrainMesh({ regions, activeKey, onSelect, rotation, zoom }) {
  const group = useRef();
  useFrame(() => {
    if (!group.current) return;
    group.current.rotation.y += (rotation.current.y - group.current.rotation.y) * 0.15;
    group.current.rotation.x += (rotation.current.x - group.current.rotation.x) * 0.15;
    const s = zoom.current;
    group.current.scale.x += (s - group.current.scale.x) * 0.15;
    group.current.scale.y += (s - group.current.scale.y) * 0.15;
    group.current.scale.z += (s - group.current.scale.z) * 0.15;
  });

  const lobes = useMemo(
    () => [
      { pos: [0.52, 0.18, 0.12], scale: [1, 0.9, 1.12], r: 0.86 },
      { pos: [-0.52, 0.18, 0.12], scale: [1, 0.9, 1.12], r: 0.86 },
      { pos: [0.32, 0.42, -0.62], scale: [1, 0.85, 0.95], r: 0.62 },
      { pos: [-0.32, 0.42, -0.62], scale: [1, 0.85, 0.95], r: 0.62 },
    ],
    [],
  );

  return (
    <group ref={group}>
      {lobes.map((l, i) => (
        <mesh key={i} position={l.pos} scale={l.scale}>
          <sphereGeometry args={[l.r, 48, 48]} />
          <meshStandardMaterial color="#c98a92" roughness={0.75} metalness={0.05} flatShading />
        </mesh>
      ))}
      <mesh position={[0, -0.78, -0.85]} scale={[1.25, 0.7, 0.85]}>
        <sphereGeometry args={[0.52, 40, 40]} />
        <meshStandardMaterial color="#a86b74" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, -1.05, -0.1]} rotation={[0.35, 0, 0]}>
        <capsuleGeometry args={[0.2, 0.6, 12, 24]} />
        <meshStandardMaterial color="#d9b9a3" roughness={0.7} />
      </mesh>
      <mesh scale={[1.06, 1.06, 1.06]}>
        <sphereGeometry args={[1.42, 24, 18]} />
        <meshBasicMaterial color="#10b981" wireframe transparent opacity={0.09} />
      </mesh>
      {regions.map((r) => (
        <Marker key={r.key} region={r} active={activeKey === r.key} onSelect={onSelect} />
      ))}
    </group>
  );
}

export function Brain3D({ regions, active, onSelect }) {
  const rotation = useRef({ x: 0, y: 0 });
  const zoom = useRef(1);
  const drag = useRef(null);
  const [supported] = useState(hasWebGL);
  const [, force] = useState(0);

  const setZoom = (v) => {
    zoom.current = Math.min(2.2, Math.max(0.6, v));
    force((n) => n + 1);
  };

  if (!supported) {
    return (
      <div
        data-testid="brain-3d-fallback"
        className="dv-surface flex h-[380px] flex-col items-center justify-center rounded-3xl p-8 text-center"
      >
        <Move3d className="mb-3 h-7 w-7 text-slate-500" />
        <p className="text-sm text-slate-400">
          Your device or browser does not support WebGL, so the 3D brain model cannot be displayed. All region
          information is still available in the list below.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        data-testid="brain-3d-canvas"
        className="h-[380px] touch-none overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-[#0d1424] to-[#070a12] sm:h-[520px]"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, rx: rotation.current.x, ry: rotation.current.y };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          rotation.current = {
            y: drag.current.ry + (e.clientX - drag.current.x) * 0.008,
            x: Math.max(-1.2, Math.min(1.2, drag.current.rx + (e.clientY - drag.current.y) * 0.008)),
          };
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerLeave={() => {
          drag.current = null;
        }}
        onWheel={(e) => {
          e.preventDefault();
          setZoom(zoom.current - e.deltaY * 0.0012);
        }}
      >
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 1.8]}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.65} />
            <directionalLight position={[4, 5, 6]} intensity={1.15} />
            <directionalLight position={[-5, -2, -4]} intensity={0.4} color="#38bdf8" />
            <BrainMesh regions={regions} activeKey={active?.key} onSelect={onSelect} rotation={rotation} zoom={zoom} />
          </Suspense>
        </Canvas>
      </div>

      <div className="absolute right-4 top-4 flex flex-col gap-2">
        <button
          data-testid="brain-zoom-in"
          aria-label="Zoom in"
          onClick={() => setZoom(zoom.current + 0.2)}
          className="rounded-full border border-slate-700 bg-slate-900/85 p-2.5 text-slate-300 hover:text-emerald-300"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          data-testid="brain-zoom-out"
          aria-label="Zoom out"
          onClick={() => setZoom(zoom.current - 0.2)}
          className="rounded-full border border-slate-700 bg-slate-900/85 p-2.5 text-slate-300 hover:text-emerald-300"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          data-testid="brain-reset-view"
          aria-label="Reset view"
          onClick={() => {
            rotation.current = { x: 0, y: 0 };
            setZoom(1);
          }}
          className="rounded-full border border-slate-700 bg-slate-900/85 p-2.5 text-slate-300 hover:text-emerald-300"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <p className="font-data absolute bottom-4 left-5 text-[10px] uppercase tracking-[0.2em] text-slate-500">
        Drag to rotate · scroll or buttons to zoom · tap a marker
      </p>
    </div>
  );
}
