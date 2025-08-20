import React from "react";

export default function Terms() {
  return (
    <main className="prose dark:prose-invert max-w-3xl mx-auto p-6">
      <h1>Terms of Use</h1>
      <p><strong>Effective date:</strong> {new Date().toISOString().slice(0,10)}</p>

      <h2>Acceptance</h2>
      <p>
        By accessing or using PneumEvolve, you agree to these Terms. If you do not agree, do not use the service.
      </p>

      <h2>User Content</h2>
      <p>
        You retain ownership of content you post. You grant PneumEvolve a worldwide, non-exclusive, royalty-free 
        license to host, display, and distribute your content solely for the purpose of operating and improving the service.
      </p>

      <h2>Acceptable Use</h2>
      <ul>
        <li>No illegal, harmful, defamatory, or harassing content</li>
        <li>No infringement of intellectual property or other rights</li>
        <li>No attempts to disrupt the service, compromise security, or access other users’ data</li>
      </ul>

      <h2>Community Guidelines</h2>
      <p>
        Users must treat each other respectfully. We may remove content or suspend accounts for violations.
      </p>

      <h2>Disclaimers</h2>
      <p>
        PneumEvolve is provided “as is” without warranties of any kind. We do not guarantee accuracy, availability, or fitness for a particular purpose.
      </p>

      <h2>Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, PneumEvolve and its operators shall not be liable for any indirect, incidental, or consequential damages.
      </p>

      <h2>Termination</h2>
      <p>
        We may suspend or terminate access immediately for violation of these Terms or applicable law.
      </p>

      <h2>Governing Law</h2>
      <p>
        These Terms are governed by the laws of British Columbia and the applicable federal laws of Canada.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these Terms periodically. Updates will be posted here with a revised effective date.
      </p>

      <h2>Contact</h2>
      <p>
        For questions, email <a href="mailto:terms@pneumevolve.com">terms@pneumevolve.com</a>.
      </p>
    </main>
  );
}