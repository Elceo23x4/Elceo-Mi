import { Text, typographyTokens } from '@elceo/ui';

type SectionTitleProps = {
  kicker: string;
  title: string;
  body?: string;
};

export function SectionTitle({ kicker, title, body }: SectionTitleProps) {
  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      <p className="elceo-kicker">{kicker}</p>
      <h2 style={{ margin: 0, fontSize: typographyTokens.headingL }}>{title}</h2>
      {body ? <Text tone="muted">{body}</Text> : null}
    </div>
  );
}
