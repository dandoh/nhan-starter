import handler from '@tanstack/react-start/server-entry'

import './instrumentation'

import { Composio } from '@composio/core';

new Composio({
  apiKey: process.env.COMPOSIO_API_KEY,
});

export default {
  fetch(request: Request) {
    return handler.fetch(request)
  },
}

