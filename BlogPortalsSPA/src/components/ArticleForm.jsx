import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TextField, PrimaryButton, DefaultButton, Stack, Label, Pivot, PivotItem, Text } from '@fluentui/react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import { createArticle, updateArticle, fetchArticle } from '../services/api';

// Configure Quill with syntax highlighting
const modules = {
  syntax: {
    highlight: text => hljs.highlightAuto(text).value,
  },
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean']
  ],
};

const toItems = (value) => value
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

const ArticleForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', content: '', tags: '', categories: '', image: '' });
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (id) {
      const loadArticle = async () => {
        try {
          const data = await fetchArticle(id);
          setForm({
            title: data.title,
            content: data.content,
            tags: data.tags.join(', '),
            categories: data.categories.join(', '),
            image: data.image || ''
          });
        } catch (error) {
          console.error('Error fetching article:', error);
        }
      };
      loadArticle();
    }
  }, [id]);

  const handleChange = (e, newValue) => {
    setForm({ ...form, [e.target.name]: newValue || e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setForm({ ...form, image: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const articleData = {
        ...form,
        tags: toItems(form.tags),
        categories: toItems(form.categories)
      };
      if (id) {
        await updateArticle(id, articleData);
      } else {
        await createArticle(articleData);
      }
      navigate('/');
    } catch (error) {
      console.error('Error saving article:', error);
    }
  };

  return (
    <div className="article-form-page">
      <div className="hero-panel">
        <Text variant="smallPlus" className="hero-label">Editorial Workspace</Text>
        <Text variant="superLarge" className="hero-title">{id ? 'Refine your article' : 'Compose a new article'}</Text>
        <Text variant="mediumPlus" className="hero-subtitle">
          Draft, preview, and publish with clean structure.
        </Text>
      </div>

      <div className="form-panel">
      <form onSubmit={handleSubmit}>
        <Stack tokens={{ childrenGap: 15 }}>
          <div>
            <Label className="form-label">Title</Label>
            <TextField name="title" value={form.title} onChange={handleChange} required />
          </div>
          <div>
            <Label className="form-label">Tags (comma separated)</Label>
            <TextField name="tags" value={form.tags} onChange={handleChange} placeholder="Enter tags separated by commas" />
            {form.tags && (
              <div className="input-preview">
                <Label className="form-label">Preview</Label>
                <Stack horizontal tokens={{ childrenGap: 8 }} wrap className="preview-chips">
                  {toItems(form.tags).map((tag) => (
                    <span key={tag} className="chip chip-tag">
                      {tag}
                    </span>
                  ))}
                </Stack>
              </div>
            )}
          </div>
          <div>
            <Label className="form-label">Categories (comma separated)</Label>
            <TextField name="categories" value={form.categories} onChange={handleChange} placeholder="Enter categories separated by commas" />
            {form.categories && (
              <div className="input-preview">
                <Label className="form-label">Preview</Label>
                <Stack horizontal tokens={{ childrenGap: 8 }} wrap className="preview-chips">
                  {toItems(form.categories).map((category) => (
                    <span key={category} className="chip chip-category">
                      {category}
                    </span>
                  ))}
                </Stack>
              </div>
            )}
          </div>
          <div>
            <Label className="form-label">Article Image</Label>
            <TextField
              name="image"
              value={form.image}
              onChange={handleChange}
              placeholder="Paste image URL (https://...) or upload a file below"
            />
            <Label className="form-label">Or upload image file</Label>
            <input type="file" accept="image/*" onChange={handleImageChange} className="file-input" />
            {form.image && (
              <div className="input-preview">
                <Label className="form-label">Preview</Label>
                <img src={form.image} alt="Article preview" className="image-preview" />
              </div>
            )}
          </div>
          <div>
            <Label className="form-label">Content</Label>
            <Pivot selectedKey={previewMode ? 'preview' : 'edit'} onLinkClick={(item) => setPreviewMode(item.props.itemKey === 'preview')} className="content-pivot">
              <PivotItem headerText="Edit" itemKey="edit">
                <ReactQuill
                  value={form.content}
                  onChange={(value) => setForm({ ...form, content: value })}
                  modules={modules}
                  theme="snow"
                  className="editor-field"
                />
              </PivotItem>
              <PivotItem headerText="Preview" itemKey="preview">
                <div className="content-preview">
                  <div dangerouslySetInnerHTML={{ __html: form.content }} className="article-content" />
                </div>
              </PivotItem>
            </Pivot>
          </div>
          <Stack horizontal tokens={{ childrenGap: 10 }} wrap>
            <PrimaryButton type="submit" text="Save Article" className="solid-action-button" />
            <DefaultButton text="Cancel" onClick={() => navigate('/')} className="ghost-action-button" />
          </Stack>
        </Stack>
      </form>
      </div>
    </div>
  );
};

export default ArticleForm;
