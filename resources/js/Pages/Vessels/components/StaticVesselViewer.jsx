import { useMemo, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
    Environment, 
    useGLTF, 
    BakeShadows
} from '@react-three/drei';
import * as THREE from 'three';

function SeaShipMesh({ modelPath }) {
    const { scene } = useGLTF(modelPath);
    const shipRef = useRef();

    // Processamento do modelo (mesma lógica anterior)
    const clonedScene = useMemo(() => {
        const clone = scene.clone();
        clone.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                if (node.material) node.material.side = THREE.DoubleSide;
                
                if (!node.userData.hasEdges) {
                    const edgesGeometry = new THREE.EdgesGeometry(node.geometry, 15);
                    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
                    const edgesLines = new THREE.LineSegments(edgesGeometry, edgesMaterial);
                    node.add(edgesLines);
                    node.userData.hasEdges = true;
                }
            }
        });
        return clone;
    }, [scene]);

    // LÓGICA DO MOVIMENTO DO MAR
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        
        // 1. Heave (Subir e descer levemente)
        shipRef.current.position.y = -1.2 + Math.sin(t * 0.7) * 0.05;

        // 2. Pitch (Balanço frente/trás - Eixo X)
        shipRef.current.rotation.x = Math.sin(t * 0.5) * 0.02;

        // 3. Roll (Balanço lateral - Eixo Z)
        shipRef.current.rotation.z = Math.cos(t * 0.8) * 0.02;
    });

    return (
        <primitive 
            ref={shipRef}
            object={clonedScene}  
            scale={0.25} 
            // Posição inicial (o Y será animado)
            position={[-0.9, -1.2, -5.0]} 
            // Rotação inicial (o X e Z serão animados)
            rotation={[0, Math.PI, 0]}
        />
    );
}

export default function StaticVesselViewer({ modelPath, name }) {
    let cameraPosition = [2.32, 0.3, 3.52];
    let cameraRotation = [0, THREE.MathUtils.degToRad(45), 0];

    if (name && name.toLowerCase() === 'lancha larus') {
        cameraPosition = [-1.2, -1.0, -5.2]; 
        cameraRotation = [0, THREE.MathUtils.degToRad(235), 0];
    }

    if (name && name.toLowerCase() === 'atlântico sul') {
        cameraPosition = [-1.2, -1.0, -5.2]; 
        cameraRotation = [0, THREE.MathUtils.degToRad(235), 0];
    }

    return (
        <div className="relative w-full h-full bg-slate-900">
            <Canvas 
                shadows
                camera={{ 
                    fov: 45, 
                    position: cameraPosition, 
                    rotation: cameraRotation
                }}
            >
                <ambientLight intensity={0.5} />
                <directionalLight 
                    position={[10, 10, 5]} 
                    intensity={1.5} 
                    castShadow 
                />
                
                <Suspense fallback={null}>
                    <SeaShipMesh modelPath={modelPath} />
                    <Environment preset="city" />
                </Suspense>

                <BakeShadows />
            </Canvas>
        </div>
    );
}