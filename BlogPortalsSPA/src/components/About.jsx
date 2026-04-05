import React from 'react';

const About = () => {
  return (
    <section className="content-page">
      <h1 className="page-title">About me</h1>
      <p className="page-subtitle">
        I am Shashank Bhide, a technology leader focused on helping teams deliver practical, high-impact
        solutions across Dynamics 365, Power Platform, Azure, and modern AI-driven engineering.
      </p>

      <div className="content-grid">
        <article className="content-card">
          <h2>Current Focus</h2>
          <p>
            I work on enterprise-grade solution design, implementation, and enablement with a strong
            focus on Dynamics 365 and the Microsoft ecosystem.
          </p>
        </article>

        <article className="content-card">
          <h2>What I Share</h2>
          <p>
            I regularly publish practical content on Power Platform, Dataverse, Azure AI, Copilot Studio,
            MCP, and architecture patterns that teams can apply immediately.
          </p>
        </article>

        <article className="content-card">
          <h2>Leadership Style</h2>
          <p>
            I am passionate about leadership coaching and mentorship, helping engineers and consultants
            grow through clarity, accountability, and hands-on guidance.
          </p>
        </article>
      </div>

      <div className="content-card" style={{ marginTop: '1rem' }}>
        <h2>Highlights</h2>
        <p>
          Based in Hyderabad, India, I currently represent Kerv Digital and continue to build learning-led
          communities through articles, talks, and real-world implementation playbooks.
        </p>
        <p>
          For the latest profile updates, visit{' '}
          <a
            href="https://www.linkedin.com/in/shashank-bhide-9369b414/"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn
          </a>
          .
        </p>
      </div>
    </section>
  );
};

export default About;
