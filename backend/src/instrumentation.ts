import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { NodeSDK } from '@opentelemetry/sdk-node'
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions'

const isDisabled = process.env.OTEL_SDK_DISABLED === 'true'
const hasEndpoint = Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT)

let sdk: NodeSDK | null = null

if (!isDisabled && hasEndpoint) {
  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'aurore-api',
      [ATTR_SERVICE_VERSION]: process.env.APP_VERSION ?? process.env.IMAGE_TAG ?? 'dev',
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.NODE_ENV ?? 'development',
    }),
    traceExporter: new OTLPTraceExporter(),
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter(),
      }),
    ],
  })

  sdk.start()
}

async function shutdownTelemetry() {
  await sdk?.shutdown()
}

function shutdownTelemetryAndExit() {
  void shutdownTelemetry().finally(() => {
    process.exit(0)
  })
}

process.once('SIGTERM', shutdownTelemetryAndExit)
process.once('SIGINT', shutdownTelemetryAndExit)
