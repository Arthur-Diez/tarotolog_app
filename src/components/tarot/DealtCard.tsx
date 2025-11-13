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
  reversed,
  className,
  onClick
}: DealtCardProps) {
  return (
    <motion.div
      onClick={onClick}
      className={`relative h-60 w-36 cursor-pointer [transform-style:preserve-3d] z-[1001] ${className || ""}`}
      animate={{ rotateY: isOpen ? 180 : 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      style={{ willChange: "transform" }}
    >
      <img
        src={backSrc}
        className="absolute inset-0 h-full w-full rounded-xl shadow-xl [backface-visibility:hidden]"
        alt=""
      />
      <img
        src={faceSrc}
        className="absolute inset-0 h-full w-full rounded-xl shadow-xl [transform:rotateY(180deg)] [backface-visibility:hidden]"
        style={reversed && isOpen ? { rotate: "180deg" } : undefined}
        alt=""
      />
    </motion.div>
  );
}
