import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, PerspectiveCamera, Text } from '@react-three/drei';
import * as THREE from 'three';
import { PlayerColor } from '../types';

interface PhaseTorus3DProps {
  p1Progress: number;
  p2Progress: number;
  history: { x: number; y: number }[];
  isIntegerPhase: boolean; // 接收高亮状态
}

// 环面几何参数
const TORUS_R = 2.5; // 大半径 (Player 1)
const TORUS_r = 0.8; // 小半径 (Player 2)

// 坐标映射函数
// 配合 group rotation={[-Math.PI / 2, 0, 0]} 使用
const getTorusPosition = (u: number, v: number): [number, number, number] => {
  const phi = u * Math.PI * 2;   // 大圆角度
  const theta = v * Math.PI * 2; // 小圆角度

  const dist = TORUS_R + TORUS_r * Math.cos(theta);

  // 映射到 XZ 平面为主体的 3D 空间
  // 注意 z 的负号，用于抵消旋转带来的坐标系变换，确保点贴合表面
  const x = dist * Math.cos(phi);
  const y = TORUS_r * Math.sin(theta);
  const z = -dist * Math.sin(phi);

  return [x, y, z];
};

const Scene: React.FC<PhaseTorus3DProps> = ({ p1Progress, p2Progress, history, isIntegerPhase }) => {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const gridMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  // 1. 计算当前动点位置
  const currentPos = useMemo(() => 
    new THREE.Vector3(...getTorusPosition(p1Progress, p2Progress)), 
  [p1Progress, p2Progress]);

  // 2. 计算轨迹线顶点
  const points = useMemo(() => {
    return history.map(p => new THREE.Vector3(...getTorusPosition(p.x, p.y)));
  }, [history]);

  // 3. 材质动画帧循环
  useFrame((state, delta) => {
    if (materialRef.current) {
      // 颜色过渡：普通状态(灰白) -> 高亮状态(淡翡翠绿)
      const targetColor = isIntegerPhase ? new THREE.Color("#ecfdf5") : new THREE.Color("#f8fafc");
      // 自发光过渡：普通状态(无) -> 高亮状态(强绿光)
      const targetEmissive = isIntegerPhase ? new THREE.Color("#10b981") : new THREE.Color("#000000");
      // 透明度微调
      const targetOpacity = isIntegerPhase ? 0.95 : 0.85;

      const speed = 4.0; // 过渡速度
      materialRef.current.color.lerp(targetColor, speed * delta);
      materialRef.current.emissive.lerp(targetEmissive, speed * delta);
      materialRef.current.opacity += (targetOpacity - materialRef.current.opacity) * speed * delta;
    }

    // 线框颜色同步过渡
    if (gridMaterialRef.current) {
        const targetColor = isIntegerPhase ? new THREE.Color("#34d399") : new THREE.Color("#94a3b8");
        gridMaterialRef.current.color.lerp(targetColor, 4.0 * delta);
    }
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      
      {/* 动态环境光：仅在高亮时开启，照亮环面内壁 */}
      <pointLight 
        position={[0, 0, 0]} 
        intensity={isIntegerPhase ? 2 : 0} 
        color="#10b981" 
        distance={5} 
        decay={2} 
      />
      
      {/* 核心环面组：旋转 -90 度以水平放置 */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {/* 实体层 */}
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

        {/* 线框层 */}
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

      {/* 当前相位点 */}
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

      {/* 历史轨迹线 */}
      {points.length > 1 && (
        <Line
          points={points}
          color="#334155"
          opacity={0.8}
          transparent
          lineWidth={2.5} 
        />
      )}
      
      {/* 3D 文字标签 */}
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
        maxPolarAngle={Math.PI / 1.5} // 限制视角防止穿帮
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