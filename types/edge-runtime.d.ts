export {};

declare global {
  interface EdgeWebSocketPair {
    0: WebSocket;
    1: WebSocket;
  }

  const WebSocketPair: {
    prototype: EdgeWebSocketPair;
    new (): EdgeWebSocketPair;
  };
}
