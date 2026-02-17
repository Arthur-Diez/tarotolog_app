import { motion } from "framer-motion";

import CardFaceImage from "@/components/tarot/CardFaceImage";

interface DealtCardProps {
  backSrc: string;
  deckId: string;
  faceName: string;
  isOpen: boolean;
  reversed?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function DealtCard({
  backSrc,
  deckId,
  faceName,
  isOpen,
  reversed = false,
  className = "",
  onClick
}: DealtCardProps) {
  const faceTransforms = ["rotateY(180deg)"];
  if (isOpen && reversed) {
    faceTransforms.push("rotateZ(180deg)");
  }

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onClick}
      className={`dealt-card relative z-[1000] h-60 w-36 cursor-pointer touch-manipulation [transform-style:preserve-3d] ${className}`}
      animate={{ rotateY: isOpen ? 180 : 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      style={{ willChange: "transform" }}
    >
      <img
        src={backSrc}
        alt=""
        className="absolute inset-0 h-full w-full rounded-xl object-cover shadow-2xl [backface-visibility:hidden]"
        draggable={false}
        style={{ willChange: "transform" }}
      />
      <CardFaceImage
        deckId={deckId}
        cardName={faceName}
        alt=""
        className="absolute inset-0 h-full w-full rounded-xl object-cover shadow-2xl [backface-visibility:hidden]"
        draggable={false}
        style={{
          transform: faceTransforms.join(" "),
          willChange: "transform"
        }}
      />
    </motion.div>
  );
}
