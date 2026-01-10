// Content Extraction Worker
// This worker handles content extraction tasks

self.onmessage = (event: MessageEvent) => {
  const { type, data } = event.data;

  switch (type) {
    case 'EXTRACT_CONTENT':
      // Extract content and send back results
      self.postMessage({ type: 'CONTENT_EXTRACTED', result: data });
      break;
    default:
      self.postMessage({ type: 'ERROR', error: 'Unknown message type' });
  }
};

export {};
