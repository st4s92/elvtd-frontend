import { motion } from "framer-motion";

export default function RetroCard({ data }: { data: any }) {
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
            className="relative w-80 h-[450px] bg-[rgba(233,223,255,0.04)] backdrop-blur-md rounded-3xl p-1 flex flex-col flex-shrink-0 group overflow-visible"
        >
            {/* Frosted Glass Inner Container */}
            <div className="flex-1 rounded-2xl bg-[#0a0c1a]/50 p-6 flex flex-col relative z-10 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] overflow-hidden">

                {/* Header / Avatar */}
                <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="w-16 h-16 rounded-full overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.8)] relative">
                        <img src={data.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 shadow-[inset_0_4px_6px_rgba(255,255,255,0.2)] rounded-full" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold tracking-widest text-[#e2e8f0]" style={{ textShadow: `0 0 10px ${data.color}80` }}>
                            {data.title}
                        </h3>
                        <p className="text-xs text-[#64748b] tracking-wider uppercase mt-1">
                            {data.subtitle}
                        </p>
                    </div>
                </div>

                {/* LED Status Light */}
                <div className="absolute top-6 right-6 flex items-center gap-2 z-10">
                    <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="w-3 h-3 rounded-full"
                        style={{
                            backgroundColor: data.color,
                            boxShadow: `0 0 10px ${data.color}, inset 0 1px 2px rgba(255,255,255,0.8)`,
                        }}
                    />
                </div>

                {/* Body Content */}
                <div className="flex-1 flex flex-col gap-4 mt-4 relative z-10">
                    {data.features.map((feat: string, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                            <div
                                className="w-1.5 h-1.5 rounded-sm"
                                style={{ backgroundColor: data.color, boxShadow: `0 0 5px ${data.color}` }}
                            />
                            <span className="text-sm font-medium text-[#caced4]">{feat}</span>
                        </div>
                    ))}
                </div>

                {/* Bottom Decorative Element */}
                <div className="h-12 mt-auto flex items-center justify-between px-2 opacity-50 relative z-10">
                    <div className="flex gap-1">
                        {[1, 2, 3].map((_, i) => (
                            <div key={i} className="w-2 h-2 rounded-full bg-[#334155] shadow-[inset_0_1px_1px_rgba(0,0,0,1)]" />
                        ))}
                    </div>
                    <span className="text-[10px] text-[#475569] font-bold">SYS_OK</span>
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
