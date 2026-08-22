[![NPM Version](https://img.shields.io/npm/v/pixiball.js.svg?style=flat-square)](https://www.npmjs.com/package/pixiball.js) [![NPM Monthly Downloads](https://img.shields.io/npm/dm/pixiball.js.svg?style=flat-square)](https://npmjs.org/package/pixiball.js)

[![License](https://img.shields.io/github/license/pixiball/pixiball.js?style=flat-square)](LICENSE) [![Last Commit](https://img.shields.io/github/last-commit/pixiball/pixiball.js?style=flat-square)](https://github.com/pixiball/pixiball.js/commits/) ![Language Most Used](https://img.shields.io/github/languages/top/pixiball/pixiball.js?style=flat-square) [![Implementations](https://img.shields.io/badge/%F0%9F%92%A1-implementations-8C8E93.svg?style=flat-square)](https://github.com/pixiball/pixiball.js/issues) ![Repository Size](https://img.shields.io/github/repo-size/pixiball/pixiball.js?style=flat-square)

[![Forks](https://img.shields.io/github/forks/pixiball/pixiball.js?style=social)](https://github.com/pixiball/pixiball.js/network/members) [![Stars](https://img.shields.io/github/stars/pixiball/pixiball.js?style=social)](https://github.com/pixiball/pixiball.js/stargazers) [![Watches](https://img.shields.io/github/watchers/pixiball/pixiball.js?style=social)](https://github.com/pixiball/pixiball.js/watchers)

<h1 id="title" align="center">pixiball.js</h1>

<h4 align="center">pixiball.js is a powerful Node.js module that allows you to easily interact with the PixiBall Headless API.</h4>

### 🔖 Table Of Contents

- 🤔 [How To Use](#how-to-use)
- 🚀 [Technologies](#technologies)
- 🌱 [Minimal Requirements](#minimal-requirements)
- 🎊 [Features](#features)
- 💡 [How To Contribute](#how-to-contribute)
- 🔏 [License](#license)

---

<h2 id="how-to-use">🤔 How To Use</h2>

#### 💻 Installing

```sh
npm install pixiball.js
```

#### CommonJS Module Usage Example

```js
const PixiBallJS = require('pixiball.js').default;
```

#### ESM Module Usage Example

```js
import PixiBallJS from 'pixiball.js';
```

#### Module Usage Example

```js
import PixiBallJS from 'pixiball.js';

PixiBallJS().then((HBInit) => {
	// Same as in the PixiBall Headless Host Documentation
	const room = HBInit({
		roomName: 'PixiBall.JS',
		maxPlayers: 16,
		public: true,
		noPlayer: true,
		token: 'YOUR_TOKEN_HERE', // Required
	});

	room.setDefaultStadium('Big');
	room.setScoreLimit(5);
	room.setTimeLimit(0);

	room.onRoomLink = function (link) {
		console.log(link);
	};

	// If there are no admins left in the room give admin to one of the remaining players.
	function updateAdmins() {
		// Get all players
		var players = room.getPlayerList();
		if (players.length == 0) return; // No players left, do nothing.
		if (players.find((player) => player.admin) != null) return; // There's an admin left so do nothing.
		room.setPlayerAdmin(players[0].id, true); // Give admin to the first non admin player in the list
	}

	room.onPlayerJoin = function (player) {
		updateAdmins();
	};

	room.onPlayerLeave = function (player) {
		updateAdmins();
	};
});
```

#### Room Token

A room needs a token, which you can get at https://www.pixiball.com/headlesstoken. Tokens expire
after a few minutes, so generate one right before starting your room. Without a valid token the
room is refused and an `InvalidRoomTokenError` is thrown:

```js
import PixiBallJS, { InvalidRoomTokenError } from 'pixiball.js';

PixiBallJS({
	onError: (error) => {
		if (error instanceof InvalidRoomTokenError) console.error('Get a new token!');
		else console.error(error);
	},
}).then((HBInit) => {...});
```

#### (Optional) Custom WebRTC Library

PixiBall.JS uses `@webrtc-node/webrtc` as the default WebRTC library. However, you can use a custom WebRTC implementation by specifying it in the PixiBallJS config using the `webrtc` option.

Example:

```js
import PixiBallJS from 'pixiball.js';
import {
	RTCPeerConnection,
	RTCIceCandidate,
	RTCSessionDescription,
} from './custom-webrtc.js';

PixiBallJS({
	webrtc: {
		RTCPeerConnection,
		RTCIceCandidate,
		RTCSessionDescription,
	},
}).then((HBInit) => {...});
```

#### (Optional) Proxy

PixiBall has a limit of rooms per IP. Therefore, you can use a proxy with adding `proxy: "http://<YOUR_PROXY_IP>"` in your PixiBallJS config. The signalling WebSocket and every request to the master server then go through it.

Example:

```js
PixiBallJS({ proxy: "http://1.1.1.1:80", }).then((HBInit) => {...});

```

#### (Optional) Self Hosted PixiBall

Rooms are opened on https://www.pixiball.com by default. Point the library at your own PixiBall
deployment with the `site` option, its master server and room links are then used instead.

```js
PixiBallJS({ site: "https://play.example.com/", }).then((HBInit) => {...});

```

---

<h2 id="technologies">🚀 Technologies</h2>

- @webrtc-node/webrtc - WebRTC implementation for Node.JS
- ws - Websocket Connection
- undici - HTTP client with proxy support
- https-proxy-agent - Websocket Proxy Support
- Node.js Web Crypto API - WebCrypto implementation

[Back To The Top](#title)

---

<h2 id="minimal-requirements">🌱 Minimal Requirements</h2>

- npm
- Node.js Version >=22.18

[Back To The Top](#title)

---

<h2 id="features">🎊 Features</h2>

- [x] Performant
- [x] Strongly Typed

[Back To The Top](#title)

---

<h2 id="how-to-contribute">💡 How To Contribute</h2>

Please check [CONTRIBUTING.md](/CONTRIBUTING.md)

<p align="center">
<i>Contributions, issues and features requests are welcome!</i><br />
<i>📮 Submit PRs to help solve issues or add features</i><br />
<i>🐛 Find and report issues</i><br />
<i>🌟 Star the project</i><br />
</p>

[Back To The Top](#title)

---

<h2 id="license">🔏 License</h2>

Copyright © This project is licensed by [MIT License](https://api.github.com/licenses/mit).

[Back To The Top](#title)
