import axios from 'axios'

export interface ApiValidationError {
  code: string | null
  messageKey: string | null
  message: string | null
  args: Record<string, unknown>
}

export interface ApiError {
  status: number
  type: string | null
  title: string
  detail: string | null
  code: string | null
  messageKey: string | null
  args: Record<string, unknown>
  traceId: string | null
  fieldErrors: Record<string, string[]> | null
  validationErrors: Record<string, ApiValidationError[]> | null
}

type TranslationFn = (key: string, options?: Record<string, unknown>) => string
type JsonRecord = Record<string, unknown>

/**
 * Parsea un error de axios al contrato vigente del frontend.
 * Soporta ProblemDetails con campos top-level y wrappers legacy que anidan extensiones.
 */
export function parseApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0
    const data = asRecord(error.response?.data)

    if (data) {
      const extensions = asRecord(data.extensions)

      return {
        status: readNumber(data.status) ?? status,
        type: readString(data.type),
        title: readString(data.title) ?? 'Error',
        detail: readString(data.detail),
        code: readString(data.code) ?? readString(extensions?.code),
        messageKey: readString(data.message_key) ?? readString(extensions?.message_key),
        args: readArgs(data.args ?? extensions?.args),
        traceId: readString(data.trace_id) ?? readString(extensions?.trace_id),
        fieldErrors: readFieldErrors(data.errors),
        validationErrors: readValidationErrors(
          data.validation_errors ?? extensions?.validation_errors,
        ),
      }
    }

    return {
      status,
      type: null,
      title: status === 0 ? 'Network Error' : 'Error',
      detail: typeof error.message === 'string' ? error.message : null,
      code: status === 0 ? 'network' : null,
      messageKey: status === 0 ? 'errors.network' : null,
      args: {},
      traceId: null,
      fieldErrors: null,
      validationErrors: null,
    }
  }

  return {
    status: 0,
    type: null,
    title: 'Error de conexion',
    detail: null,
    code: 'network',
    messageKey: 'errors.network',
    args: {},
    traceId: null,
    fieldErrors: null,
    validationErrors: null,
  }
}

export function hasApiFieldErrors(apiError: ApiError): boolean {
  return Object.keys(apiError.validationErrors ?? {}).length > 0 ||
    Object.keys(apiError.fieldErrors ?? {}).length > 0
}

export function resolveApiErrorMessage(apiError: ApiError, translate: TranslationFn): string {
  const translatedByMessageKey = translateKey(translate, apiError.messageKey, apiError.args)
  if (translatedByMessageKey) {
    return translatedByMessageKey
  }

  const translatedByCode = apiError.code
    ? translateKey(translate, `errors.${apiError.code}`, apiError.args)
    : null

  if (translatedByCode) {
    return translatedByCode
  }

  // El generico localizado por el front (errors.HTTP_4xx) va ANTES que detail/title: el contrato dice que
  // detail/title no son copy de UX. Quedan solo como ultimo recurso para status sin clave propia (y ahora
  // localizados por Accept-Language desde backend I18N-03). Ver auditoria del front.
  const translatedByStatus = translateKey(translate, resolveStatusFallbackKey(apiError.status))
  if (translatedByStatus) {
    return translatedByStatus
  }

  if (apiError.detail?.trim()) {
    return apiError.detail
  }

  if (apiError.title.trim()) {
    return apiError.title
  }

  return translate('errors.unexpected')
}

export function resolveApiFieldErrors(
  apiError: ApiError,
  translate: TranslationFn,
): Record<string, string> {
  const resolvedErrors: Record<string, string> = {}

  for (const [fieldName, errors] of Object.entries(apiError.validationErrors ?? {})) {
    const firstError = errors[0]
    if (!firstError) {
      continue
    }

    const resolvedMessage = resolveApiValidationMessage(firstError, translate)
    if (resolvedMessage) {
      resolvedErrors[normalizeFieldName(fieldName)] = resolvedMessage
    }
  }

  for (const [fieldName, messages] of Object.entries(apiError.fieldErrors ?? {})) {
    const normalizedFieldName = normalizeFieldName(fieldName)

    if (resolvedErrors[normalizedFieldName] || !messages[0]) {
      continue
    }

    resolvedErrors[normalizedFieldName] = messages[0]
  }

  return resolvedErrors
}

