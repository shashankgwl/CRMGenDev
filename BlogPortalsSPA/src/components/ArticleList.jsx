import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PrimaryButton, DocumentCard, DocumentCardTitle, DocumentCardDetails, Image, Text } from '@fluentui/react';
import { fetchArticles } from '../services/api';

const ArticleList = () => {
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

  return (
    <div className="article-list-page">
      <section className="home-content-wrap">
        <div className="list-toolbar">
          <div>
            <Text variant="xLarge" className="section-title">Article List</Text>
            <Text variant="medium" className="section-subtitle">{articles.length} published stories</Text>
          </div>
          <Link to="/create" className="unstyled-link">
            <PrimaryButton text="Create New Article" className="section-cta" />
          </Link>
        </div>

        <div className="article-grid">
          {articles.map((article) => (
            <DocumentCard key={article.id} className="article-card">
              {article.image && (
                <Image src={article.image} alt={article.title} width="100%" height={220} imageFit="cover" />
              )}
              <DocumentCardDetails className="article-card-details">
                <DocumentCardTitle title={<Link to={`/article/${article.id}`} className="article-title-link">{article.title}</Link>} />
                <Text variant="small" className="feature-description">
                  By {article.author} on {article.publishDate}
                </Text>
                <Text variant="medium" className="feature-description">
                  {article.content.replace(/<[^>]*>/g, '').slice(0, 140)}...
                </Text>
                <div className="chip-row">
                  {article.tags.map((tag) => (
                    <span key={`${article.id}-tag-${tag}`} className="chip">{tag}</span>
                  ))}
                </div>
              </DocumentCardDetails>
            </DocumentCard>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ArticleList;
