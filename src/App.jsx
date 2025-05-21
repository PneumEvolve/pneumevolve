export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-extrabold mb-4">
          This is Shea.
        </h1>
        <p className="text-lg mb-6">
          Builder of tools. Dreamer of systems. Co-creator of New Earth.
        </p>
        <div className="space-y-2">
          <a
            href="https://pneumevolve.github.io/dreamfire-gate"
            className="block bg-white rounded-xl shadow-md hover:shadow-lg transition p-4 border border-gray-200"
          >
            🌀 Dreamfire Gate
          </a>
          <a
            href="https://sheas-app.netlify.app/"
            className="block bg-white rounded-xl shadow-md hover:shadow-lg transition p-4 border border-gray-200"
          >
            🛠 Shea Klipper (Life Tools)
          </a>
          <a
            href="https://pneumevolve.github.io/we-are/we-are-landing-page.html"
            className="block bg-white rounded-xl shadow-md hover:shadow-lg transition p-4 border border-gray-200"
          >
            🌍 We Are (Community Platform)
          </a>
          <a
            href="#"
            className="block bg-white rounded-xl shadow-md hover:shadow-lg transition p-4 border border-gray-200"
          >
            🛹 Freeskate Project
          </a>
        </div>
      </div>
    </div>
  );
}