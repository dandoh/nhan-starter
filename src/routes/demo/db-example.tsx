import { createFileRoute } from '@tanstack/react-router';
import { getUsers, getPostsWithAuthors } from '@/db/queries';

export const Route = createFileRoute('/demo/db-example')({
  component: DatabaseExample,
  loader: async () => {
    // These server functions run on the server during SSR
    const [users, posts] = await Promise.all([
      getUsers(),
      getPostsWithAuthors(),
    ]);
    return { users, posts };
  },
});

function DatabaseExample() {
  const { users, posts } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-800 to-black p-8 text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Database Example</h1>
        
        <section>
          <h2 className="text-2xl font-semibold mb-4">Users</h2>
          <div className="grid gap-4">
            {users.map((user) => (
              <div key={user.id} className="bg-white/10 border border-white/20 rounded-lg p-4">
                <h3 className="font-semibold">{user.name}</h3>
                <p className="text-sm text-white/70">{user.email}</p>
                <p className="text-xs text-white/50 mt-2">
                  Joined: {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Posts</h2>
          <div className="grid gap-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-white/10 border border-white/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{post.title}</h3>
                  {post.published && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                      Published
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/80 mb-2">{post.content}</p>
                <p className="text-xs text-white/50">
                  By {post.author.name} • {new Date(post.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
