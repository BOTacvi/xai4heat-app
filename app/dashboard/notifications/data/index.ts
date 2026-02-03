import type { SelectOption } from '@/components/fields/Select'

export const STATUS_OPTIONS: SelectOption[] = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Unacknowledged', value: 'unacknowledged' },
]

export const SOURCE_OPTIONS: SelectOption[] = [
  { label: 'All', value: 'all' },
  { label: 'Thermionix', value: 'THERMIONIX' },
  { label: 'SCADA', value: 'SCADA' },
  { label: 'WeatherLink', value: 'WEATHERLINK' },
]

export const SEVERITY_OPTIONS: SelectOption[] = [
  { label: 'All', value: 'all' },
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
]
