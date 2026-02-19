function App() {
  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold underline">
        Hello, Here's Mark's Blog!
      </h1>

      <p className="mt-4">Welcome to my personal website and portfolio.</p>

      <img
        src="/images/logo.png"
        alt="Mark's Blog Logo"
        className="mt-4 h-16 w-auto"
      />

      <p className="mt-4">
        This is a personal blog website where I share my thoughts, experiences,
        and knowledge about various topics.
      </p>

      <a
        href="https://github.com/MarkXuJQ"
        className="mt-4 inline-block text-blue-500 underline hover:text-blue-600"
      >
        My GitHub
      </a>
    </div>
  )
}

export default App
