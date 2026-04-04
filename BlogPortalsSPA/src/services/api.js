// Mock data for development
const mockArticles = [
  {
    id: 1,
    title: 'Introduction to React',
    content: '<p>React is a JavaScript library for building user interfaces.</p>',
    author: 'John Doe',
    publishDate: '2024-04-01',
    tags: ['React', 'JavaScript'],
    categories: ['Web Development'],
    image: 'https://cdn.slidesharecdn.com/ss_thumbnails/anintroductiontoreactjs-240311040708-7e3369b0-thumbnail.jpg?width=640&height=640&fit=boundshttps://cdn.slidesharecdn.com/ss_thumbnails/introductiontoreactjs-160810010848-thumbnail.jpg?width=640&height=640&fit=boundshttps://cdn.slidesharecdn.com/ss_thumbnails/reactjs-191202093535-thumbnail.jpg?width=560&fit=boundshttps://cdn.slidesharecdn.com/ss_thumbnails/reactjs-191202093535-thumbnail.jpg?width=560&fit=bounds'
  },
  {
    id: 2,
    title: 'Power Pages Overview',
    content: '<p>Power Pages allows creating websites from Dataverse data.</p>',
    author: 'Jane Smith',
    publishDate: '2024-04-02',
    tags: ['Power Pages', 'Dataverse'],
    categories: ['Microsoft', 'Low Code'],
    image: 'https://tse4.mm.bing.net/th/id/OIP.Umo_wNpA-58zFLynz4F0yQHaEl?rs=1&pid=ImgDetMain&o=7&rm=3'
  }
];

let nextId = 3;

// Simulate API calls
export const fetchArticles = async () => {
  // In real app: return fetch('/_api/art_articles').then(res => res.json());
  return new Promise(resolve => setTimeout(() => resolve(mockArticles), 500));
};

export const fetchArticle = async (id) => {
  // In real app: return fetch(`/_api/art_articles(${id})`).then(res => res.json());
  const article = mockArticles.find(a => a.id === parseInt(id));
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (article) resolve(article);
      else reject(new Error('Article not found'));
    }, 500);
  });
};

export const createArticle = async (articleData) => {
  // In real app: POST to /_api/art_articles with auth
  const newArticle = { ...articleData, id: nextId++, author: 'Current User', publishDate: new Date().toISOString().split('T')[0] };
  mockArticles.push(newArticle);
  return new Promise(resolve => setTimeout(() => resolve(newArticle), 500));
};

export const updateArticle = async (id, articleData) => {
  // In real app: PATCH to /_api/art_articles(${id}) with auth
  const index = mockArticles.findIndex(a => a.id === parseInt(id));
  if (index !== -1) {
    mockArticles[index] = { ...mockArticles[index], ...articleData };
  }
  return new Promise(resolve => setTimeout(() => resolve(mockArticles[index]), 500));
};