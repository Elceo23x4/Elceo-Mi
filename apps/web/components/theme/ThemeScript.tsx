export function ThemeScript() {
  const script = `
    (function(){
      var persisted = localStorage.getItem('elceo-theme');
      var mode = persisted === 'light' || persisted === 'dark' ? persisted : 'dark';
      document.documentElement.setAttribute('data-theme', mode);
      document.body.setAttribute('data-theme', mode);
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
