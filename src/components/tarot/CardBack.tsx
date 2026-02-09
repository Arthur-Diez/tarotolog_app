import { backUrl } from "@/lib/cardAsset";

interface CardBackProps {
  size?: number;
  className?: string;
}

export default function CardBack({ size = 96, className = "" }: CardBackProps) {
  const src = backUrl("rws");
  return (
    <img
      src={src}
      alt=""
      className={`rounded-xl shadow-[0_16px_30px_rgba(0,0,0,0.45)] ${className}`}
      style={{ width: `${size}px`, height: `${size * 1.5}px` }}
      draggable={false}
    />
  );
}
