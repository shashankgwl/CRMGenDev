import React from 'react';

const videoItems = [
  {
    title: 'Power Platform Deep Dive',
    description: 'Step-by-step walkthroughs and implementation patterns for Power Platform projects.',
    url: 'https://www.youtube.com/results?search_query=power+platform+tutorial'
  },
  {
    title: 'Dynamics CRM Best Practices',
    description: 'Practical guidance for model-driven apps, integrations, and CRM architecture.',
    url: 'https://www.youtube.com/results?search_query=dynamics+crm+tutorial'
  },
  {
    title: 'Leadership and Mentorship Talks',
    description: 'Conversations on leadership growth, team coaching, and career mentorship.',
    url: 'https://www.youtube.com/results?search_query=leadership+mentorship+talks'
  }
];

const Videos = () => {
  return (
    <section className="content-page">
      <h1 className="page-title">Videos</h1>
      <p className="page-subtitle">Curated video resources to support learning and growth.</p>
      <div className="content-grid">
        {videoItems.map((video) => (
          <article className="content-card" key={video.title}>
            <h2>{video.title}</h2>
            <p>{video.description}</p>
            <a href={video.url} target="_blank" rel="noreferrer">Watch Collection</a>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Videos;
