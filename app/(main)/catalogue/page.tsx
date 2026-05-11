import { searchItems } from '@/app/actions/invoices'
import { CatalogueClient } from './catalogue-client'

export const dynamic = 'force-dynamic'

export default async function CataloguePage() {
  const initialItems = await searchItems('')
  return <CatalogueClient initialItems={initialItems as any} />
}

