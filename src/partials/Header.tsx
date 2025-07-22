import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Container, Nav, Navbar } from 'react-bootstrap';
import { routes, currentLang } from '../utils/routeLocalize';
import LanguageChooser from '../parts/LanguageChooser';

export default function Header() {

  // whether the navbar is expanded or not
  // (we use this to close it after a click/selection)
  const [expanded, setExpanded] = useState(false);

  //  get the current route
  const pathName = useLocation().pathname;
  const currentRoute = routes
    .slice().sort((a, b) =>
      a.langPath.length > b.langPath.length ? -1 : 1)
    .find(x => pathName.indexOf(x.langPath.split(':')[0]) === 0);
  // function that returns true if a menu item is 'active'
  const isActive = (path: string) =>
    path === currentRoute?.path || path === currentRoute?.parent;

  return <header>
    <Navbar
      expanded={expanded}
      expand="md"
      className="bg-primary"
      data-bs-theme="dark"
      fixed="top"
    >
      <Container fluid>
        <Navbar.Brand className="me-5" as={Link} to={'/' + currentLang()}>
          The Good Grocery
        </Navbar.Brand>
        <Navbar.Toggle onClick={() => setExpanded(!expanded)} />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {routes.filter(x => x.menuLabel).map(
              ({ menuLabel, langPath }, i) =>
                <Nav.Link
                  as={Link} key={i} to={langPath}
                  className={isActive(langPath + '') ? 'active' : ''}
                  /* close menu after selection*/
                  onClick={() => setTimeout(() => setExpanded(false), 200)}
                >{menuLabel}</Nav.Link>
            )}
          </Nav>
          <LanguageChooser />
        </Navbar.Collapse>
      </Container>
      <div className="cart-icon-in-menu">
        <i
          className="cart-icon bi bi-bag-heart-fill"
          onClick={() => (globalThis as any).stateSetter('showShoppingCart', true)}
        ></i>
      </div>
    </Navbar>
  </header >;
}