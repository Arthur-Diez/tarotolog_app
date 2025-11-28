import type { CSSProperties } from "react";

import styles from "./LoadingTarot.module.css";

interface LoadingTarotProps {
  message?: string;
  subMessage?: string;
}

export function LoadingTarot({ message, subMessage }: LoadingTarotProps) {
  const theme = window.Telegram?.WebApp?.themeParams;
  const cardColor = theme?.secondary_bg_color ?? "rgba(210, 184, 255, 0.12)";
  const glowColor = theme?.button_color ?? "#c084fc";
  const textColor = theme?.text_color ?? "#f8f5ff";

  type TarotCSSVars = CSSProperties & {
    "--card-color": string;
    "--glow-color": string;
  };

  const cardsStyle: TarotCSSVars = {
    "--card-color": cardColor,
    "--glow-color": glowColor
  };

  return (
    <div className={styles.wrapper} style={{ color: textColor }}>
      <div className={styles.cards} style={cardsStyle}>
        <span className={styles.glowOrbit} />
        <div className={`${styles.card} ${styles.cardOne}`} />
        <div className={`${styles.card} ${styles.cardTwo}`} />
        <div className={`${styles.card} ${styles.cardThree}`} />
      </div>
      <p className={styles.message}>{message ?? "Получаем интерпретацию расклада"}</p>
      <p className={styles.subMessage}>
        {subMessage ?? "Колода шепчет... ждём, пока мастер завершит чтение"}
      </p>
      <div className={styles.sparkles}>
        <span>✦</span>
        <span>✹</span>
        <span>✦</span>
      </div>
    </div>
  );
}
