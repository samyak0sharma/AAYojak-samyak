import { ArrowUpRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Category } from '../../api/categories';
import { Card } from '../ui/Card';

export function CategoryCard({ category }: { category: Category }) {
  return <Card className="category-card"><Link to={`/events?category=${encodeURIComponent(category.slug)}`}><span className="category-symbol"><Sparkles size={20} /></span><div><h3>{category.name}</h3><p>{category._count?.events ?? 0} public events</p></div><ArrowUpRight className="category-arrow" size={18} /></Link></Card>;
}

