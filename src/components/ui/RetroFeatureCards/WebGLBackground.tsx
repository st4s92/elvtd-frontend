import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Stars() {
    const ref = useRef<THREE.Points>(null);

    // Generate random star positions inside a sphere
    const [positions, scales] = useMemo(() => {
        const count = 3000;
        const pos = new Float32Array(count * 3);
        const sc = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            const r = 400 * Math.cbrt(Math.random());
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos(2 * Math.random() - 1);

            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = r * Math.cos(phi);

            sc[i] = Math.random() * 1.5;
        }
        return [pos, sc];
    }, []);

    useFrame((state) => {
        if (ref.current) {
            ref.current.rotation.y = state.clock.elapsedTime * 0.05;
            ref.current.rotation.x = state.clock.elapsedTime * 0.02;
        }
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                    count={positions.length / 3}
                    array={positions}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-scale"
                    args={[scales, 1]}
                    count={scales.length}
                    array={scales}
                    itemSize={1}
                />
            </bufferGeometry>
            <pointsMaterial
                size={1.5}
                sizeAttenuation={true}
                color="#88ccff"
                transparent
                opacity={0.6}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}

// Custom shader material for animated noise
const NoiseMaterial = {
    uniforms: {
        time: { value: 0 },
    },
    vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    fragmentShader: `
    uniform float time;
    varying vec2 vUv;

    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
      // Create animated grain/noise
      vec2 st = vUv * 800.0;
      float noise = random(st + time);
      
      // Dynamic dark blueish tinted noise
      vec3 color = vec3(0.01, 0.02, 0.05) + (noise * 0.03); 
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

function AnimatedNoise() {
    const materialRef = useRef<THREE.ShaderMaterial>(null);

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.time.value = state.clock.elapsedTime;
        }
    });

    return (
        <mesh position={[0, 0, -500]}>
            <planeGeometry args={[2000, 2000]} />
            <shaderMaterial
                ref={materialRef}
                args={[NoiseMaterial]}
                depthWrite={false}
            />
        </mesh>
    );
}

export default function WebGLBackground() {
    return (
        <div className="w-full h-full absolute inset-0">
            <Canvas camera={{ position: [0, 0, 100], fov: 75 }}>
                <AnimatedNoise />
                <Stars />
                <ambientLight intensity={0.5} />
            </Canvas>
        </div>
    );
}
