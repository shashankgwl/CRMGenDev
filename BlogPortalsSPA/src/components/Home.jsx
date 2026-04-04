import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PrimaryButton, DocumentCard, DocumentCardTitle, DocumentCardDetails, Image, Text } from '@fluentui/react';
import { fetchArticles } from '../services/api';

const topicCards = [
  {
    title: 'Power Platform Insights',
    description: 'Dive deep into tutorials and best practices for building powerful business solutions.',
    image: 'https://images.unsplash.com/photo-1581092919535-7146ff1a5901?auto=format&fit=crop&w=900&q=80'
  },
  {
    title: 'Azure Cloud Expertise',
    description: 'Stay updated with the latest Azure services, architecture patterns, and cloud development strategies.',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80'
  },
  {
    title: 'Engineering Practices',
    description: 'Learn practical approaches for modern software delivery, quality, and scalable systems.',
    image: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=900&q=80'
  }
];

const Home = () => {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    const loadArticles = async () => {
      try {
        const data = await fetchArticles();
        setArticles(data);
      } catch (error) {
        console.error('Error fetching articles:', error);
      }
    };
    loadArticles();
  }, []);

  const featured = articles.slice(0, 2);

  return (
    <div className="home-page">
      <section className="home-hero" id="resources">
        <div className="hero-overlay">
          <Text variant="superLarge" className="hero-title">Welcome to ArticleHub</Text>
          <Text variant="xLarge" className="hero-subtitle">
            Your source for expert technical articles on Power Platform, Azure, C#, JavaScript, and modern engineering practices
          </Text>
          <Link to="/articles" className="unstyled-link">
            <PrimaryButton text="Explore Articles" className="hero-cta" />
          </Link>
        </div>
      </section>

      <section className="home-content-wrap">
        <div className="featured-grid">
          {featured.map((article) => (
            <DocumentCard key={article.id} className="feature-card">
              {article.image && (
                <Image src={article.image} alt={article.title} width="100%" height={260} imageFit="cover" />
              )}
              <DocumentCardDetails className="feature-details">
                <DocumentCardTitle title={article.title} />
                <Text variant="medium" className="feature-description">
                  {article.content.replace(/<[^>]*>/g, '').slice(0, 140)}...
                </Text>
                <Link to={`/article/${article.id}`} className="unstyled-link">
                  <PrimaryButton text="Read More" className="section-cta" />
                </Link>
              </DocumentCardDetails>
            </DocumentCard>
          ))}
        </div>

        <div className="topic-grid">
          {topicCards.map((topic) => (
            <article key={topic.title} className="topic-card">
              <img src={topic.image} alt={topic.title} className="topic-image" />
              <h3 className="topic-title">{topic.title}</h3>
              <p className="topic-description">{topic.description}</p>
            </article>
          ))}
        </div>

        <div className="home-actions" id="contact">
          <Text variant="large" className="section-title">Latest Articles</Text>
          <Text variant="medium" className="section-subtitle">{articles.length} published stories</Text>
          <Link to="/articles" className="unstyled-link">
            <PrimaryButton text="View All Articles" className="section-cta" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
