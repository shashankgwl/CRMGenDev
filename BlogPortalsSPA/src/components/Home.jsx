import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DocumentCard, DocumentCardTitle, DocumentCardDetails, Image, Text } from '@fluentui/react';
import { fetchArticles } from '../services/api';

const videoCards = [
  {
    title: 'Power Platform and CRM Sessions',
    description: 'Short, practical videos on Power Platform and Dynamics CRM implementation topics.',
    image: 'https://images.unsplash.com/photo-1581092919535-7146ff1a5901?auto=format&fit=crop&w=900&q=80'
  },
  {
    title: 'Cloud and Engineering Talks',
    description: 'Azure architecture, integration patterns, and engineering playbooks in an easy-to-follow format.',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80'
  },
  {
    title: 'Leadership and Mentorship Conversations',
    description: 'Insights from leaders and mentors on growth, coaching, and career acceleration.',
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
      <section className="home-hero">
        <div className="hero-overlay">
          <Text variant="superLarge" className="hero-title">Welcome to Northstar Leadership</Text>
          <p className="hero-intro">Your one stop hub for</p>
          <ul className="hero-points">
            <li>Technical articles ranging from Power Platform, Dynamics CRM, Azure, C#, .NET</li>
            <li>Leadership coaching</li>
            <li>Mentorship (Be a mentor or get mentored)</li>
            <li>Voice of leaders (Hear from the industry leaders and community champions)</li>
          </ul>
        </div>
      </section>
    </div>
  );
};

export default Home;
