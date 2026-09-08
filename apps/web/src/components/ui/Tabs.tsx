import { useId, useState, type ReactNode } from 'react';

export interface TabItem { id: string; label: string; content: ReactNode }

export function Tabs({ items, initialId }: { items: TabItem[]; initialId?: string }) {
  const fallback = items[0]?.id ?? '';
  const [active, setActive] = useState(initialId ?? fallback);
  const tabsetId = useId();
  const selected = items.find((item) => item.id === active) ?? items[0];
  if (!selected) return null;
  return <div className="tabs"><div className="tab-list" role="tablist" aria-label="Sections">{items.map((item) => <button type="button" role="tab" className={`tab ${item.id === selected.id ? 'active' : ''}`} aria-selected={item.id === selected.id} aria-controls={`${tabsetId}-${item.id}`} id={`${tabsetId}-tab-${item.id}`} key={item.id} onClick={() => setActive(item.id)}>{item.label}</button>)}</div><section className="tab-panel" role="tabpanel" id={`${tabsetId}-${selected.id}`} aria-labelledby={`${tabsetId}-tab-${selected.id}`}>{selected.content}</section></div>;
}
