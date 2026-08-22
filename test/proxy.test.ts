import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer, request as httpRequest } from 'node:http'
import { connect } from 'node:net'
import test from 'node:test'
import type WebSocket from 'ws'
import { WebSocketServer } from 'ws'

import { createHeadlessEnvironment } from '../src/runtime.ts'

test('sends master server requests through the configured proxy', async (t) => {
	let targetRequests = 0
	const targetServer = createServer((_request, response) => {
		targetRequests++
		response.writeHead(200, { 'content-type': 'application/json' })
		response.end('{"ok":true}')
	})
	targetServer.listen(0, '127.0.0.1')
	await once(targetServer, 'listening')

	let proxyRequests = 0
	const proxyServer = createServer((request, response) => {
		// Absolute form request: forward it to the target and pipe the answer back.
		proxyRequests++
		const target = new URL(request.url ?? '')
		const upstream = httpRequest(
			{
				hostname: target.hostname,
				port: target.port,
				path: `${target.pathname}${target.search}`,
				method: request.method,
				headers: { ...request.headers, host: target.host },
			},
			(upstreamResponse) => {
				response.writeHead(
					upstreamResponse.statusCode ?? 502,
					upstreamResponse.headers,
				)
				upstreamResponse.pipe(response)
			},
		)
		request.pipe(upstream)
	})
	proxyServer.on('connect', (request, clientSocket, head) => {
		// Tunneled form: open the socket the client asked for and glue both ends together.
		proxyRequests++
		const [host, port] = request.url?.split(':') ?? []
		const targetSocket = connect(Number(port), String(host), () => {
			clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
			if (head.length > 0) targetSocket.write(head)
			targetSocket.pipe(clientSocket)
			clientSocket.pipe(targetSocket)
		})
	})
	proxyServer.listen(0, '127.0.0.1')
	await once(proxyServer, 'listening')

	t.after(async () => {
		await Promise.all([
			new Promise<void>((resolve, reject) =>
				targetServer.close((error) => (error ? reject(error) : resolve())),
			),
			new Promise<void>((resolve, reject) =>
				proxyServer.close((error) => (error ? reject(error) : resolve())),
			),
		])
	})

	const targetAddress = targetServer.address()
	const proxyAddress = proxyServer.address()
	assert.ok(targetAddress && typeof targetAddress !== 'string')
	assert.ok(proxyAddress && typeof proxyAddress !== 'string')

	const environment = createHeadlessEnvironment({
		proxy: `http://127.0.0.1:${proxyAddress.port}`,
	})

	const response = await environment.fetch(
		`http://127.0.0.1:${targetAddress.port}/hosts`,
	)

	assert.equal(response.status, 200)
	assert.equal(proxyRequests, 1)
	assert.equal(targetRequests, 1)
})

test('routes WebSocket connections through the configured proxy', async (t) => {
	const targetServer = createServer()
	const webSocketServer = new WebSocketServer({ server: targetServer })
	targetServer.listen(0, '127.0.0.1')
	await once(targetServer, 'listening')

	let proxyConnections = 0
	const proxyServer = createServer()
	proxyServer.on('connect', (request, clientSocket, head) => {
		proxyConnections++
		const [host, port] = request.url?.split(':') ?? []
		assert.ok(host)
		assert.ok(port)

		const targetSocket = connect(Number(port), host, () => {
			clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
			if (head.length > 0) targetSocket.write(head)
			targetSocket.pipe(clientSocket)
			clientSocket.pipe(targetSocket)
		})
	})
	proxyServer.listen(0, '127.0.0.1')
	await once(proxyServer, 'listening')

	t.after(async () => {
		await Promise.all([
			new Promise<void>((resolve) => webSocketServer.close(() => resolve())),
			new Promise<void>((resolve, reject) =>
				targetServer.close((error) => (error ? reject(error) : resolve())),
			),
			new Promise<void>((resolve, reject) =>
				proxyServer.close((error) => (error ? reject(error) : resolve())),
			),
		])
	})

	const targetAddress = targetServer.address()
	const proxyAddress = proxyServer.address()
	assert.ok(targetAddress && typeof targetAddress !== 'string')
	assert.ok(proxyAddress && typeof proxyAddress !== 'string')

	const environment = createHeadlessEnvironment({
		proxy: `http://127.0.0.1:${proxyAddress.port}`,
	})
	const ProxiedWebSocket = environment.WebSocket as typeof WebSocket
	const socket = new ProxiedWebSocket(`ws://127.0.0.1:${targetAddress.port}`)

	await once(socket, 'open')
	assert.equal(proxyConnections, 1)

	socket.close()
	await once(socket, 'close')
})

test('connects directly when no proxy is configured', async (t) => {
	let targetRequests = 0
	const targetServer = createServer((_request, response) => {
		targetRequests++
		response.writeHead(200, { 'content-type': 'application/json' })
		response.end('{"ok":true}')
	})
	targetServer.listen(0, '127.0.0.1')
	await once(targetServer, 'listening')

	t.after(
		async () =>
			await new Promise<void>((resolve, reject) =>
				targetServer.close((error) => (error ? reject(error) : resolve())),
			),
	)

	const address = targetServer.address()
	assert.ok(address && typeof address !== 'string')

	const environment = createHeadlessEnvironment({})
	const response = await environment.fetch(`http://127.0.0.1:${address.port}/`)

	assert.equal(response.status, 200)
	assert.equal(targetRequests, 1)
})
