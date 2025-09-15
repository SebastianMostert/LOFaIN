import type { NextApiRequest } from 'next';
import type { NextApiResponse } from 'next';
import type { Server as HttpServer } from 'http';
import type { Socket } from 'net';
import { WebSocketServer } from 'next/dist/compiled/ws';

import { DEFAULT_ROOM_ID, handlePresenceConnection } from '@/app/api/socket/presenceServer';

type NextApiResponseWithSocket = NextApiResponse & {
  socket: NextApiResponse['socket'] & {
    server: HttpServer & {
      wss?: WebSocketServer;
    };
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (req.headers.upgrade?.toLowerCase() !== 'websocket') {
    res.status(426).send('Expected WebSocket upgrade.');
    return;
  }

  const server = res.socket.server;

  if (!server.wss) {
    const wss = new WebSocketServer({ noServer: true });
    server.wss = wss;

    wss.on('connection', (websocket, request) => {
      const url = new URL(request.url ?? '', `http://${request.headers.host ?? 'localhost'}`);
      const roomId = url.searchParams.get('room') ?? DEFAULT_ROOM_ID;
      handlePresenceConnection(websocket, roomId);
    });
  }

  const wss = server.wss;

  wss.handleUpgrade(req, req.socket as Socket, Buffer.alloc(0), (websocket) => {
    wss.emit('connection', websocket, req);
  });

  res.end();
}
