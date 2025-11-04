import '@/polyfill'

import { createFileRoute } from '@tanstack/react-router'
import router from '@/orpc/router'
import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { onError } from '@orpc/server'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { experimental_SmartCoercionPlugin as SmartCoercionPlugin } from '@orpc/json-schema'
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'
import { TodoSchema } from '@/orpc/schema'
import { RPCHandler } from '@orpc/server/fetch'

const handler = new RPCHandler(router)

// const handler = new OpenAPIHandler(router, {
//   interceptors: [
//     onError((error: any) => {
//       console.error(error)
//     }),
//   ],
//   plugins: [
//     new SmartCoercionPlugin({
//       schemaConverters: [new ZodToJsonSchemaConverter()],
//     }),
//     new OpenAPIReferencePlugin({
//       schemaConverters: [new ZodToJsonSchemaConverter()],
//       specGenerateOptions: {
//         info: {
//           title: 'TanStack ORPC Playground',
//           version: '1.0.0',
//         },
//         commonSchemas: {
//           Todo: { schema: TodoSchema },
//           UndefinedError: { error: 'UndefinedError' },
//         },
//         security: [{ bearerAuth: [] }],
//         components: {
//           securitySchemes: {
//             bearerAuth: {
//               type: 'http',
//               scheme: 'bearer',
//             },
//           },
//         },
//       },
//       docsConfig: {
//         authentication: {
//           securitySchemes: {
//             bearerAuth: {
//               token: 'default-token',
//             },
//           },
//         },
//       },
//     }),
//   ],
// })

async function handle({ request }: { request: Request }) {
  const { response } = await handler.handle(request, {
    prefix: '/api/rpc',
    context: {
      headers: request.headers,
    },
  })

  return response ?? new Response('Not Found', { status: 404 })
}

export const Route = createFileRoute('/api/rpc/$')({
  server: {
    handlers: {
      HEAD: handle,
      GET: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
    },
  },
})
