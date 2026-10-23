import { assertFails } from '@firebase/rules-unit-testing'
import { doc, getDoc } from 'firebase/firestore'
import { getTestEnv } from './setup'

test('unauthenticated read is denied', async () => {
  const env = await getTestEnv()
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'lists/x')))
})
