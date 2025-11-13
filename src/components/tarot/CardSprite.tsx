import { motion } from "framer-motion";

import { backUrl, faceUrl } from "@/lib/cardAsset";

interface CardSpriteProps {
  name: string;
  reversed: boolean;
  isOpen: boolean;
  onClick?: () => void;
}

export function CardSprite({ name, reversed, isOpen, onClick }: CardSpriteProps) {
  const deckId = "rws";
  const backSrc = backUrl(deckId);
  const faceSrc = faceUrl(deckId, name);

  return (
    <motion.div
      className="relative h-60 w-36 cursor-pointer [transform-style:preserve-3d]"
      animate={{ rotateY: isOpen ? 180 : 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
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
          transform: `rotateY(180deg)${reversed ? " rotate(180deg)" : ""}`,
          imageRendering: "auto",
          willChange: "transform"
        }}
      />
    </motion.div>
  );
}
