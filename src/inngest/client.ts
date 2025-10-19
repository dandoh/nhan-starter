import { EventSchemas, Inngest } from 'inngest'
import { env } from '@/env'

/**
 * Define event schemas for type safety
 * This provides autocomplete and type checking when sending events
 */
export type Events = {
  'ai/cell.compute': {
    data: {
      cellId: string
    }
  }
}

/**
 * Inngest client for AI table cell computation
 * Configured for local development by default
 *
 * The type annotation provides type safety when sending events:
 * - inngest.send() will autocomplete event names
 * - Event data will be type-checked
 */
export const inngest = new Inngest({
  id: 'nhan-starter',
  eventKey: env.INNGEST_EVENT_KEY,
  schemas: new EventSchemas().fromRecord<Events>(),
})
