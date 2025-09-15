declare module 'next/dist/compiled/ws' {
  import type { EventEmitter } from 'events';
  import type { IncomingMessage } from 'http';
  import type { Socket } from 'net';

  export type RawData = string | Buffer | ArrayBuffer | Buffer[];

  export class WebSocket extends EventEmitter {
    readyState: number;
    send(data: string | Buffer | ArrayBufferView): void;
    close(code?: number, reason?: string): void;
    addEventListener?(
      event: 'message',
      listener: (event: { data: string | ArrayBuffer | Buffer }) => void,
    ): void;
    addEventListener?(event: 'close' | 'error', listener: (...args: unknown[]) => void): void;
    on(event: 'message', listener: (data: RawData) => void): this;
    on(event: 'close', listener: (...args: unknown[]) => void): this;
    on(event: 'error', listener: (...args: unknown[]) => void): this;
  }

  export class WebSocketServer extends EventEmitter {
    constructor(options?: { noServer?: boolean });
    handleUpgrade(
      request: IncomingMessage,
      socket: Socket,
      head: Buffer,
      callback: (socket: WebSocket) => void,
    ): void;
    emit(event: 'connection', socket: WebSocket, request: IncomingMessage): boolean;
    on(event: 'connection', listener: (socket: WebSocket, request: IncomingMessage) => void): this;
  }

  export const CONNECTING: number;
  export const OPEN: number;
  export const CLOSING: number;
  export const CLOSED: number;

  export { WebSocketServer as Server, WebSocket };
  export default WebSocket;
}
