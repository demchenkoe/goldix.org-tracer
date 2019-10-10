const debug = require('debug')('@goldix.org/tracer')
const { initTracer, opentracing, PrometheusMetricsFactory } = require('jaeger-client')
let prometheus = null
try {
  prometheus = require('prom-client');
}
catch(error) {
  debug('Prometheus is disabled. Use "npm i prom-client" command for enable prometheus.')
}

/**
 * Wrapper for  Jaeger Span.
 */

class Span {
  constructor(jaegerSpan, tracer, options) {
    this.tracer = tracer
    this.jaegerSpan = jaegerSpan
    this.options = options
  }

  startChildSpan(operationName, options) {
    return this.tracer.startSpan(operationName, {
      ...options,
      jaegerOptions: {
        ...options && options.jaegerOptions,
        childOf: this.jaegerSpan
      }
    })
  }

  async await(promise, finish = false) {
    try {
      const r = await promise
      finish && this.finish()
      return r
    } catch(error) {
      this.logError(error)
      finish && this.finish()
      return Promise.reject(error)
    }
  }

  injectHTTPHeaders (headers = {}) {
    return this.tracer.injectHTTPHeaders(this, headers)
  }

  log(...args) {
    this.jaegerSpan.log(...args)
    return this
  }

  logEvent(...args) {
    this.jaegerSpan.logEvent(...args)
    return this
  }

  logError(error) {
    this.setTag('error', true)
    this.jaegerSpan.log({ event: 'error', 'error.object': error, 'message': error.message, 'stack': error.stack })
    return this
  }

  addTags(...args) {
    this.jaegerSpan.addTags(...args)
    return this
  }
  setTag(...args) {
    this.jaegerSpan.setTag(...args)
    return this
  }

  finish(...args) {
    this.jaegerSpan.finish(...args)
  }

  toString(...args) {
    return this.jaegerSpan.context().toString(...args)
  }

  get traceIdStr() {
    return this.jaegerSpan.context().traceIdStr
  }

  get url() {
    return this.tracer.config.ui.url ? `${this.tracer.config.ui.url}/trace/${this.traceIdStr}` : ''
  }
}

/**
 * Wrapper for Jaeger Tracer.
 */

class Tracer {

  constructor(config, options) {
    this.config = config
    this.options = {
      ...options,
      logger: console,
    };
    if(prometheus) {
      this.options.metrics = new PrometheusMetricsFactory(prometheus, config.serviceName.replace(/[-\s!@#$%^&*()+]+/, '_'));
    }
    this.jaegerTracer = initTracer(this.config, this.options);
  }

  startSpan(operationName, options) {
    const jaegerSpan = this.jaegerTracer.startSpan(operationName, {
      ...options && options.jaegerOptions,
    })
    return new Span(jaegerSpan, this, options)
  }

  startSpanFromHttpHeaders(headers, operationName, options) {
    const spanContext = this.extractHTTPHeaders(headers)
    return this.startSpan(operationName, {
      ...options,
      jaegerOptions: {
        ...options && options.jaegerOptions,
        childOf: spanContext
      }
    })
  }

  extractHTTPHeaders (headers) {
    return this.jaegerTracer.extract(opentracing.FORMAT_HTTP_HEADERS, headers)
  }

  injectHTTPHeaders (span, headers = {}) {
    this.jaegerTracer.inject(span.jaegerSpan, opentracing.FORMAT_HTTP_HEADERS, headers)
    return headers
  }
}

module.exports = { Tracer, Span }
