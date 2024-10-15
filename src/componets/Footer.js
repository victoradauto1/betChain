export default function Footer(){
    return(
        <footer className="d-flex flex-wrap justify-content-between align-align-items-center py-3 my-4 border-top"
      >
        <p className="col-4 mb-0 text-body-secondary">
          &copy; 2024 BetCandidate, Inc
        </p>
        <ul className="nav col-4 justify-content-end">
          <li className="nav-item">
            <a
              href="/"
              className="nav-link px-2 text-body-secondary text-decoration-none"
            >
              Home
            </a>
          </li>
          <li className="nav-item">
          <a
              href="/about"
              className="nav-link px-2 text-body-secondary text-decoration-none"
            >
              About
            </a>
          </li>
        </ul>
      </footer>
    )
}