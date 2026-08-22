import { loadHeadless } from './generated/headless.ts'
import {
	createHeadlessEnvironment,
	InvalidRoomTokenError,
	type PixiBallJSConfig,
	type WebRTCImplementation,
} from './runtime.ts'
import type { HBInit } from './types.ts'

export * from './types.ts'
export type { PixiBallJSConfig, WebRTCImplementation }
export { InvalidRoomTokenError }

export default function PixiBallJS(
	config: PixiBallJSConfig = {},
): Promise<typeof HBInit> {
	return loadHeadless(createHeadlessEnvironment(config))
}
