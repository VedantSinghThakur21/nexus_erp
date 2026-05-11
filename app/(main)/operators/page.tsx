import { getOperators } from '@/app/actions/operators'
import { OperatorsClient } from './operators-client'

export const dynamic = 'force-dynamic'

export default async function OperatorsPage() {
  const initialOperators = await getOperators()
  return <OperatorsClient initialOperators={initialOperators} />
}

