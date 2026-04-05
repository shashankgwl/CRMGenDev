import React from 'react';

const Contact = () => {
  return (
    <section className="content-page">
      <h1 className="page-title">Contact Us</h1>
      <p className="page-subtitle">Reach out via email or LinkedIn.</p>

      <div className="contact-links">
        <a href="mailto:shashankgwl@gmail.com" className="contact-link" aria-label="Email Shashank">
          <span className="contact-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img">
              <path fill="#EA4335" d="M12 12.7 1.6 4.9A2.9 2.9 0 0 1 4 4h16a2.9 2.9 0 0 1 2.4.9L12 12.7Z" />
              <path fill="#FBBC04" d="M22.4 4.9A2.8 2.8 0 0 1 23 6.7v10.6a2.7 2.7 0 0 1-.6 1.8l-7.5-7.4 7.5-6.8Z" />
              <path fill="#34A853" d="M14.9 11.7 22.4 19a3 3 0 0 1-2.4 1H4a3 3 0 0 1-2.4-1l7.5-7.3L12 13.7l2.9-2Z" />
              <path fill="#4285F4" d="M1.6 19A2.8 2.8 0 0 1 1 17.3V6.7c0-.7.2-1.3.6-1.8l7.5 6.8L1.6 19Z" />
            </svg>
          </span>
          <span>Gmail</span>
        </a>

        <a href="https://www.linkedin.com/in/shashank-bhide-9369b414/" target="_blank" rel="noreferrer" className="contact-link" aria-label="LinkedIn profile">
          <span className="contact-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img">
              <path fill="#0A66C2" d="M20.45 20.45h-3.56v-5.59c0-1.33-.03-3.05-1.86-3.05-1.86 0-2.14 1.45-2.14 2.95v5.69H9.33V9h3.41v1.56h.05c.47-.9 1.64-1.86 3.37-1.86 3.6 0 4.26 2.37 4.26 5.45v6.3ZM5.3 7.43a2.06 2.06 0 1 1 0-4.11 2.06 2.06 0 0 1 0 4.11ZM7.08 20.45H3.52V9h3.56v11.45Z" />
            </svg>
          </span>
          <span>LinkedIn</span>
        </a>
      </div>
    </section>
  );
};

export default Contact;
