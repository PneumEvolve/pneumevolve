import React from "react";

export default function PrivacyPolicy() {
  return (
    <main className="prose dark:prose-invert max-w-3xl mx-auto p-6">
      <h1>Privacy Policy</h1>
      <p><strong>Effective date:</strong> {new Date().toISOString().slice(0,10)}</p>

      <p>
        PneumEvolve (“we”, “us”, “our”) respects your privacy and is committed to protecting personal 
        information in accordance with the <em>Personal Information Protection Act</em> (British Columbia) 
        and Canada’s <em>Personal Information Protection and Electronic Documents Act</em> (PIPEDA).
      </p>

      <h2>What We Collect</h2>
      <ul>
        <li>Account details (email, display name)</li>
        <li>Content you submit (problems, ideas, messages, profile)</li>
        <li>Usage and device data (IP address, app events, browser/device type)</li>
        <li>Analytics data (only with your consent)</li>
      </ul>

      <h2>How We Use It</h2>
      <ul>
        <li>Provide and improve the PneumEvolve platform and features</li>
        <li>Ensure safety, moderation, and compliance with our Terms</li>
        <li>Communicate service updates and respond to inquiries</li>
        <li>Measure and analyze usage (only with consent)</li>
      </ul>

      <h2>Disclosure</h2>
      <p>
        We do not sell your personal information. We may share it with service providers (hosting, analytics, error logging) 
        under agreements that protect your data, and if required by law or to protect our rights.
      </p>

      <h2>Storage & Transfers</h2>
      <p>
        Data may be processed in other provinces or countries. We require our providers to maintain comparable protections where feasible.
      </p>

      <h2>Retention</h2>
      <p>
        We retain personal information only as long as necessary for the purposes identified or as required by law.
      </p>

      <h2>Your Rights</h2>
      <ul>
        <li>Access and request a copy of your personal information</li>
        <li>Request corrections of inaccurate information</li>
        <li>Withdraw consent (including analytics preferences)</li>
        <li>File a complaint with the Office of the Information and Privacy Commissioner for BC</li>
      </ul>

      <h2>Children</h2>
      <p>
        Our services are intended for users aged 16+. If we learn we have collected personal information from a child under 16 
        without consent, we will delete it.
      </p>

      <h2>Updates</h2>
      <p>
        We may update this Policy from time to time. The updated version will be posted here with a revised effective date.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy Officer: <a href="mailto:privacy@pneumevolve.com">privacy@pneumevolve.com</a>
      </p>
    </main>
  );
}