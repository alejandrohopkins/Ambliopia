import type { ReactNode } from 'react';

/** Etiqueta + control, con el foco visible que exige la accesibilidad. */
export function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
      <span>{etiqueta}</span>
      {children}
    </label>
  );
}

export function Error_({ children }: { children: ReactNode }) {
  return (
    <p role="alert" style={{ color: 'var(--ambar-estelar)', margin: '4px 0 12px' }}>
      {children}
    </p>
  );
}
