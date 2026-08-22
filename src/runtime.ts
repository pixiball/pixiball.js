import * as WebRTCNode from '@webrtc-node/webrtc'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { ProxyAgent, fetch as undiciFetch } from 'undici'
import WebSocket from 'ws'

import type { HBInit } from './types.ts'

type Constructor = new (...args: never[]) => object

/** Deployment the headless host talks to when no other site is configured. */
export const DEFAULT_SITE: string = 'https://www.pixiball.com/'

/** Page that hands out room tokens for the default deployment. */
export const TOKEN_PAGE: string = `${DEFAULT_SITE}headlesstoken`

interface HeadlessElement {
	hidden?: boolean
	innerHTML?: string
	textContent?: string
	href?: string
	append(...nodes: unknown[]): void
	appendChild(node: unknown): unknown
}

interface HeadlessDocument {
	getElementById(id: string): HeadlessElement | null
	createElement(tagName: string): HeadlessElement
}

interface HeadlessWindow {
	HBInit?: typeof HBInit
	parent: HeadlessWindow
	onHBLoaded?: () => void
	document: HeadlessDocument
	navigator: { userAgent: string; platform: string }
	location: { href: string; origin: string; protocol: string; hostname: string }
	turnstile: { render(): never; remove(): void }
	[key: string]: unknown
}

export interface WebRTCImplementation {
	RTCPeerConnection: Constructor
	RTCIceCandidate: Constructor
	RTCSessionDescription: Constructor
}

export interface PixiBallJSConfig {
	/** HTTP proxy used for the signalling WebSocket and the master server requests. */
	proxy?: string
	/** Logs WebSocket errors and everything the headless page would print on screen. */
	debug?: boolean
	/** WebRTC implementation, `@webrtc-node/webrtc` by default. */
	webrtc?: WebRTCImplementation
	/** PixiBall deployment to host on, `https://www.pixiball.com/` by default. */
	site?: string
	/** Called when the room could not be created. Throws the error by default. */
	onError?: (error: Error) => void
}

export class InvalidRoomTokenError extends Error {
	constructor(reason?: string) {
		// The reason can come back from the headless host as the message of an error this class
		// already built, so the pointer to the token page is stripped before it is added again.
		const detail = (reason ?? 'Invalid room token')
			.replace(/\s*Generate a new token at \S+\s*$/, '')
			.replace(/[.\s]+$/, '')

		super(`${detail}. Generate a new token at ${TOKEN_PAGE}.`)
		this.name = 'InvalidRoomTokenError'
	}
}

export interface HeadlessEnvironment {
	WebSocket: Constructor
	fetch: typeof globalThis.fetch
	RTCPeerConnection: Constructor
	RTCIceCandidate: Constructor
	RTCSessionDescription: Constructor
	createWindow(resolve: (value: typeof HBInit) => void): HeadlessWindow
}

/** Turns what the headless page prints in its error box back into an error. */
export function toRoomError(message: string): Error {
	const reason = message.replace(/^Could not create the room:\s*/, '')

	if (/captcha|token/i.test(reason)) return new InvalidRoomTokenError(reason)

	return new Error(reason)
}

function createElement(): HeadlessElement {
	const element: HeadlessElement = {
		append() {},
		appendChild(node: unknown) {
			return node
		},
	}

	return element
}

interface IceServer {
	url?: string
	urls?: string | string[]
}

/**
 * Browsers still accept the long deprecated `url` key of an ICE server, Node.js WebRTC
 * implementations reject it. Rewriting it here keeps older deployments loadable.
 */
export function normalizeIceServers(configuration: unknown): unknown {
	if (typeof configuration !== 'object' || configuration === null) {
		return configuration
	}

	const { iceServers } = configuration as { iceServers?: IceServer[] }

	if (!Array.isArray(iceServers)) return configuration

	return {
		...configuration,
		iceServers: iceServers.map((server) =>
			server && server.urls === undefined && server.url !== undefined
				? { ...server, urls: server.url }
				: server,
		),
	}
}

