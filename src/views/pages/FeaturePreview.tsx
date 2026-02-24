import RetroFeatureCards from "src/components/ui/RetroFeatureCards";

export default function FeaturePreview() {
    return (
        <div className="w-full h-screen bg-[#050510]">
            {/* 
        This acts as a full screen canvas to preview the 
        highly detailed skeuomorphic feature section 
      */}
            <RetroFeatureCards />
        </div>
    );
}
