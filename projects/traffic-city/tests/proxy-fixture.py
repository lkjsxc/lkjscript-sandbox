"""Test-only two-upstream routing fixture. Never part of the hosted game runtime."""
import argparse
import select
import socket
import socketserver

parser = argparse.ArgumentParser()
parser.add_argument('--host', default='127.0.0.1')
parser.add_argument('--port', type=int, default=19142)
parser.add_argument('--http', type=int, default=19140)
parser.add_argument('--session', type=int, default=19141)
args = parser.parse_args()

class Relay(socketserver.BaseRequestHandler):
    def handle(self):
        self.request.settimeout(10)
        request = b''
        while b'\r\n\r\n' not in request:
            chunk = self.request.recv(4096)
            if not chunk or len(request) > 16384:
                return
            request += chunk
        target = request.split(b' ', 2)[1].split(b'?', 1)[0]
        port = args.session if target == b'/live' else args.http
        with socket.create_connection((args.host, port), timeout=10) as upstream:
            upstream.sendall(request)  # Preserve public Host, Origin and Upgrade headers.
            self.request.settimeout(None)
            upstream.settimeout(None)
            peers = [self.request, upstream]
            while True:
                ready, _, _ = select.select(peers, [], [], 90)
                if not ready:
                    return
                for source in ready:
                    data = source.recv(65536)
                    if not data:
                        return
                    (upstream if source is self.request else self.request).sendall(data)

class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True
    def handle_error(self, request, address):
        pass  # A browser closing either half of a connection is expected here.

with Server(('127.0.0.1', args.port), Relay) as server:
    print(f'test proxy 127.0.0.1:{args.port}: /live -> {args.session}; other -> {args.http}', flush=True)
    server.serve_forever()
