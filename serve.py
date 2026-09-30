#!/usr/bin/env python3
"""Dependency-free development server for the guitar app on a local network."""

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
        raise argparse.ArgumentTypeError("Port must be a number.")
    if not 1 <= port <= 65535:
        raise argparse.ArgumentTypeError("Port must be between 1 and 65535.")
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
    parser = argparse.ArgumentParser(description="Open the guitar app on this computer and phones on the same Wi-Fi network.")
    parser.add_argument("--port", type=parse_port, default=5173, help="Server port (default: 5173)")
    options = parser.parse_args()
    root = Path(__file__).resolve().parent
    handler = partial(SimpleHTTPRequestHandler, directory=str(root))
    try:
        server = ThreadingHTTPServer(("0.0.0.0", options.port), handler)
    except OSError as error:
        print(f"Could not start the server: {error}\nTry another port: python3 serve.py --port 5174", file=sys.stderr)
        return 1

    with server:
        print(f"\nGuitar app ready.\nDesktop: http://localhost:{options.port}", flush=True)
        addresses = local_addresses()
        for address in addresses:
            print(f"Phone:    http://{address}:{options.port}", flush=True)
        if not addresses:
            print("Use this computer’s Wi-Fi IPv4 address on your phone.", flush=True)
        print("\nConnect your phone to the same Wi-Fi network. Press Ctrl+C to stop.\n", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
