import { motion } from "framer-motion";

import { backUrl, faceUrl } from "@/lib/cardAsset";

interface CardSpriteProps {
  name: string;
  reversed: boolean;
  back: boolean;
  onClick?: () => void;
}

export function CardSprite({ name, reversed, back, onClick }: CardSpriteProps) {
  const deckId = "rws";
  const imgSrc = back ? backUrl(deckId) : faceUrl(deckId, name);

  return (
    <motion.div
      className="relative h-52 w-32 cursor-pointer [transform-style:preserve-3d]"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
    >
      <motion.img
        src={imgSrc}
        alt={name}
        className={`absolute inset-0 h-full w-full rounded-xl object-contain shadow-xl transition-transform duration-500 ${
          !back && reversed ? "rotate-180" : ""
        }`}
        style={{ backfaceVisibility: "hidden" }}
      />
    </motion.div>
  );
}