function withNormalizedIceServers(PeerConnection: Constructor): Constructor {
	return class extends (PeerConnection as new (
		configuration?: unknown,
	) => object) {
		constructor(configuration?: unknown) {
			super(normalizeIceServers(configuration))
		}
	} as unknown as Constructor
}

export function createHeadlessEnvironment(
	config: PixiBallJSConfig,
): HeadlessEnvironment {
	const site = new URL(config.site ?? DEFAULT_SITE)
	const proxyAgent = config.proxy
		? new HttpsProxyAgent(new URL(config.proxy))
		: undefined
	const proxyDispatcher = config.proxy
		? new ProxyAgent(new URL(config.proxy).href)
		: undefined

	const onError =
		config.onError ??
		((error: Error) => {
			// Room creation is asynchronous, so there is no call to throw from: crashing the
			// process with the real error beats a room that silently never opens.
			queueMicrotask(() => {
				throw error
			})
		})

	class PixiBallWebSocket extends WebSocket {
		constructor(address: string | URL) {
			super(address, {
				agent: proxyAgent,
				headers: { origin: site.origin },
			})

			if (config.debug) {
				this.on('error', (error) => {
					console.error('[pixiball.js] WebSocket error:', error)
				})
			}
		}
	}

	const proxiedFetch: typeof globalThis.fetch = (input, init) =>
		undiciFetch(
			input as string,
			{
				...init,
				dispatcher: proxyDispatcher,
			} as Parameters<typeof undiciFetch>[1],
		) as unknown as Promise<Response>

	function createWindow(
		resolve: (value: typeof HBInit) => void,
	): HeadlessWindow {
		const roomLink = createElement()
		const captcha = createElement()
		const error = createElement()

		// The page writes the failure into #error, which is the only place the headless host
		// reports a room it could not create.
		Object.defineProperty(error, 'textContent', {
			set(message: string) {
				if (config.debug) console.error(`[pixiball.js] ${message}`)

				onError(toRoomError(message))
			},
			get() {
				return ''
			},
		})

		const headlessUrl = new URL('headless', site)

		const window = {
			set HBInit(value: typeof HBInit) {
				resolve(value)
			},

			onHBLoaded: undefined,

			document: {
				getElementById(id: string) {
					if (id === 'roomlink') return roomLink
					if (id === 'recaptcha') return captcha
					if (id === 'error') return error
					return null
				},
				createElement,
			},

			navigator: {
				// Deliberately not a browser user agent: webrtc-adapter then leaves the native
				// WebRTC implementation alone instead of patching it for a browser we are not.
				userAgent: `pixiball.js Node.js/${process.versions.node}`,
				platform: process.platform,
			},

			location: {
				href: headlessUrl.href,
				origin: site.origin,
				protocol: site.protocol,
				hostname: site.hostname,
			},

			setTimeout,
			clearTimeout,
			setInterval,
			clearInterval,
			console,
			crypto: globalThis.crypto,
			performance: globalThis.performance,
			Math,

			addEventListener() {},
			removeEventListener() {},

			// The captcha widget needs a browser: rooms are opened with a token instead.
			turnstile: {
				render(): never {
					throw new InvalidRoomTokenError('A room token is required')
				},
				remove() {},
			},
		} as unknown as HeadlessWindow

		// The page looks for its API on the parent frame, there is no frame here.
		window.parent = window

		return window
	}

	const webrtc = config.webrtc ?? WebRTCNode

	return {
		WebSocket: PixiBallWebSocket,
		fetch: proxyDispatcher ? proxiedFetch : globalThis.fetch,
		RTCPeerConnection: withNormalizedIceServers(webrtc.RTCPeerConnection),
		RTCIceCandidate: webrtc.RTCIceCandidate,
		RTCSessionDescription: webrtc.RTCSessionDescription,
		createWindow,
	}
}
