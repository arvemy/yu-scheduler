import type { GenerateScheduleWorkerMessage, TermCourseData } from "$lib/types";
import { generateScheduleFromData } from "$lib/scheduler/engine";

const cancelled = new Set<string>();
const termDataCache = new Map<string, TermCourseData>();

const postMessageToMain = (message: GenerateScheduleWorkerMessage) => {
  postMessage(message);
};

self.onmessage = (event: MessageEvent<GenerateScheduleWorkerMessage>) => {
  const message = event.data;
  if (!message || !message.type) return;

  if (message.type === "cancel") {
    cancelled.add(message.id);
    return;
  }

  if (message.type === "setTermData") {
    if (message.payload?.term) {
      termDataCache.set(message.payload.term, message.payload.data);
      // Keep the cache from growing unbounded in case terms expand in the future
      if (termDataCache.size > 4) {
        const oldestKey = termDataCache.keys().next().value as string | undefined;
        if (oldestKey) termDataCache.delete(oldestKey);
      }
    }
    return;
  }

  if (message.type !== "generate") return;

  const { id, payload } = message;
  cancelled.delete(id);

  const shouldCancel = () => cancelled.has(id);

  const termKey =
    payload.request?.term && typeof payload.request.term === "string"
      ? payload.request.term
      : "__default__";
  const termData =
    payload.data ?? termDataCache.get(termKey) ?? termDataCache.get("__default__");

  if (!termData) {
    postMessageToMain({
      id,
      type: "error",
      payload: { message: "Missing term data in scheduler worker" }
    });
    return;
  }

  if (payload.data) {
    termDataCache.set(termKey, payload.data);
  }

  try {
    const result = generateScheduleFromData(payload.request, termData, {
      onProgress: (processed, total) => {
        postMessageToMain({
          id,
          type: "progress",
          payload: { processed, total }
        });
      },
      shouldCancel
    });

    if (shouldCancel()) {
      postMessageToMain({
        id,
        type: "error",
        payload: { message: "Cancelled" }
      });
      return;
    }

    postMessageToMain({ id, type: "result", payload: result });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Failed to generate schedule";
    postMessageToMain({
      id,
      type: "error",
      payload: { message: messageText }
    });
  }
};
