import WebGLBackground from "./WebGLBackground";
import RetroCard from "./RetroCard";
import PhysicsCard from "./PhysicsCard";
import { motion } from "framer-motion";

const CARDS_DATA = [
    {
        id: 1,
        title: "QUANTUM COMPUTE",
        subtitle: "Sys.Override: Enabled",
        color: "#ff0055",
        features: ["Hyper-threading", "Neural Link", "Sub-space cooling"],
        avatar: "https://i.pravatar.cc/150?img=11",
    },
    {
        id: 2,
        title: "NEURAL SYNC",
        subtitle: "Latency: < 0.01ms",
        color: "#00d2ff",
        features: ["Direct Interface", "Memory Expansion", "Cognitive Boost"],
        avatar: "https://i.pravatar.cc/150?img=33",
    },
    {
        id: 3,
        title: "GRAVITY WELL",
        subtitle: "Physics: Unstable",
        color: "#ffaa00",
        features: ["Mass Manipulation", "Time Dilation", "Event Horizon"],
        avatar: "https://i.pravatar.cc/150?img=60",
        isPhysics: true, // Special card
    },
    {
        id: 4,
        title: "VOID PROTOCOL",
        subtitle: "Encryption: Maximum",
        color: "#9900ff",
        features: ["Quantum Keys", "Dark Matter Shield", "Trace Eradication"],
        avatar: "https://i.pravatar.cc/150?img=68",
    },
];

export default function RetroFeatureCards() {
    // Duplicate cards for infinite marquee effect
    const marqueeCards = [...CARDS_DATA, ...CARDS_DATA, ...CARDS_DATA];

    return (
        <div className="relative w-full h-[600px] rounded-3xl bg-[#050510] overflow-hidden flex items-center justify-center font-mono shadow-[inset_0_0_50px_rgba(0,0,0,0.9)] border border-[#1a1c29]">
            {/* 3D WebGL Background (Stars & Noise) */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <WebGLBackground />
            </div>

            {/* Subtle Radial Glow in background */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_rgba(0,210,255,0.05)_0%,_rgba(5,5,16,1)_70%)] pointer-events-none" />

            {/* Infinite Marquee Container */}
            <div className="relative z-10 w-full pt-16 pb-24 cursor-grab active:cursor-grabbing overflow-visible">
                <motion.div
                    className="flex gap-12 w-max px-12"
                    animate={{
                        x: ["0%", "-33.33%"],
                    }}
                    transition={{
                        ease: "linear",
                        duration: 30, // Adjust speed (higher = slower)
                        repeat: Infinity,
                    }}
                >
                    {marqueeCards.map((card, index) => (
                        <div key={`${card.id}-${index}`} className="flex-shrink-0">
                            {card.isPhysics ? (
                                <PhysicsCard data={card} />
                            ) : (
                                <RetroCard data={card} />
                            )}
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* CRT Scanlines Overlay */}
            <div className="absolute inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-40 mix-blend-overlay" />
        </div>
    );
}
