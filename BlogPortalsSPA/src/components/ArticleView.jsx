import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PrimaryButton, DefaultButton, DocumentCard, DocumentCardTitle, DocumentCardDetails, Stack, Image, Text } from '@fluentui/react';
import { fetchArticle } from '../services/api';

const ArticleView = () => {
  const { id } = useParams();
  const [article, setArticle] = useState(null);

  useEffect(() => {
    const loadArticle = async () => {
      try {
        const data = await fetchArticle(id);
        setArticle(data);
      } catch (error) {
        console.error('Error fetching article:', error);
      }
    };
    loadArticle();
  }, [id]);

  if (!article) return <div className="loading-state">Loading article...</div>;

  return (
    <div className="article-view-page">
      <DocumentCard className="article-view-card">
        {article.image && (
          <Image src={article.image} alt={article.title} width="100%" height={340} imageFit="cover" />
        )}
        <DocumentCardDetails className="article-view-details">
          <DocumentCardTitle title={article.title} />
          <Text variant="medium" className="article-meta">
            By {article.author} on {article.publishDate}
          </Text>
          <div className="chip-row">
            {article.tags.map((tag) => (
              <span key={`view-tag-${tag}`} className="chip chip-tag">{tag}</span>
            ))}
            {article.categories.map((category) => (
              <span key={`view-cat-${category}`} className="chip chip-category">{category}</span>
            ))}
          </div>
          <div dangerouslySetInnerHTML={{ __html: article.content }} className="article-content" />
        </DocumentCardDetails>
      </DocumentCard>

      <Stack horizontal tokens={{ childrenGap: 10 }} wrap className="article-actions">
        <Link to="/" className="unstyled-link">
          <DefaultButton text="Back to List" className="ghost-action-button" />
        </Link>
        <Link to={`/edit/${article.id}`} className="unstyled-link">
          <PrimaryButton text="Edit Article" className="solid-action-button" />
        </Link>
      </Stack>
    </div>
  );
};

export default ArticleView;
