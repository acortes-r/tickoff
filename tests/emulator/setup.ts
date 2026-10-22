import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import type { Firestore } from 'firebase/firestore'

let env: RulesTestEnvironment | undefined

export async function getTestEnv(): Promise<RulesTestEnvironment> {
  env ??= await initializeTestEnvironment({
    projectId: 'demo-tickoff',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
  return env
}

export function asUser(uid: string, name?: string): Firestore {
  if (!env) throw new Error('call getTestEnv() first')
  return env
    .authenticatedContext(uid, name ? { name } : undefined)
    .firestore() as unknown as Firestore
}
