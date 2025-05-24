export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 text-gray-900 flex flex-col items-center justify-center px-6 py-10">
      
      <img
        src="/logo.png"
        alt="PneumEvolve Logo"
        className="w-24 h-24 mb-4" // adjust size as needed
      /><div className="max-w-3xl text-center">
        
        <h1 className="text-5xl font-bold mb-4 tracking-tight">
          PneumEvolve
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          A spiritual movement of remembrance, rooted in peace, creation, and unity. Everything we build — from tools to communities — is an extension of this sacred intention.
        </p>

        <div className="grid gap-4 w-full max-w-md mx-auto">
          <a
            href="/SmartJournal"
            className="block bg-white rounded-2xl shadow-md hover:shadow-xl transition p-5 border border-gray-200"
          >
           🧠 I Am - Journal Prototype 2.0
          </a>

          <a
            href="https://sheas-app.netlify.app/meal-planning"
            className="block bg-white rounded-2xl shadow-md hover:shadow-xl transition p-5 border border-gray-200"
          >
            🛠 Life Tools — Free Homemade Meal Planner (Under development and leaves PneumEvolve.com)
          </a>
          
          <a
            href="https://pneumevolve.github.io/dreamfire-gate"
            className="block bg-white rounded-2xl shadow-md hover:shadow-xl transition p-5 border border-gray-200"
          >
            🔥 Dreamfire Gate — Enter the Codex (Leaves PneumEvolve.com)
          </a>

          <a
            href="https://pneumevolve.github.io/we-are/we-are-landing-page.html"
            className="block bg-white rounded-2xl shadow-md hover:shadow-xl transition p-5 border border-gray-200"
          >
            🌍 We Are — A New Way to Unite (Leaves PneumEvolve.com)
          </a>

          <a
          href="/sheas-rambling-ideas"
          className="block bg-white rounded-2xl shadow-md hover:shadow-xl transition p-5 border border-gray-200"
          >
          🧠 Journal Prototype
          </a>

          <a
            href="#"
            className="block bg-white rounded-2xl shadow-md hover:shadow-xl transition p-5 border border-gray-200"
          >
            ✍️ The Message — A Letter to the People (Coming Soon)
          </a>

          <a
            href="#"
            className="block bg-white rounded-2xl shadow-md hover:shadow-xl transition p-5 border border-gray-200"
          >
            🛹 Freeskate Project — Movement Meets Freedom (Coming Soon)
          </a>
        </div>

        <p className="text-sm text-gray-500 mt-12">
          © {new Date().getFullYear()} PneumEvolve. Guided by Spirit, built with love.
        </p>
      </div>
    </div>
  );
}
