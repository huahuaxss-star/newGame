#!/usr/bin/env python3
# 本地开发服务器：禁用缓存，确保每次刷新都拿到最新文件（不用再硬刷新）
import http.server, socketserver

PORT = 8123

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('', PORT), NoCache) as httpd:
    print(f'serving (no-cache) on http://localhost:{PORT}')
    httpd.serve_forever()
