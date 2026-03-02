#!/usr/bin/env python3
import os, http.server, socketserver

PORT = 3000
DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

os.chdir(DIR)
Handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving {DIR} at http://localhost:{PORT}")
    httpd.serve_forever()
