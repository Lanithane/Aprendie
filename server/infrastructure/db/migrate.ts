import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db, pool } from './client'

async function main() {
  console.log('[migrate] running migrations...')
  await migrate(db, { migrationsFolder: './drizzle' })
  console.log('[migrate] done')
  await pool.end()
}

main().catch((err) => {
  console.error('[migrate] failed:', err)
  process.exit(1)
})
