import { io, Socket } from 'socket.io-client';

class SocketClient {
  private socket: Socket | null = null;

  connect() {
    const token = localStorage.getItem('clearflow_token');
    if (!token) return;

    if (this.socket) {
      if (this.socket.connected && (this.socket.auth as any)?.token === token) {
        return;
      }
      this.socket.disconnect();
    }

    this.socket = io('/', {
      auth: { token },
      path: '/socket.io',
      reconnection: true,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('[SocketClient] Connected to ClearFlow real-time server');
    });

    this.socket.on('disconnect', () => {
      console.log('[SocketClient] Disconnected from ClearFlow real-time server');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    if (!this.socket || !this.socket.connected) {
      this.connect();
    }
    return this.socket;
  }

  on(event: string, callback: (...args: any[]) => void) {
    const s = this.getSocket();
    s?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    const s = this.getSocket();
    if (callback) {
      s?.off(event, callback);
    } else {
      s?.off(event);
    }
  }
}

export const socketClient = new SocketClient();
