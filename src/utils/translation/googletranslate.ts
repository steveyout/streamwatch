import { TranslateService } from ".";

const SINGLE_API_URL =
  "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dj=1&ie=UTF-8&oe=UTF-8&sl=auto";
const BATCH_API_URL = "https://translate-pa.googleapis.com/v1/translateHtml";
const BATCH_API_KEY = "AIzaSyATBXajvzQLTDHEQbcpq0Ihe0vWDHmO520";

export default {
  getName() {
    return "Google Translate";
  },

  getConfig() {
    return {
      single: {
        batchSize: 250,
        batchDelayMs: 1000,
      },
      multi: {
        batchSize: 80,
        batchDelayMs: 200,
      },
      maxRetryCount: 3,
    };
  },

  async translate(str, targetLang, abortSignal) {
    if (!str) {
      return "";
    }
    str = str.replaceAll("\n", "<br />");

    const response = await (
      await fetch(
        `${SINGLE_API_URL}&tl=${targetLang}&q=${encodeURIComponent(str)}`,
        {
          method: "GET",
          signal: abortSignal,
          headers: {
            Accept: "application/json",
          },
        },
      )
    ).json();

    if (!response.sentences) {
      console.warn("Invalid gt response", response);
      throw new Error("Invalid response");
    }

    return (response.sentences as any[])
      .map((s: any) => s.trans as string)
      .join("")
      .replaceAll("<br />", "\n");
  },

  async translateMulti(batch, targetLang, abortSignal) {
    if (!batch || batch.length === 0) {
      return [];
    }
    batch = batch.map((s) => s.replaceAll("\n", "<br />"));

    const response = await (
      await fetch(BATCH_API_URL, {
        method: "POST",
        signal: abortSignal,
        headers: {
          "Content-Type": "application/json+protobuf",
          "X-goog-api-key": BATCH_API_KEY,
        },
        body: JSON.stringify([[batch, "auto", targetLang], "te"]),
      })
    ).json();

    if (!Array.isArray(response) || response.length < 1) {
      console.warn("Invalid gt batch response", response);
      throw new Error("Invalid response");
    }

    return response[0].map((s: any) =>
      (s as string).replaceAll("<br />", "\n"),
    );
  },
} satisfies TranslateService;
