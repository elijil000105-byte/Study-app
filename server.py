#!/usr/bin/env python3
"""Enkel lokal server för StudyAI.

Kör:  python server.py [port]     (standardport: 8000)
Öppnar webbläsaren automatiskt på http://localhost:<port>
"""
import http.server
import os
import socketserver
import sys
import threading
import webbrowser

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
os.chdir(os.path.dirname(os.path.abspath(__file__)))  # servera mappen där filen ligger


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")  # visa alltid senaste filerna under utveckling
        super().end_headers()


socketserver.TCPServer.allow_reuse_address = True
try:
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as server:
        url = f"http://localhost:{PORT}"
        print(f"StudyAI körs på {url}\nTryck Ctrl+C för att stoppa.")
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nServern stoppad.")
except OSError:
    sys.exit(f"Port {PORT} är upptagen. Prova en annan: python server.py 8080")
