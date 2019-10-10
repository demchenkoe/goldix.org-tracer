
const { Tracer } = require('../lib/tracer')
const { delay } = require('./utils')

const tracer = new Tracer({
  // See schema https://github.com/jaegertracing/jaeger-client-node/blob/master/src/configuration.js#L37
  serviceName: 'simple1',
  disable: !!process.env.OPENTRACING_DISABLED,
  sampler: {
    type: 'const',
    param: 1
  },
  reporter: {
    // Provide the traces endpoint; this forces the client to connect directly to the Collector and send
    // spans over HTTP
    collectorEndpoint: 'http://localhost:14268/api/traces',
    // Provide username and password if authentication is enabled in the Collector
    username: '',
    password: '',
  },
  ui: {
    //This is public url of Jaeger UI. Used by wrapper for build full URL for span
    url: 'http://localhost:16686/'
  }
})

async function subTask(span) {
  const subTask = span.startChildSpan('Sub task')
  subTask.logEvent('start', { localeTime: new Date().toLocaleString(), someCounter: 12 })
  await delay()
  subTask.logEvent('status', { allRight: true })
  subTask.finish()
}

async function task(taskNum) {
  const span = tracer.startSpan(`task`)
  console.log(`New async task. TraceID: ${span.traceIdStr} (${span.url})`)

  span.setTag('demo', 'true')
  span.logEvent('start', { taskNum })
  await delay()
  span.logEvent('progress', { percent: 10 })

  subTask(span)

  await delay()
  span.logEvent('progress', { percent: 100 })
  taskNum%3 && span.logError(new Error('Oops'))
  span.finish()
}

for(let taskNum = 0; taskNum < 10; taskNum++) {
  task(taskNum)
}



