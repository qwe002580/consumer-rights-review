type ClipboardStrategies = {
  writeText?: (text: string) => Promise<void>;
  legacyCopy: (text: string) => boolean;
};

export async function copyTextWithFallback(
  text: string,
  strategies: ClipboardStrategies
) {
  if (strategies.writeText) {
    try {
      await strategies.writeText(text);
      return;
    } catch {
      // Permission restrictions are common in embedded mobile browsers.
    }
  }

  if (!strategies.legacyCopy(text)) {
    throw new Error("Clipboard unavailable");
  }
}
