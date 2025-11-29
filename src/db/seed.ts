import { db, client } from './index'
import { users } from './schema'
import { eq } from 'drizzle-orm'

const SEED_USER_EMAIL = 'demo@example.com'

async function seed() {
  console.log('🌱 Starting database seed...')

  // Create or get demo user
  let user = await db.query.users.findFirst({
    where: eq(users.email, SEED_USER_EMAIL),
  })

  // Remove user if it exists
  if (user) {
    await db.delete(users).where(eq(users.id, user.id))
  }

  const newUser = await db
    .insert(users)
    .values({
      email: SEED_USER_EMAIL,
      name: 'Demo User',
      emailVerified: true,
    })
    .$returningId()

  console.log('✅ User created:', newUser)
}

seed()
  .catch((error) => {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  })
  .finally(async () => {
    await client.end()
  })
