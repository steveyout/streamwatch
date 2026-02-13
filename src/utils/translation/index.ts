/* eslint-disable no-console */
import subsrt from "subsrt-ts";
import { Caption, ContentCaption } from "subsrt-ts/dist/types/handler";

import { Caption as PlayerCaption } from "@/stores/player/slices/source";

import { compressStr, decompressStr, sleep } from "./utils";

const CAPTIONS_CACHE: Map<string, ArrayBuffer> = new Map<string, ArrayBuffer>();

// single will not be used if multi-line is supported
export interface TranslateServiceConfig {
  single: {
    batchSize: number;
    batchDelayMs: number;
  };
  multi?: {
    batchSize: number;
    batchDelayMs: number;
  };
  maxRetryCount: number;
}

export interface TranslateService {
  getName(): string;
  getConfig(): TranslateServiceConfig;
  translate(
    str: string,
    targetLang: string,
    abortSignal?: AbortSignal,
  ): Promise<string>;
  translateMulti(
    batch: string[],
    targetLang: string,
    abortSignal?: AbortSignal,
  ): Promise<string[]>;
}

class Translator {
  private captions: Caption[];

  private contentCaptions: ContentCaption[] = [];

  private contentCache: Map<string, string> = new Map<string, string>();

  private targetLang: string;

  private service: TranslateService;

  private serviceCfg: TranslateServiceConfig;

  private abortSignal?: AbortSignal;

  constructor(
    srtData: string,
    targetLang: string,
    service: TranslateService,
    abortSignal?: AbortSignal,
  ) {
    this.captions = subsrt.parse(srtData);
    this.targetLang = targetLang;
    this.service = service;
    this.serviceCfg = service.getConfig();
    this.abortSignal = abortSignal;

    for (const caption of this.captions) {
      if (caption.type !== "caption") {
        continue;
      }
      // Normalize line endings
      caption.text = caption.text
        .trim()
        .replaceAll("\r\n", "\n")
        .replaceAll("\r", "\n");
      this.contentCaptions.push(caption);
    }
  }

  fillContentFromCache(content: ContentCaption): boolean {
    const text: string | undefined = this.contentCache.get(content.text);
    if (text) {
      content.text = text;
      return true;
    }
    return false;
  }

  async translateContent(content: ContentCaption): Promise<boolean> {
    let result;
    let attempts = 0;
    const errors: any[] = [];

    while (!result && attempts < this.serviceCfg.maxRetryCount) {
      try {
        result = await this.service.translate(
          content.text,
          this.targetLang,
          this.abortSignal,
        );
      } catch (err) {
        if (this.abortSignal?.aborted) {
          break;
        }
        console.warn("Translation attempt failed");
        errors.push(err);
        await sleep(500);
        attempts += 1;
      }
    }

    if (this.abortSignal?.aborted) {
      return false;
    }

    if (!result) {
      console.warn("Translation failed", errors);
      return false;
    }

    this.contentCache.set(content.text, result);
    content.text = result;
    return true;
  }

  async translateContentBatch(batch: ContentCaption[]): Promise<boolean> {
    try {
      const result = await this.service.translateMulti(
        batch.map((content) => content.text),
        this.targetLang,
        this.abortSignal,
      );

      if (result.length !== batch.length) {
        console.warn(
          "Batch translation size mismatch",
          result.length,
          batch.length,
        );
        return false;
      }

      for (let i = 0; i < batch.length; i += 1) {
        this.contentCache.set(batch[i].text, result[i]);
        batch[i].text = result[i];
      }

      return true;
    } catch (err) {
      if (this.abortSignal?.aborted) {
        return false;
      }
      console.warn("Batch translation failed", err);
      return false;
    }
  }

  takeBatch(): ContentCaption[] {
    const batch: ContentCaption[] = [];
    const batchSize = !this.serviceCfg.multi
      ? this.serviceCfg.single.batchSize
      : this.serviceCfg.multi!.batchSize;

    let count = 0;
    while (count < batchSize && this.contentCaptions.length > 0) {
      const content: ContentCaption = this.contentCaptions.shift()!;
      if (this.fillContentFromCache(content)) {
        continue;
      }
      batch.push(content);
      count += 1;
    }

    return batch;
  }

  async translate(): Promise<string | undefined> {
    const batchDelay = !this.serviceCfg.multi
      ? this.serviceCfg.single.batchDelayMs
      : this.serviceCfg.multi!.batchDelayMs;

    console.info(
      "Translating captions",
      this.service.getName(),
      this.contentCaptions.length,
      batchDelay,
    );
    console.time("translation");

    let batch: ContentCaption[] = this.takeBatch();
    while (batch.length > 0) {
      let result: boolean;
      console.info("Translating batch", batch.length, batch);

      if (!this.serviceCfg.multi) {
        result = (
          await Promise.all(
            batch.map((content) => this.translateContent(content)),
          )
        ).every((res) => res);
      } else {
        result = await this.translateContentBatch(batch);
      }

      if (this.abortSignal?.aborted) {
        return undefined;
      }

      if (!result) {
        console.error("Failed to translate batch", batch.length, batch);
        return undefined;
      }

      batch = this.takeBatch();
      await sleep(batchDelay);
    }

    if (this.abortSignal?.aborted) {
      return undefined;
    }

    console.timeEnd("translation");
    return subsrt.build(this.captions, { format: "srt" });
  }
}

export async function translate(
  caption: PlayerCaption,
  targetLang: string,
  service: TranslateService,
  abortSignal?: AbortSignal,
): Promise<string | undefined> {
  const cacheID = `${caption.id}_${targetLang}`;

  const cachedData: ArrayBuffer | undefined = CAPTIONS_CACHE.get(cacheID);
  if (cachedData) {
    return decompressStr(cachedData);
  }

  const translator = new Translator(
    caption.srtData,
    targetLang,
    service,
    abortSignal,
  );

  const result = await translator.translate();
  if (!result || abortSignal?.aborted) {
    return undefined;
  }

  CAPTIONS_CACHE.set(cacheID, await compressStr(result));
  return result;
}
