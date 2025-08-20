import React from "react";


export default function PrivacyPolicy() {
return (
<main className="prose dark:prose-invert max-w-3xl mx-auto p-6">
<h1>Privacy Policy</h1>
<p><strong>Effective date:</strong> {new Date().toISOString().slice(0,10)}</p>


<p>
PneumEvolve ("we", "us", "our") is committed to protecting your privacy. This
Policy explains how we collect, use, disclose, and safeguard personal
information under Canada’s <em>Personal Information Protection and Electronic Documents Act</em> (PIPEDA)
and British Columbia’s <em>Personal Information Protection Act</em> (PIPA).
</p>

<h2>Who we are & how to contact us</h2>
<p>
<strong>Controller:</strong> PneumEvolve
<br/>
<strong>Contact:</strong> privacy@pneumevolve.com
</p>


<h2>What personal information we collect</h2>
<ul>
<li>Account details (email, display name)</li>
<li>Content you submit (problems, ideas, messages, profile)</li>
<li>Usage and device data (app events, approximate location from IP)</li>
<li>Optional analytics (only if you consent in the banner)</li>
</ul>

<h2>Why we collect it (purposes)</h2>
<ul>
<li>Provide and improve the PneumEvolve platform and features (journal, problems/ideas, garden blitzing, chat)</li>
<li>Moderate content and ensure community safety</li>
<li>Communicate service updates and respond to inquiries</li>
<li>Measure usage (analytics) <em>only with your consent</em></li>
</ul>


<h2>Legal basis & consent</h2>
<p>
We rely on your knowledge and consent for the collection, use, and disclosure of personal information except where not required by law. You may withdraw consent at any time using the cookie preferences or by contacting us.
</p>

<h2>Cookies & similar technologies</h2>
<p>
We use necessary cookies for core functionality. Analytics cookies are optional
and load only if you provide consent in our banner. You can change your choices
anytime via <a href="/cookies">Cookie Preferences</a>.
</p>


<h2>Disclosure</h2>
<p>
We may share information with service providers (hosting, analytics, error logging) under contracts that protect your information. We may disclose if required by law or to protect our rights and users.
</p>


<h2>Cross‑border transfers</h2>
<p>
Our providers may store or access data in other provinces or countries. We take reasonable safeguards and require comparable protection where feasible.
</p>

<h2>Retention</h2>
<p>
We keep personal information only as long as needed for the purposes above or as required by law, then delete or anonymize it.
</p>


<h2>Security</h2>
<p>
We use administrative, technical, and physical safeguards proportionate to the sensitivity of the data (e.g., encryption in transit, access controls, least‑privilege).
</p>


<h2>Your rights</h2>
<ul>
<li>Access: request a copy of your personal information</li>
<li>Correction: request corrections to inaccurate information</li>
<li>Withdrawal of consent: change analytics preferences or contact us</li>
<li>Complaint: contact us or the Office of the Information and Privacy Commissioner for BC</li>
</ul>

<h2>Children</h2>
<p>Our services are intended for individuals 16+ unless a parent/guardian provides consent.</p>


<h2>Updates</h2>
<p>We may update this Policy from time to time. We will post changes here and update the effective date.</p>


<h2>Contact</h2>
<p>Email: privacy@pneumevolve.com</p>
</main>
);
}