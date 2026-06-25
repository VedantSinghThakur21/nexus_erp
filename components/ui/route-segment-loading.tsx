import { ListViewSkeleton } from '@/components/ui/list-view-skeleton'

/** Shared instant-feedback skeleton for route segment navigations. */
export default function RouteSegmentLoading({
  titleWidthClass = 'w-32',
  rows = 8,
}: {
  titleWidthClass?: string
  rows?: number
}) {
  return <ListViewSkeleton titleWidthClass={titleWidthClass} rows={rows} />
}
