export function makeLogger(moduleName: string) {
  return {
    info(message: string, meta?: any) {
      console.log(`[${moduleName}] INFO: ${message}`, meta || '')
    },
    warn(message: string, meta?: any) {
      console.warn(`[${moduleName}] WARN: ${message}`, meta || '')
    },
    error(message: string, meta?: any) {
      console.error(`[${moduleName}] ERROR: ${message}`, meta || '')
    }
  }
}
