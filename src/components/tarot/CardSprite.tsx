import { motion } from "framer-motion";

import { backImageUrl, faceImageUrl } from "@/lib/cardAsset";

interface CardSpriteProps {
  name: string;
  reversed: boolean;
  isOpen: boolean;
  onClick?: () => void;
}

export function CardSprite({ name, reversed, isOpen, onClick }: CardSpriteProps) {
  const deckId = "rws";
  const backSrc = backImageUrl(deckId);
  const faceSrc = faceImageUrl(deckId, name);
  const faceTransform = reversed ? "rotateY(180deg) rotateX(180deg)" : "rotateY(180deg)";

  return (
    <motion.div
      className="relative h-60 w-36 cursor-pointer"
      animate={{ rotateY: isOpen ? 180 : 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
    >
      <img
        src={backSrc}
        alt="tarot back"
        className="absolute inset-0 h-full w-full rounded-xl object-cover shadow-xl shadow-black/40 [backface-visibility:hidden]"
        style={{ imageRendering: "auto", willChange: "transform" }}
      />
      <img
        src={faceSrc}
        alt={name}
        className="absolute inset-0 h-full w-full rounded-xl object-cover [backface-visibility:hidden]"
        style={{
          transform: faceTransform,
          imageRendering: "auto",
          willChange: "transform"
        }}
      />
    </motion.div>
  );
}
