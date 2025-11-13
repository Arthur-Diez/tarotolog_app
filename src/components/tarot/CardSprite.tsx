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
      <div
        className="absolute inset-0 rounded-xl bg-white shadow-xl shadow-black/30 [transform:rotateY(180deg)] [backface-visibility:hidden]"
        style={{ padding: "6px" }}
      >
        <img
          src={faceSrc}
          alt={name}
          className="h-full w-full rounded-lg object-cover"
          style={{
            imageRendering: "auto",
            willChange: "transform",
            transform: reversed ? "rotate(180deg)" : undefined
          }}
        />
      </div>
    </motion.div>
  );
}
