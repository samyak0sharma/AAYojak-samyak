import { Link } from 'react-router-dom';
import { Container, PageMeta } from '../components/layout';
import { EmptyState } from '../components/ui';

export function NotFoundPage() { return <><PageMeta title="Page not found" description="The Aayojak page you requested could not be found." /><Container className="page-container"><EmptyState title="That page missed the beat" description="The link may be out of date, or the page may have moved." action={<Link className="button button-primary" to="/">Back home</Link>} /></Container></>; }
