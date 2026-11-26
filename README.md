# STRIKEPOINT — Multiplayer Browser FPS

A small-room browser FPS prototype inspired by classic tactical arena shooters. Original name, map layout and simple placeholder character models; it does not use Point Blank assets.

## Fastest hosting: Render
1. Create a GitHub repository and upload the contents of this folder.
2. Sign in to Render and choose **New → Blueprint**.
3. Connect the repository. Render detects `render.yaml`; deploy the web service.
4. Open the generated `https://...onrender.com` address.
5. Share the same room code (default `MABAR01`) with friends.

Alternative: any Node 20 host that supports WebSockets and runs `npm start`. Docker is included.

## Run locally
```bash
npm install
npm start
```
Open http://localhost:3000 in multiple browser tabs/devices on the same hosted URL.

## Controls
- WASD: move
- Mouse: aim
- Left click: fire
- Shift: sprint
- Space: jump
- Esc: release mouse

## Notes
- This is a playable starter prototype, not a commercial-grade Point Blank recreation.
- Latency and frame rate depend on the hosting region, server capacity, device, browser and internet connection. No online game can guarantee zero latency or zero FPS drops.
- For a fair competitive release, upgrade to server-authoritative movement, lag compensation, robust collision/line-of-sight, anti-cheat, persistent accounts, matchmaking and load testing.
- Three.js is loaded from jsDelivr CDN; Socket.IO is served by the Node app.
