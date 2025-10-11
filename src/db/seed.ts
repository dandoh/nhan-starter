import { db, client } from './index'
import { users, posts } from './schema'

async function seed() {

  // Clear existing data
  await db.delete(posts)
  await db.delete(users)

  // Insert sample users
  const [user1, user2] = await db
    .insert(users)
    .values([
      {
        email: 'john@example.com',
        name: 'John Doe',
      },
      {
        email: 'jane@example.com',
        name: 'Jane Smith',
      },
    ])
    .returning()

  console.log('✅ Created users:', user1.name, user2.name)

  // Insert sample posts
  await db.insert(posts).values([
    {
      title: 'Getting Started with Drizzle ORM',
      content:
        'Drizzle ORM is a TypeScript ORM that is both powerful and easy to use...',
      published: true,
      authorId: user1.id,
    },
    {
      title: 'Building Modern Web Apps',
      content:
        'Learn how to build modern web applications with React and TypeScript...',
      published: true,
      authorId: user1.id,
    },
    {
      title: 'Draft: PostgreSQL Tips',
      content: 'Some useful PostgreSQL tips and tricks...',
      published: false,
      authorId: user2.id,
    },
  ])

  console.log('✅ Created sample posts')
  console.log('🎉 Database seeded successfully!')
}

seed()
  .catch((error) => {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  })
  .finally(async () => {
    await client.end()
  })
