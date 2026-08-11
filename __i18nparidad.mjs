import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const hojas = (o, p = '') =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? hojas(v, p + k + '.') : [p + k])
for (const ns of ['common', 'flota']) {
  const es = new Set(hojas(require(`./src/shared/i18n/locales/es-AR/${ns}.json`)))
  const en = new Set(hojas(require(`./src/shared/i18n/locales/en/${ns}.json`)))
  const soloEs = [...es].filter(k => !en.has(k))
  const soloEn = [...en].filter(k => !es.has(k))
  console.log(`${ns}: es=${es.size} en=${en.size} soloEs=${soloEs.length} soloEn=${soloEn.length}`)
  if (soloEs.length) console.log('  soloEs:', soloEs.join(', '))
  if (soloEn.length) console.log('  soloEn:', soloEn.join(', '))
}