function resolveApiValidationMessage(
  validationError: ApiValidationError,
  translate: TranslationFn,
): string | null {
  const translatedByMessageKey = translateKey(
    translate,
    validationError.messageKey,
    validationError.args,
  )

  if (translatedByMessageKey) {
    return translatedByMessageKey
  }

  const translatedByCode = validationError.code
    ? translateKey(translate, toValidationMessageKey(validationError.code), validationError.args)
    : null

  if (translatedByCode) {
    return translatedByCode
  }

  return validationError.message?.trim() ? validationError.message : null
}

function resolveStatusFallbackKey(status: number): string {
  switch (status) {
    case 0:
      return 'errors.network'
    case 400:
      return 'errors.HTTP_400'
    case 401:
      return 'errors.HTTP_401'
    case 403:
      return 'errors.HTTP_403'
    case 404:
      return 'errors.HTTP_404'
    case 409:
      return 'errors.HTTP_409'
    case 429:
      return 'errors.HTTP_429'
    case 500:
      return 'errors.HTTP_500'
    default:
      return 'errors.unexpected'
  }
}

function toValidationMessageKey(code: string): string {
  return code.startsWith('validation.') ? code : `validation.${code}`
}

function normalizeFieldName(fieldName: string): string {
  const segments = fieldName
    .split('.')
    .map((segment) => segment.replace(/\[\d+\]/g, '').trim())
    .filter(Boolean)

  if (segments.length === 0) {
    return fieldName
  }

  return segments.reduce((normalized, segment, index) => {
    const camelSegment = toCamelSegment(segment)

    if (!camelSegment) {
      return normalized
    }

    if (index === 0) {
      return camelSegment
    }

    return normalized + camelSegment[0].toUpperCase() + camelSegment.slice(1)
  }, '')
}

function toCamelSegment(segment: string): string {
  const collapsed = segment
    .replace(/[-_\s]+([a-zA-Z0-9])/g, (_, next: string) => next.toUpperCase())

  if (!collapsed) {
    return collapsed
  }

  return collapsed[0].toLowerCase() + collapsed.slice(1)
}

function translateKey(
  translate: TranslationFn,
  key: string | null,
  options?: Record<string, unknown>,
): string | null {
  if (!key) {
    return null
  }

  const translated = translate(key, options)
  return translated !== key ? translated : null
}

function readFieldErrors(value: unknown): Record<string, string[]> | null {
  const record = asRecord(value)
  if (!record) {
    return null
  }

  const entries = Object.entries(record)
    .map(([fieldName, messages]) => {
      const normalizedMessages = Array.isArray(messages)
        ? messages.filter((message): message is string => typeof message === 'string' && message.trim().length > 0)
        : []

      return [fieldName, normalizedMessages] as const
    })
    .filter(([, messages]) => messages.length > 0)

  return entries.length > 0 ? Object.fromEntries(entries) : null
}

function readValidationErrors(value: unknown): Record<string, ApiValidationError[]> | null {
  const record = asRecord(value)
  if (!record) {
    return null
  }

  const entries = Object.entries(record)
    .map(([fieldName, rawErrors]) => {
      const validationErrors = Array.isArray(rawErrors)
        ? rawErrors
          .map(readValidationError)
          .filter((item): item is ApiValidationError => item !== null)
        : []

      return [fieldName, validationErrors] as const
    })
    .filter(([, validationErrors]) => validationErrors.length > 0)

  return entries.length > 0 ? Object.fromEntries(entries) : null
}

function readValidationError(value: unknown): ApiValidationError | null {
  const record = asRecord(value)
  if (!record) {
    return null
  }

  return {
    code: readString(record.code),
    messageKey: readString(record.message_key),
    message: readString(record.message),
    args: readArgs(record.args),
  }
}

function readArgs(value: unknown): Record<string, unknown> {
  return asRecord(value) ?? {}
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : null
}
