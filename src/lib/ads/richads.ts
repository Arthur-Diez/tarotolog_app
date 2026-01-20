import { initRichAds } from "@/lib/richads";

type AdResult = { ok: boolean; payload?: unknown; error?: unknown };

async function attemptShow(
  mode: "interstitial_video" | "push_style"
): Promise<AdResult> {
  try {
    const controller = await initRichAds();
    if (!controller || typeof controller.show !== "function") {
      return { ok: false, error: "show_unavailable" };
    }

    const basePayload = { mode, timestamp: Date.now() };

    const tryArgs = [
      { format: mode },
      { type: mode },
      mode === "push_style" ? { format: "push" } : { format: "interstitial" },
      mode === "push_style" ? { type: "push" } : { type: "interstitial" },
      undefined
    ];

    for (const args of tryArgs) {
      try {
        const result = args ? controller.show(args) : controller.show();
        if (result && typeof (result as Promise<unknown>).then === "function") {
          await result;
        }
        return { ok: true, payload: { ...basePayload, args } };
      } catch (error) {
        continue;
      }
    }

    return { ok: false, error: "show_failed" };
  } catch (error) {
    return { ok: false, error };
  }
}

export async function showInterstitialVideo(): Promise<AdResult> {
  return attemptShow("interstitial_video");
}

export async function showPushStyle(): Promise<AdResult> {
  return attemptShow("push_style");
}
