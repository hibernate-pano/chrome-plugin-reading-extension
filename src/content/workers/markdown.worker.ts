// Markdown Processing Worker
// This worker handles markdown processing tasks

self.onmessage = (event: MessageEvent) => {
  const { type, data } = event.data;

  switch (type) {
    case 'PROCESS_MARKDOWN':
      // Process markdown and send back results
      self.postMessage({ type: 'MARKDOWN_PROCESSED', result: data });
      break;
    default:
      self.postMessage({ type: 'ERROR', error: 'Unknown message type' });
  }
};

export {};
