// import { trace } from '@opentelemetry/api'
// import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
// import type { Resource } from '@opentelemetry/resources'
// import { resourceFromAttributes } from '@opentelemetry/resources'
// import { NodeSDK } from '@opentelemetry/sdk-node'
// import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node'
// import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
// import { initAxiomAI, RedactionPolicy } from 'axiom/ai'

// const tracer = trace.getTracer('my-tracer')

// const sdk = new NodeSDK({
//   resource: resourceFromAttributes({
//     [ATTR_SERVICE_NAME]: 'my-ai-app',
//   }),
//   spanProcessor: new SimpleSpanProcessor(
//     new OTLPTraceExporter({
//       url: `https://api.axiom.co/v1/traces`,
//       headers: {
//         Authorization: `Bearer ${process.env.AXIOM_TOKEN}`,
//         'X-Axiom-Dataset': process.env.AXIOM_DATASET,
//       },
//     }),
//   ),
// })


// sdk.start()


// // On shutdown, shutdown the SDK
// process.on('SIGTERM', () => {
//   sdk.shutdown().then(() => {
//     console.log('SDK shut down')
//   })
// })

// initAxiomAI({ tracer, redactionPolicy: RedactionPolicy.AxiomDefault })

import { Laminar } from '@lmnr-ai/lmnr';

Laminar.initialize({
  projectApiKey: process.env.LMNR_API_KEY,
});
