import assert from 'node:assert/strict'
import test from 'node:test'
import * as WebRTCNode from '@webrtc-node/webrtc'

import {
	createHeadlessEnvironment,
	InvalidRoomTokenError,
	normalizeIceServers,
	toRoomError,
} from '../src/runtime.ts'
import type { HBInit } from '../src/types.ts'

test('uses @webrtc-node/webrtc by default', () => {
	const environment = createHeadlessEnvironment({})

	assert.equal(
		Object.getPrototypeOf(environment.RTCPeerConnection),
		WebRTCNode.RTCPeerConnection,
	)
	assert.equal(environment.RTCIceCandidate, WebRTCNode.RTCIceCandidate)
	assert.equal(
		environment.RTCSessionDescription,
		WebRTCNode.RTCSessionDescription,
	)

	const PeerConnection = environment.RTCPeerConnection as unknown as new (
		configuration: unknown,
	) => { close(): void }
	new PeerConnection({ iceServers: [] }).close()
})

test('accepts the deprecated ICE server url key', () => {
	const environment = createHeadlessEnvironment({})

	assert.deepEqual(
		normalizeIceServers({
			iceServers: [
				{ url: 'stun:stun.l.google.com:19302' },
				{ urls: ['turn:example.com:3478'], username: 'user' },
			],
		}),
		{
			iceServers: [
				{
					url: 'stun:stun.l.google.com:19302',
					urls: 'stun:stun.l.google.com:19302',
				},
				{ urls: ['turn:example.com:3478'], username: 'user' },
			],
		},
	)

	const PeerConnection = environment.RTCPeerConnection as unknown as new (
		configuration: unknown,
	) => { close(): void }
	new PeerConnection({
		iceServers: [{ url: 'stun:stun.l.google.com:19302' }],
	}).close()
})

test('uses a custom WebRTC implementation', () => {
	class RTCPeerConnection {}
	class RTCIceCandidate {}
	class RTCSessionDescription {}

	const webrtc = {
		RTCPeerConnection,
		RTCIceCandidate,
		RTCSessionDescription,
	}

	const environment = createHeadlessEnvironment({ webrtc })

	assert.equal(
		Object.getPrototypeOf(environment.RTCPeerConnection),
		RTCPeerConnection,
	)
	assert.equal(environment.RTCIceCandidate, RTCIceCandidate)
	assert.equal(environment.RTCSessionDescription, RTCSessionDescription)
})

test('captures HBInit through the window shim', () => {
	const environment = createHeadlessEnvironment({})
	const expected = (() => ({})) as unknown as typeof HBInit
	let actual: unknown
	const window = environment.createWindow((HBInit) => {
		actual = HBInit
	})

	window.HBInit = expected

	assert.equal(actual, expected)
	assert.equal(window.parent, window)
	assert.equal(window.location.origin, 'https://www.pixiball.com')
	assert.ok(window.document.getElementById('roomlink'))
	assert.ok(window.document.getElementById('recaptcha'))
	assert.ok(window.document.getElementById('error'))
	assert.equal(window.document.getElementById('nothing'), null)
})

test('hosts on another PixiBall deployment', () => {
	const environment = createHeadlessEnvironment({
		site: 'https://play.example.com/',
	})
	const window = environment.createWindow(() => {})

	assert.equal(window.location.origin, 'https://play.example.com')
	assert.equal(window.location.href, 'https://play.example.com/headless')
})

test('needs a room token to open the captcha', () => {
	const environment = createHeadlessEnvironment({})
	const window = environment.createWindow(() => {})

	assert.throws(
		() => window.turnstile.render(),
		(error: unknown) => {
			assert.ok(error instanceof InvalidRoomTokenError)
			assert.match(error.message, /A room token is required/)
			assert.match(error.message, /headlesstoken/)
			return true
		},
	)
})

test('turns a refused room into an error', () => {
	const rejected = toRoomError(
		'Could not create the room: The master server refused the room: Invalid captcha',
	)

	assert.ok(rejected instanceof InvalidRoomTokenError)
	assert.match(rejected.message, /Invalid captcha/)

	const other = toRoomError('Could not create the room: Room name is too long')

	assert.equal(other.constructor, Error)
	assert.equal(other.message, 'Room name is too long')
})

test('does not repeat the token page in an already formed message', () => {
	const error = toRoomError(
		new InvalidRoomTokenError('A room token is required').message,
	)

	assert.equal(
		error.message,
		'A room token is required. Generate a new token at https://www.pixiball.com/headlesstoken.',
	)
})

test('reports room failures through the configured handler', () => {
	const errors: Error[] = []
	const environment = createHeadlessEnvironment({
		onError: (error) => errors.push(error),
	})
	const window = environment.createWindow(() => {})
	const element = window.document.getElementById('error')

	assert.ok(element)
	element.textContent = 'Could not create the room: Invalid captcha'

	assert.equal(errors.length, 1)
	assert.ok(errors[0] instanceof InvalidRoomTokenError)
})
