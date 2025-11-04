// import { tool } from 'ai'
// import type { User } from '@/db/schema'
// import { createColumnDef } from '../ai-tables'

// export const aiToolCreateColumnForUser = (user: User) => {
//   return tool({
//     description: 'Create a new column in a table',
//     inputSchema: createColumnDef.input,
//     execute: async (input) => {
//       return createColumnDef.handler({ data: input, context: { user } })
//     },
//   })
// }
