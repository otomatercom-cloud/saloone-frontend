'use client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { BY_SLUG } from '@/lib/config';
import { RecordForm } from '@/components/RecordForm';

export default function NewPage() {
  const { slug } = useParams<{ slug: string }>();
  const cfg = BY_SLUG[slug];
  const router = useRouter();
  const sp = useSearchParams();
  if (!cfg?.create) return <p>This record is created by the workflow, not by hand.</p>;
  const defaults: Record<string, any> = { ...(cfg.createDefaults || {}) };
  sp.forEach((v, k) => { if (/^\d+$/.test(v)) defaults[k] = Number(v); });
  return (
    <div>
      <div className="page-head"><h1>New {cfg.singular.toLowerCase()}</h1></div>
      <RecordForm model={cfg.model} mode="create" sections={[{ title: 'Details', fields: cfg.create }]} defaults={defaults}
        onSaved={(id) => router.replace(`/${cfg.slug}/${id}`)} />
    </div>
  );
}
