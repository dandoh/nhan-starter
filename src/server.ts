import handler from '@tanstack/react-start/server-entry'


import './instrumentation'


export default {
  fetch(request: Request) {
    return handler.fetch(request)
  },
}

