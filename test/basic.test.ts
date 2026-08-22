import assert from 'node:assert/strict'
import test from 'node:test'

import PixiBallJS from '../src/index.ts'

const token = process.env.TEST_PB_HEADLESS_TOKEN

test('creates a PixiBall room', {
	skip: token ? false : 'TEST_PB_HEADLESS_TOKEN is not configured',
	timeout: 30_000,
}, async () => {
	assert.ok(token)
	const HBInit = await PixiBallJS({ debug: true })

	await new Promise<void>((resolve, reject) => {
		const timeout = setTimeout(
			() => reject(new Error('Timed out waiting for the room link')),
			25_000,
		)

		const room = HBInit({
			roomName: 'PixiBall.JS',
			maxPlayers: 16,
			public: false,
			noPlayer: true,
			token,
		})

		room.setDefaultStadium('Big')
		room.setScoreLimit(5)
		room.setTimeLimit(0)
		room.onRoomLink = () => {
			clearTimeout(timeout)
			resolve()
		}
	})
})
