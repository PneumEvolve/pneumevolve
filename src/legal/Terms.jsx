import React from "react";


export default function Terms() {
return (
<main className="prose dark:prose-invert max-w-3xl mx-auto p-6">
<h1>Terms of Use</h1>
<p><strong>Effective date:</strong> {new Date().toISOString().slice(0,10)}</p>


<h2>Acceptance</h2>
<p>By accessing or using PneumEvolve, you agree to these Terms. If you do not agree, do not use the service.</p>


<h2>User Content & License</h2>
<p>You retain ownership of content you post (problems, ideas, messages). You grant PneumEvolve a worldwide, non‑exclusive, royalty‑free license to host, display, and distribute your content for the purpose of operating and improving the service.</p>


<h2>Acceptable Use</h2>
<ul>
<li>No illegal, harmful, or harassing content</li>
<li>No infringement of others’ rights</li>
<li>No attempts to disrupt the service or access others’ data</li>
</ul>

<h2>Community Guidelines</h2>
<p>Be constructive. Debate ideas, not people. We may remove content or suspend accounts for violations.</p>


<h2>Disclaimers</h2>
<p>PneumEvolve is provided “as is”. We make no warranties regarding accuracy, availability, or fitness for a particular purpose.</p>


<h2>Limitation of Liability</h2>
<p>To the maximum extent permitted by law, PneumEvolve is not liable for indirect, incidental, or consequential damages.</p>


<h2>Termination</h2>
<p>We may suspend or terminate access for any breach of these Terms.</p>


<h2>Governing Law</h2>
<p>These Terms are governed by the laws of British Columbia and applicable federal laws of Canada.</p>


<h2>Changes</h2>
<p>We may modify these Terms and will post updates here with a new effective date.</p>


<h2>Contact</h2>
<p>terms@pneumevolve.com</p>
</main>
);
}