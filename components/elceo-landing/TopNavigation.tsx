const links = ['Home', 'Pricing', 'About', 'FAQ', 'Login'];

export function TopNavigation() {
  return (
    <header className="elceo-topnav-f2" aria-label="Primary">
      <nav>
        <ul>
          {links.map((link) => (
            <li key={link}><a href="#">{link}</a></li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
