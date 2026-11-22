export function requestedTool(text: string) {
  if (!text.trimStart().startsWith('[TOOL]')) return undefined
  const value = JSON.parse(text.trimStart().slice(6).trim())
  if (typeof value?.name !== 'string' || !value.args || typeof value.args !== 'object' || Array.isArray(value.args)) {
    throw new Error('无效的工具请求')
  }
  return value as { name: string; args: Record<string, unknown> }
}
