#!/usr/bin/env python3
"""Gitar uygulamasını yerel ağda sunan, bağımlılıksız geliştirme sunucusu."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import socket
import sys


def parse_port(value):
    try:
        port = int(value)
    except ValueError:
        raise argparse.ArgumentTypeError("Port bir sayı olmalıdır.")
    if not 1 <= port <= 65535:
        raise argparse.ArgumentTypeError("Port 1 ile 65535 arasında olmalıdır.")
    return port


def local_addresses():
    addresses = set()
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as connection:
            connection.connect(("8.8.8.8", 80))
            addresses.add(connection.getsockname()[0])
    except OSError:
        pass
    try:
        addresses.update(socket.gethostbyname_ex(socket.gethostname())[2])
    except OSError:
        pass
    return sorted(address for address in addresses if not address.startswith("127.") and address != "0.0.0.0")


def main():
    parser = argparse.ArgumentParser(description="Gitar uygulamasını bilgisayarda ve aynı Wi-Fi ağındaki telefonda açın.")
    parser.add_argument("--port", type=parse_port, default=5173, help="Sunucu portu (varsayılan: 5173)")
    options = parser.parse_args()
    root = Path(__file__).resolve().parent
    handler = partial(SimpleHTTPRequestHandler, directory=str(root))
    try:
        server = ThreadingHTTPServer(("0.0.0.0", options.port), handler)
    except OSError as error:
        print(f"Sunucu başlatılamadı: {error}\nBaşka bir port deneyin: python3 serve.py --port 5174", file=sys.stderr)
        return 1

    with server:
        print(f"\nGitar uygulaması hazır.\nBilgisayar: http://localhost:{options.port}", flush=True)
        addresses = local_addresses()
        for address in addresses:
            print(f"Telefon:    http://{address}:{options.port}", flush=True)
        if not addresses:
            print("Telefon için bilgisayarınızın Wi-Fi IPv4 adresini kullanın.", flush=True)
        print("\nTelefonu aynı Wi-Fi ağına bağlayın. Durdurmak için Ctrl+C.\n", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nSunucu durduruldu.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
