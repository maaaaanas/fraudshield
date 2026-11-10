export function onSSE(url, callback) {
  const source = new EventSource(url);

  source.onmessage = () => {
    callback();
  };

  source.onerror = (error) => {
    console.error("SSE connection error:", error);
  };

  return () => {
    source.close();
  };
}
