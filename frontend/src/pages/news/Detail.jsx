import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPost } from '../../api/news';

export default function NewsDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);

  useEffect(() => {
    fetchPost(slug).then(setPost).catch(() => setPost(null));
  }, [slug]);

  if (!post) return (
    <div className="container py-4">
      <p>Đang tải bài viết...</p>
    </div>
  );

  return (
    <div className="container py-4">
      <h2 className="mb-3">{post.title}</h2>
      {post.coverImage && <img src={post.coverImage} alt={post.title} className="img-fluid mb-3" />}
      <p className="text-muted">{new Date(post.publishedAt).toLocaleString()}</p>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </div>
  );
}
