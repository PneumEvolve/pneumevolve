// src/components/MarkdownBoundary.jsx
import React from "react";

export default class MarkdownBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Markdown render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return <p className="text-red-600">⚠️ Error rendering markdown.</p>;
    }

    return this.props.children;
  }
}