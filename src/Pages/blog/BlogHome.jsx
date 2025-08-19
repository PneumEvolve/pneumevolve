import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";


export default function BlogHome() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPosts = async (signal) => {
  try {
    setError("");
    setLoading(true);

    // validateStatus lets us inspect 401/307 instead of throwing
    const res = await api.get("/blog", {
      signal,
      validateStatus: () => true,
    });

    console.log("[GET /blog]", res.status, res.data);

    if (res.status === 200) {
      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.items ?? res.data?.entries ?? [];
      setPosts(data);
      return;
    }

    if (res.status === 307) {
      // FastAPI may redirect /blog -> /blog/; try the slash variant
      const r2 = await api.get("/blog/", { signal, validateStatus: () => true });
      if (r2.status === 200) {
        setPosts(Array.isArray(r2.data) ? r2.data : r2.data?.items ?? []);
        return;
      }
      setError(`Blog redirect failed: ${r2.status}`);
      setPosts([]);
      return;
    }

    if (res.status === 401) {
      setError("You need to sign in to view blog posts.");
      setShowLoginModal?.(true);
      setPosts([]);
      return;
    }

    setError(`Failed to load blog posts (status ${res.status}).`);
    setPosts([]);
  } catch (err) {
    // Robust cancel detection without importing axios
    if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
    console.error("Error fetching blog posts", err);
    setError("Failed to load blog posts.");
    setPosts([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    const controller = new AbortController();
    fetchPosts(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const toExcerpt = (htmlOrText, n = 140) => {
    const text = String(htmlOrText ?? "").replace(/<[^>]*>/g, "");
    return text.length > n ? text.slice(0, n).trimEnd() + "…" : text;
  };

  return (
    <div className="main">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Blog</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Thoughts, updates, and experiments.
        </p>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card animate-pulse space-y-3">
              <div className="h-6 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-4 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
              <div className="h-16 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div
          className="card"
          style={{
            background:
              "color-mix(in oklab, #ef4444 12%, var(--bg-elev))",
            border:
              "1px solid color-mix(in oklab, #ef4444 35%, var(--border))",
          }}
        >
          <div className="text-sm">{error}</div>
          <div className="mt-3">
            <button className="btn btn-secondary" onClick={() => fetchPosts()}>
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && posts.length === 0 && (
        <div className="card">
          <div className="text-sm" style={{ color: "var(--muted)" }}>
            No posts yet. Check back soon.
          </div>
        </div>
      )}

      {/* Posts */}
      {!loading && !error && posts.length > 0 && (
        <div className="space-y-4">
          {posts.map((post) => (
            <article key={post.id} className="card transition-transform">
              <header className="mb-1">
                <Link to={`/blog/${post.id}`} className="link-reset">
                  <h2 className="text-xl font-semibold hover:underline">
                    {post.title || "Untitled"}
                  </h2>
                </Link>
                <div
                  className="text-sm"
                  style={{ color: "var(--muted)" }}
                >
                  <time dateTime={post.created_at}>
                    {formatDate(post.created_at)}
                  </time>
                </div>
              </header>
              <p className="opacity-90">
                {toExcerpt(post.content, 180)}
              </p>
              <div className="mt-3">
                <Link to={`/blog/${post.id}`} className="link-default">
                  Read more →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}