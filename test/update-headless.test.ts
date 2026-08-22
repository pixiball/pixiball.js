import assert from 'node:assert/strict'
import test from 'node:test'

import {
	createGeneratedModule,
	inspectHeadlessSource,
} from '../scripts/update-headless.ts'

const fixture = `/*
 PixiBall headless host
 version 1.2.3
 game 7
*/
(function () {
	window.HBInit = function () {}
	new WebSocket("wss://example.com")
	document.getElementById("roomlink")
	document.getElementById("recaptcha")
	document.getElementById("error")
})()`

test('validates and fingerprints the headless source', () => {
	const metadata = inspectHeadlessSource(fixture)

	assert.equal(metadata.version, '1.2.3')
	assert.equal(metadata.gameVersion, '7')
	assert.match(metadata.sourceHash, /^[a-f0-9]{8}$/)
	assert.equal(inspectHeadlessSource(fixture).sourceHash, metadata.sourceHash)
})

test('embeds the source without rewriting it', () => {
	const metadata = inspectHeadlessSource(fixture)
	const generated = createGeneratedModule(metadata, fixture)

	assert.ok(generated.includes(fixture))
	assert.ok(generated.includes('export function loadHeadless'))
	assert.ok(generated.includes('// PixiBall version: 1.2.3'))
	assert.ok(
		generated.includes(`// PixiBall source hash: ${metadata.sourceHash}`),
	)
})

test('rejects a source without the PixiBall header', () => {
	assert.throws(
		() =>
			inspectHeadlessSource(
				fixture.replace('PixiBall headless host', 'Something else'),
			),
		/missing its PixiBall header/,
	)
})

test('rejects changed integration points', () => {
	assert.throws(
		() =>
			inspectHeadlessSource(
				fixture.replace('new WebSocket', 'new OtherSocket'),
			),
		/WebSocket construction/,
	)

	assert.throws(
		() => inspectHeadlessSource(fixture.replace('getElementById("error")', '')),
		/error element/,
	)
})
