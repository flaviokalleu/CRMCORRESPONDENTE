import { ClipboardList } from 'lucide-react';

export function FormIntro({ title, description }) {
  return (
    <header className="crm-form-intro">
      <span className="crm-form-intro-icon" aria-hidden="true"><ClipboardList size={22} /></span>
      <div><h2>{title}</h2><p>{description}</p></div>
    </header>
  );
}
