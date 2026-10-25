import { Home } from '@/components/home';
import issues from '@/content/poetry-picture.json';

export default function Page() { return <Home dailyPoems={issues.map(({ date, title, author, cover }) => ({ date, title, author, cover }))} />; }
