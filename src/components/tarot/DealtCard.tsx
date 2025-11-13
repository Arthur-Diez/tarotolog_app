import { motion } from "framer-motion";

interface DealtCardProps {
  backSrc: string;
  faceSrc: string;
  isOpen: boolean;
  reversed?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function DealtCard({
  backSrc,
  faceSrc,
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
      <img
        src={faceSrc}
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
