export default function Home() {
  const products = [
    { id: 1, name: 'Classic T-Shirt', price: '$19.99' },
    { id: 2, name: 'Denim Jeans', price: '$49.99' },
    { id: 3, name: 'Leather Jacket', price: '$149.99' },
    { id: 4, name: 'Sneakers', price: '$79.99' },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 p-8 dark:bg-black">
      <h1 className="text-4xl font-bold text-center mb-10 text-zinc-900 dark:text-zinc-50">Welcome to Vergo Store</h1>
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {products.map((p) => (
          <div key={p.id} className="bg-white dark:bg-zinc-900 rounded-lg shadow p-4 flex flex-col items-center border border-zinc-100 dark:border-zinc-800">
            <img
              src={`https://via.placeholder.com/300x300?text=${encodeURIComponent(p.name)}`}
              alt={p.name}
              width={300}
              height={300}
              className="rounded"
            />
            <h2 className="mt-4 text-xl font-medium text-zinc-800 dark:text-zinc-100">{p.name}</h2>
            <p className="mt-2 text-lg font-semibold text-zinc-600 dark:text-zinc-300">{p.price}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
