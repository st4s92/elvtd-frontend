import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Matter from "matter-js";

export default function PhysicsCard({ data }: { data: any }) {
    const sceneRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef(Matter.Engine.create());

    useEffect(() => {
        if (!sceneRef.current) return;

        const engine = engineRef.current;

        // Create renderer
        const render = Matter.Render.create({
            element: sceneRef.current,
            engine: engine,
            options: {
                width: 250,
                height: 180,
                wireframes: false,
                background: "transparent",
                pixelRatio: window.devicePixelRatio,
            },
        });

        // Boundaries
        const ground = Matter.Bodies.rectangle(125, 185, 250, 10, {
            isStatic: true,
            render: { fillStyle: "transparent" },
        });
        const leftWall = Matter.Bodies.rectangle(-5, 90, 10, 180, {
            isStatic: true,
            render: { fillStyle: "transparent" },
        });
        const rightWall = Matter.Bodies.rectangle(255, 90, 10, 180, {
            isStatic: true,
            render: { fillStyle: "transparent" },
        });

        // Create falling letters/shapes using colors
        const letters = [];
        const colors = ["#ffaa00", "#caced4", "#e2e8f0"];
        for (let i = 0; i < 15; i++) {
            const body = Matter.Bodies.rectangle(
                Math.random() * 200 + 25,
                Math.random() * -200,
                20, 20,
                {
                    restitution: 0.8,
                    render: {
                        fillStyle: colors[i % colors.length],
                        strokeStyle: "#1a1c29",
                        lineWidth: 1
                    }
                }
            );
            letters.push(body);
        }

        // Add everything to the world
        Matter.World.add(engine.world, [ground, leftWall, rightWall, ...letters]);

        // Run the engine & renderer
        Matter.Runner.run(Matter.Runner.create(), engine);
        Matter.Render.run(render);

        // Mouse control
        const mouse = Matter.Mouse.create(render.canvas);
        const mouseConstraint = Matter.MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: { visible: false },
            },
        });
        Matter.World.add(engine.world, mouseConstraint);
        render.mouse = mouse;

        return () => {
            Matter.Render.stop(render);
            Matter.World.clear(engine.world, false);
            Matter.Engine.clear(engine);
            render.canvas.remove();
            render.textures = {};
        };
    }, []);

    return (
        <motion.div
            drag
            dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
            dragElastic={0.4}
            whileHover={{ y: -15, scale: 1.05, filter: "brightness(1.3)" }}
            whileTap={{ scale: 0.95 }}
            style={{
                boxShadow: `
          inset 0 0 0 1px rgba(255,255,255,0.05),
          0 0 30px ${data.color}20
        `,
            }}
            className="relative w-80 h-[450px] bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-1 flex flex-col flex-shrink-0 group overflow-visible cursor-grab active:cursor-grabbing"
        >
            <div className="flex-1 rounded-2xl bg-[#0a0c1a]/50 p-6 flex flex-col relative z-10 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] overflow-hidden">

                {/* Header / Avatar */}
                <div className="flex items-center gap-4 mb-4 relative z-10">
                    <div className="w-16 h-16 rounded-full overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.8)] relative">
                        <img src={data.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 shadow-[inset_0_4px_6px_rgba(255,255,255,0.2)] rounded-full" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold tracking-widest text-[#e2e8f0]" style={{ textShadow: `0 0 10px ${data.color}80` }}>
                            {data.title}
                        </h3>
                        <p className="text-xs text-[#64748b] tracking-wider uppercase mt-1">
                            Drag shapes below
                        </p>
                    </div>
                </div>

                {/* Physics Canvas Container */}
                <div
                    ref={sceneRef}
                    className="flex-1 w-full bg-[#050608] rounded-md overflow-hidden shadow-[inset_0_0_10px_rgba(0,0,0,1)] relative z-20 cursor-crosshair"
                />

                {/* Bottom Decorative Element */}
                <div className="h-12 mt-4 pt-2 flex items-center justify-between px-2 opacity-50 relative z-10">
                    <div className="flex gap-1">
                        {[1, 2].map((_, i) => (
                            <div key={i} className="w-2 h-2 rounded-full bg-[#334155] shadow-[inset_0_1px_1px_rgba(0,0,0,1)]" />
                        ))}
                    </div>
                    <span className="text-[10px] text-[#ffaa00] font-bold animate-pulse">PHYS_ACTIVE</span>
                </div>
            </div>

            {/* Hover Background Glow */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                style={{
                    background: `radial-gradient(circle at 50% 100%, ${data.color}60, transparent 70%), radial-gradient(circle at 50% 0%, ${data.color}20, transparent 50%)`
                }}
            />
        </motion.div>
    );
}
