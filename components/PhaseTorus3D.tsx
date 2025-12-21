import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, PerspectiveCamera, Text } from '@react-three/drei';
import * as THREE from 'three';
import { PlayerColor } from '../types';

interface PhaseTorus3DProps {
  p1Progress: number;
  p2Progress: number;
  history: { x: number; y: number }[];
  isIntegerPhase: boolean;
}

// Parameters for the torus
const TORUS_R = 2.5; // Major radius (Player 1)
const TORUS_r = 0.8; // Minor radius (Player 2)

// Coordinate mapping function
// Used with group rotation={[-Math.PI / 2, 0, 0]}
const getTorusPosition = (u: number, v: number): [number, number, number] => {
  const phi = u * Math.PI * 2;   // 大圆角度
  const theta = v * Math.PI * 2; // 小圆角度

  const dist = TORUS_R + TORUS_r * Math.cos(theta);

  // Mapped to 3D space with XZ plane as main
  // Note the negative sign on z to counteract coordinate system changes due to rotation, ensuring points stick to the surface
  const x = dist * Math.cos(phi);
  const y = TORUS_r * Math.sin(theta);
  const z = -dist * Math.sin(phi);

  return [x, y, z];
};

const Scene: React.FC<PhaseTorus3DProps> = ({ p1Progress, p2Progress, history, isIntegerPhase }) => {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const gridMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  // 1. Calculate current moving point position
  const currentPos = useMemo(() => 
    new THREE.Vector3(...getTorusPosition(p1Progress, p2Progress)), 
  [p1Progress, p2Progress]);

  // 2. Calculate trajectory line vertices
  const points = useMemo(() => {
    return history.map(p => new THREE.Vector3(...getTorusPosition(p.x, p.y)));
  }, [history]);

  // 3. Material animation frame loop
  useFrame((state, delta) => {
    if (materialRef.current) {
      // Color transition: normal state (gray-white) -> highlight state (light emerald green)
      const targetColor = isIntegerPhase ? new THREE.Color("#ecfdf5") : new THREE.Color("#f8fafc");
      // Emissive transition: normal state (none) -> highlight state (strong green)
      const targetEmissive = isIntegerPhase ? new THREE.Color("#10b981") : new THREE.Color("#000000");
      // Opacity adjustment
      const targetOpacity = isIntegerPhase ? 0.95 : 0.85;

      const speed = 4.0; // Transition speed
      materialRef.current.color.lerp(targetColor, speed * delta);
      materialRef.current.emissive.lerp(targetEmissive, speed * delta);
      materialRef.current.opacity += (targetOpacity - materialRef.current.opacity) * speed * delta;
    }

    // Wireframe color transition
    if (gridMaterialRef.current) {
        const targetColor = isIntegerPhase ? new THREE.Color("#34d399") : new THREE.Color("#94a3b8");
        gridMaterialRef.current.color.lerp(targetColor, 4.0 * delta);
    }
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      
      {/* Dynamic ambient light: only on during highlight */}
      <pointLight 
        position={[0, 0, 0]} 
        intensity={isIntegerPhase ? 2 : 0} 
        color="#10b981" 
        distance={5} 
        decay={2} 
      />
      
      {/* Core torus group: rotated -90 degrees for horizontal placement */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {/* Solid layer */}
        <mesh>
          <torusGeometry args={[TORUS_R, TORUS_r, 64, 64]} />
          <meshStandardMaterial 
            ref={materialRef}
            transparent 
            roughness={0.2}
            metalness={0.1}
            emissiveIntensity={0.5}
          />
        </mesh>

        {/* Wireframe layer */}
        <mesh>
          <torusGeometry args={[TORUS_R, TORUS_r + 0.01, 32, 32]} />
          <meshBasicMaterial 
            ref={gridMaterialRef}
            wireframe 
            opacity={0.15} 
            transparent 
          />
        </mesh>
      </group>

      {/* Current phase point */}
      <mesh position={currentPos}>
        <sphereGeometry args={[isIntegerPhase ? 0.2 : 0.12, 32, 32]} />
        <meshBasicMaterial color={isIntegerPhase ? "#34d399" : PlayerColor.Fusion} toneMapped={false} />
        <pointLight 
            color={isIntegerPhase ? "#10b981" : PlayerColor.Fusion} 
            distance={3} 
            intensity={isIntegerPhase ? 8 : 5} 
            decay={2} 
        />
      </mesh>

      {/* Historical trajectory line */}
      {points.length > 1 && (
        <Line
          points={points}
          color="#334155"
          opacity={0.8}
          transparent
          lineWidth={2.5} 
        />
      )}
      
      {/* 3D text label */}
      <group position={[0, -1.5, 0]}>
         <Text position={[0, 0, TORUS_R + 1.8]} fontSize={0.25} color="#94a3b8" rotation={[-Math.PI/2, 0, 0]}>
            Player 1 Cycle (Major Axis)
         </Text>
      </group>

      <OrbitControls 
        enableZoom={true} 
        enablePan={false} 
        minDistance={5} 
        maxDistance={20}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 1.5} // Limit view angle to prevent clipping
      />
    </>
  );
};

export const PhaseTorus3D: React.FC<PhaseTorus3DProps> = (props) => {
  return (
    <div className="w-full h-[500px] cursor-move rounded-2xl overflow-hidden bg-gradient-to-b from-stone-50 to-white border border-stone-200 shadow-inner relative">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 6, 9]} fov={45} />
        <Scene {...props} />
      </Canvas>
      
      <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none opacity-60">
        <span className="text-[10px] uppercase tracking-widest text-stone-500 bg-white/50 px-3 py-1 rounded-full backdrop-blur-sm">
          Drag to Rotate View
        </span>
      </div>
    </div>
  );
};